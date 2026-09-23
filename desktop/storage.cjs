'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');
const KEYS = Object.freeze({hockey_manager_alpha02:'career', hockey_manager_previous_career:'previous-career'});
const MAX_BYTES = 96000000;
const digest = text => createHash('sha256').update(text).digest('hex');
function validatePayload(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_BYTES) throw Error('Sparfilen är för stor eller ogiltig.');
  const value = JSON.parse(text);
  if (!value || value.version !== '0.2' || !Array.isArray(value.teams) || !value.clubRosters || !Number.isInteger(value.round) || !Number.isFinite(value.money)) throw Error('Ogiltig karriär.');
  return value;
}
class CareerDiskStore {
  constructor(directory, io = fs, now = Date.now) {
    this.directory = directory; this.io = io; this.now = now; this.checkpoints = new Map();
    io.mkdirSync(directory, {recursive:true});
  }
  file(key) {
    if (!Object.hasOwn(KEYS, key)) throw Error('Okänd sparplats.');
    return path.join(this.directory, KEYS[key] + '.json');
  }
  decode(raw) {
    if (Buffer.byteLength(raw) > MAX_BYTES * 2) throw Error('Sparfilen är för stor.');
    const envelope = JSON.parse(raw);
    if (envelope.format !== 'hockey-manager-desktop' || envelope.version !== 1 || typeof envelope.payload !== 'string' || digest(envelope.payload) !== envelope.sha256) throw Error('Sparfilens kontrollsumma stämmer inte. Originalet behålls.');
    validatePayload(envelope.payload);
    return envelope;
  }
  readFile(file) {
    if(this.io.statSync(file).size > MAX_BYTES * 2) throw Error('Sparfilen är för stor.');
    return this.decode(this.io.readFileSync(file, 'utf8'));
  }
  getItem(key) {
    const file = this.file(key);
    try { return this.readFile(file).payload; }
    catch (error) { if(error.code === 'ENOENT') return null; throw error; }
  }
  atomic(file, text) {
    const temp = file + '.' + randomUUID() + '.tmp'; let fd;
    try {
      fd = this.io.openSync(temp, 'wx', 0o600); this.io.writeFileSync(fd, text, 'utf8'); this.io.fsyncSync(fd); this.io.closeSync(fd); fd = undefined;
      this.io.renameSync(temp, file);
    } finally {
      if(fd !== undefined) this.io.closeSync(fd);
      try {this.io.unlinkSync(temp);} catch(error) {if(error.code !== 'ENOENT') throw error;}
    }
  }
  setItem(key, text) {
    validatePayload(text);
    const file = this.file(key), now = this.now(); let old = null;
    try {old = this.readFile(file);} catch(error) {
      if(error.code !== 'ENOENT') {
        // Never silently destroy an unreadable original during an explicit recovery.
        const raw = this.io.readFileSync(file);
        this.atomic(path.join(this.directory, KEYS[key] + '-damaged-' + randomUUID() + '.json'), raw);
      }
    }
    if(old?.payload === text) return;
    if(old) {
      const encoded = JSON.stringify(old);
      this.atomic(path.join(this.directory, KEYS[key] + '-backup-latest.json'), encoded);
      if(!this.checkpoints.has(key) || now - this.checkpoints.get(key) >= 600000) {
        this.atomic(path.join(this.directory, KEYS[key] + '-backup-' + now + '-' + randomUUID() + '.json'), encoded);
        this.checkpoints.set(key, now);
      }
    }
    const encoded = JSON.stringify({format:'hockey-manager-desktop', version:1, savedAt:new Date(now).toISOString(), sha256:digest(text), payload:text});
    this.atomic(file, encoded);
    // Housekeeping failure must not turn a successful commit into a failed save.
    try {
      const files = this.io.readdirSync(this.directory).filter(n=>n.startsWith(KEYS[key]+'-backup-') && n !== KEYS[key]+'-backup-latest.json').sort().reverse();
      for(const name of files.slice(5)) this.io.unlinkSync(path.join(this.directory, name));
    } catch { /* Kept backups are safe to remove manually later. */ }
  }
  removeItem(key) {
    try {this.io.unlinkSync(this.file(key));} catch(error) {if(error.code !== 'ENOENT') throw error;}
  }
  listBackups() {
    return this.io.readdirSync(this.directory).filter(n=>/^(career|previous-career)-backup-[\w-]+\.json$/.test(n)).flatMap(id=>{
      try {const e=this.readFile(path.join(this.directory,id)), s=JSON.parse(e.payload); return [{id, savedAt:e.savedAt, club:s.managerClub || '', date:s.calendar?.date || '', round:s.round}];} catch {return [];}
    }).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  }
  readBackup(id) {
    if(typeof id !== 'string' || !this.listBackups().some(b=>b.id===id)) throw Error('Säkerhetskopian finns inte eller kan inte läsas.');
    return this.readFile(path.join(this.directory,id)).payload;
  }
}
module.exports = {CareerDiskStore, validatePayload};
