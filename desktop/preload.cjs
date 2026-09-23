'use strict';
const {contextBridge, ipcRenderer} = require('electron');
function call(action, ...args) {
  const result=ipcRenderer.sendSync('hm:storage', action, ...args);
  if(!result?.ok) throw Error(result?.error || 'Sparningen kunde inte nås.');
  return result.value;
}
contextBridge.exposeInMainWorld('hockeyDesktop', {
  version:call('version'),
  storage:{getItem:key=>call('get',key), setItem:(key,value)=>call('set',key,value), removeItem:key=>call('remove',key)},
  backups:()=>call('backups'), readBackup:id=>call('backup',id),
  openSaveFolder:()=>ipcRenderer.invoke('hm:open-saves'),
  onClose:callback=>ipcRenderer.on('hm:prepare-close',()=>callback()),
  closeReady:ok=>ipcRenderer.send('hm:close-ready',ok===true)
});
