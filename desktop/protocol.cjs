'use strict';
const path = require('node:path');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'};
function trustedPage(value) {
  try {const u=new URL(value);return u.protocol==='hockey:' && u.hostname==='app' && (u.pathname==='/' || u.pathname==='/index.html');} catch{return false;}
}
function resourcePath(root, value) {
  const u=new URL(value);
  if(u.protocol!=='hockey:' || u.hostname!=='app') throw Error('Blocked origin');
  const name=decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname);
  if(name.includes('\\') || name.includes('\0') || name.split('/').includes('..')) throw Error('Blocked path');
  const file=path.resolve(root,'.'+name), relative=path.relative(root,file);
  if(relative.startsWith('..') || path.isAbsolute(relative) || !MIME[path.extname(file)]) throw Error('Blocked resource');
  return {file, type:MIME[path.extname(file)]};
}
module.exports={trustedPage, resourcePath};
