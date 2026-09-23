'use strict';
const {app, BrowserWindow, Menu, protocol, ipcMain, dialog, shell} = require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {CareerDiskStore}=require('./storage.cjs');
const {trustedPage, resourcePath}=require('./protocol.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'hockey', privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
// A stable, version-independent directory. Tests use an explicit isolated directory.
app.setPath('userData', app.isPackaged ? path.join(app.getPath('appData'),'Hockey Manager') : process.env.HM_TEST_USER_DATA || path.join(app.getPath('appData'),'Hockey Manager Development'));
if(!app.requestSingleInstanceLock()) {app.quit();} else {
let window, store, closing=false, closeTimer=null;
const trusted=event=>window && event.sender===window.webContents && event.senderFrame===window.webContents.mainFrame && trustedPage(event.senderFrame.url);
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
app.whenReady().then(()=>{
  store=new CareerDiskStore(path.join(app.getPath('userData'),'saves'));
  protocol.handle('hockey',request=>{
    try {const r=resourcePath(path.join(__dirname,'game'),request.url);return new Response(fs.readFileSync(r.file),{headers:{'Content-Type':r.type,'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'"}});}
    catch{return new Response('Resursen finns inte.',{status:404});}
  });
  ipcMain.on('hm:storage',(event,action,key,value)=>{
    if(!trusted(event)){event.returnValue={ok:false,error:'Åtkomst nekad.'};return;}
    try{
      let result;
      switch(action){
        case 'version':result=app.getVersion();break;
        case 'get':result=store.getItem(key);break;
        case 'set':store.setItem(key,value);break;
        case 'remove':store.removeItem(key);break;
        case 'backups':result=store.listBackups();break;
        case 'backup':result=store.readBackup(key);break;
        default:throw Error('Okänd handling.');
      }
      event.returnValue={ok:true,value:result};
    }catch(error){event.returnValue={ok:false,error:error.message};}
  });
  ipcMain.handle('hm:open-saves',async event=>{if(!trusted(event))return 'Åtkomst nekad.';return shell.openPath(store.directory);});
  function quitDecision(message){
    if(!window || window.isDestroyed())return;
    const answer=dialog.showMessageBoxSync(window,{type:'warning',title:'Sparningen behöver din uppmärksamhet',message,buttons:['Stanna i spelet','Avsluta utan ny sparning'],defaultId:0,cancelId:0,noLink:true});
    if(answer===1){closing=true;window.close();}
  }
  ipcMain.on('hm:close-ready',(event,ok)=>{
    if(!trusted(event)||!closeTimer)return;clearTimeout(closeTimer);closeTimer=null;
    if(ok===true){closing=true;window.close();}
    else quitDecision('Karriären kunde inte sparas. Stanna för att exportera en sparfil eller försöka igen.');
  });
  window=new BrowserWindow({width:1600,height:1000,minWidth:1100,minHeight:720,backgroundColor:'#08111f',show:false,title:'Hockey Manager · Beta '+app.getVersion(),webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  // The local game's user-initiated fullscreen control needs this permission.
  // Requests from other contents/frames and every other capability stay denied.
  const allowFullscreen=(wc,permission,details)=>wc===window.webContents && permission==='fullscreen' && details?.isMainFrame===true && trustedPage(details.requestingUrl) && trustedPage(wc.getURL());
  window.webContents.session.setPermissionRequestHandler((wc,permission,callback,details)=>callback(allowFullscreen(wc,permission,details)));
  window.webContents.session.setPermissionCheckHandler((wc,permission,_origin,details)=>allowFullscreen(wc,permission,details));
  const openExternal=url=>{try{const u=new URL(url);if(u.protocol==='https:' && !u.username && !u.password)shell.openExternal(u.href);}catch{}};
  window.webContents.setWindowOpenHandler(({url})=>{openExternal(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(!trustedPage(url)){event.preventDefault();openExternal(url);}});
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  window.webContents.session.on('will-download',(_event,item)=>item.setSaveDialogOptions({title:'Spara fil från Hockey Manager'}));
  window.on('close',event=>{
    if(closing)return;
    event.preventDefault();if(closeTimer)return;
    closeTimer=setTimeout(()=>{closeTimer=null;quitDecision('Spelet svarar inte på begäran att spara. Senaste lyckade sparning finns kvar.');},15000);
    window.webContents.send('hm:prepare-close');
  });
  window.once('ready-to-show',()=>{window.show();window.maximize();});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Spel',submenu:[{label:'Spara karriär',accelerator:'CmdOrCtrl+S',click:()=>window.webContents.executeJavaScript('if(typeof save==="function")save()')},{label:'Sparfiler, spelguide och felrapport',accelerator:'F1',click:()=>window.webContents.executeJavaScript('if(typeof showSaveFiles==="function")showSaveFiles()')},{type:'separator'},{label:'Avsluta',accelerator:'Alt+F4',click:()=>window.close()}]},
    {label:'Visa',submenu:[{role:'togglefullscreen',accelerator:'F11'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]},
    {label:'Redigera',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}
  ]));
  window.loadURL('hockey://app/index.html');
}).catch(error=>{dialog.showErrorBox('Hockey Manager kunde inte starta',error.message);app.exit(1);});
app.on('window-all-closed',()=>app.quit());
}
