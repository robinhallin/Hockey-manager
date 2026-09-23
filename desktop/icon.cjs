'use strict';
// Repo-native graphic, generated reproducibly without a downloaded brand asset.
const fs=require('node:fs'),zlib=require('node:zlib'),path=require('node:path');
const size=256,data=Buffer.alloc((size*4+1)*size);
const glyphs={H:['10001','10001','10001','11111','10001','10001','10001'],M:['10001','11011','10101','10101','10001','10001','10001']};
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 let c=[13,27,41,255];
 const dx=Math.max(28-x,0,x-227),dy=Math.max(28-y,0,y-227);
 if(dx*dx+dy*dy>28*28)c=[0,0,0,0];
 if(x>=16&&x<240&&y>=16&&y<240&&(x<20||x>235||y<20||y>235))c=[87,148,199,255];
 if(y>=188&&y<196&&x>47&&x<209)c=[87,148,199,255];
 if(y>=76&&y<153){const gy=Math.floor((y-76)/11);for(const [letter,start] of [['H',50],['M',150]]){const gx=Math.floor((x-start)/11);if(gx>=0&&gx<5&&glyphs[letter][gy][gx]==='1')c=[235,242,249,255];}}
 const i=y*(size*4+1)+1+x*4;for(let n=0;n<4;n++)data[i+n]=c[n];
}
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(name,b){const n=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(b.length);sum.writeUInt32BE(crc(Buffer.concat([n,b])));return Buffer.concat([len,n,b,sum]);}
const hdr=Buffer.alloc(13);hdr.writeUInt32BE(size);hdr.writeUInt32BE(size,4);hdr[8]=8;hdr[9]=6;
fs.mkdirSync(path.join(__dirname,'build'),{recursive:true});fs.writeFileSync(path.join(__dirname,'build','icon.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',zlib.deflateSync(data)),chunk('IEND',Buffer.alloc(0))]));
