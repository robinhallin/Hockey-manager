const clubUI={finance:'budget',staff:'team',role:'all',manager:'profile',staffPerson:null,staffSort:'role',staffDirection:1,query:'',ledgerCategory:'all',ledgerDirection:-1,goal:'league',policy:null,job:null,drawer:null};
function clubWorkspaceSet(key,value){if(!Object.hasOwn(clubUI,key))return;if(clubUI[key]!==value)deskClearWorkspaceNotices();clubUI[key]=value;clubUI.drawer=null;render();queueInterfaceSave();}
function clubWorkspaceTabs(key,values){return `<nav class="cw-tabs" aria-label="Klubbvy">${Object.entries(values).map(([v,label])=>`<button type="button" aria-pressed="${clubUI[key]===v}" onclick="clubWorkspaceSet('${key}','${v}')">${label}</button>`).join('')}</nav>`;}
function clubWorkspaceHeader(title){return `<header class="cw-heading"><span class="desk-kicker">${trainingSafe(managerClub())} · ${seasonLabel()}</span><h1>${title}</h1></header>`;}
function clubFinanceWorkspace(){return clubDeskFinance();}
function clubStaffWorkspace(){return clubDeskStaff();}
function clubBoardWorkspace(){return clubDeskBoard();}
