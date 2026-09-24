"use strict";
// Home venue hockey configuration, checked 2026-09-24. Not concert maxima.
// Sources travel with the data; exceptional one-off layouts are not generated fixtures.
const CLUB_ARENAS=Object.fromEntries([
 ['HV71','Husqvarna Garden',7000,'https://www.hv71.se/article/6u13al0cl-3iaijd/view'],
 ['Brynäs IF','Monitor ERP Arena',8240,'https://www.brynas.se/article/h0aat8w-1ekad/view'],
 ['Djurgårdens IF','Hovet',8094,'https://foretagsservice.stockholm/hitta-plats-lokal-och-anlaggning-for-evenemang/evenemangsanlaggning/hovet'],
 ['Färjestad BK','Löfbergs Arena',8250,'https://www.lofbergsarena.se/arenan'],
 ['Frölunda HC','Scandinavium',12044,'https://www.frolundahockey.com/article/d0uatb0-24601/view'],
 ['Linköping HC','Saab Arena',7900,'https://www.lhc.eu/article/3zdat0o-30c01/view'],
 ['Luleå Hockey','Coop Norrbotten Arena',6150,'https://www.shl.se/article/7spaskj-403dd/view'],
 ['Malmö Redhawks','Malmö Arena',12600,'https://www.malmoarena.com/om-malmo-arena/fakta'],
 ['Rögle BK','Catena Arena',6310,'https://www.roglebk.se/catena-arena'],
 ['Skellefteå AIK','Skellefteå Kraft Arena',5801,'https://www.skellefteaaik.se/foreningen'],
 ['Timrå IK','SCA Arena',5727,'https://www.timraik.se/SCA-Arena'],
 ['Växjö Lakers','Vida Arena',5750,'https://www.vaxjolakers.se/artikel/4id5ains1-4af7d/'],
 ['Örebro Hockey','Behrn Arena',5500,'https://www.orebrohockey.se/english'],
 ['Björklöven','Visionite Arena',5200,'https://www.bjorkloven.com/winposarena'],
 ['AIK','Hovet',8094,'https://foretagsservice.stockholm/hitta-plats-lokal-och-anlaggning-for-evenemang/evenemangsanlaggning/hovet'],
 ['Almtuna IS','Gränby ishall',2376,'https://www.almtuna.com/arenan','Klubbens matchkapacitet. Fastighetsägaren anger 2 862 för hallen; planerad ombyggnad är inte införd.'],
 ['BIK Karlskoga','Nobelhallen',5000,'https://www.bikkarlskoga.se/valkommen-till-nobelhallen'],
 ['IK Oskarshamn','Be-Ge Hockey Center',3275,'https://oskarshamn.com/product/be-ge-hockey-center/'],
 ['Kalmar HC','Hatstore Arena',2650,'https://www.kalmarhockey.com/article/n6aasfs-2l301/view'],
 ['Leksands IF','Tegera Arena',7650,'https://leksandsif.solidtango.com/contact'],
 ['MoDo Hockey','Hägglunds Arena',7115,'https://www.modohockey.se/artikel/l9klakuzj-4ij6i1/kurva-carlabel-var-nya-staplatssektion','Normal hockeylayout. Tillfälliga extra ståplatser vid enstaka matcher ingår inte.'],
 ['Mora IK','Smidjegrav Arena',4500,'https://www.moraik.se/article/qtf7aklhu-33ni1/view'],
 ['Nybro Vikings','Liljas Arena',2380,'https://www.nybrovikings.com/liljas-arena'],
 ['Södertälje SK','Scaniarinken',6000,'https://www.sodertaljesk.se/article/jmdatd1-41461/view','Klubbens angivna slutsålda matchlayout 2026.'],
 ['Vimmerby HC','VBO Arena',1750,'https://www.swehockey.se/hockeyjournalisterna/nyheter-hockeyjournalisterna/pelle-j-beloenad/'],
 ['Visby/Roma','Visby ishall',2000,'https://hurbra.se/visby-roma-2026-2027/','Cirka 2 000 enligt publicerad säsongsguide. Slutlig matchkapacitet efter 2026 års anpassningar är inte bekräftad av arenaägaren.',true],
 ['Västerås IK','ABB Arena Nord',4496,'https://www.vik.se/article/zjxcakuqw-4a8i1/view'],
 ['Östersunds IK','Östersund Arena',2500,'https://arenabyn.se/ostersund-arena/','Arenaägarens publika hockeykonfiguration, cirka 2 500.']
].map(([club,name,capacity,source,note='',estimated=false])=>[club,{name,capacity,source,note,estimated,checked:'2026-09-24'}]));
function clubArena(club=managerClub()){return CLUB_ARENAS[club]||null;}
function arenaMigrateOffice(office,club){
 const arena=clubArena(club);if(!office||!arena||office.arenaVersion===1)return;
 // Capacity was always generated from fans; there is no arena-upgrade mechanic.
 office.capacity=arena.capacity;office.arenaVersion=1;
}
function arenaDetails(club=managerClub()){
 const a=clubArena(club);if(!a)return '';
 return `<p><strong>${trainingSafe(a.name)}</strong> · ${a.estimated?'cirka ':''}${a.capacity.toLocaleString('sv-SE')} åskådare. <a href="${a.source}" target="_blank" rel="noopener noreferrer">Arenakälla</a>${a.note?' '+trainingSafe(a.note):''}</p>`;
}
