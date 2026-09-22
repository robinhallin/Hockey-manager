"""Download unmodified official club artwork and keep its source with the game.
Run from the repository root. WebP bytes are embedded in SVG containers so the
asset set is text-based without changing the original artwork.
"""
import base64, concurrent.futures, html, json, pathlib, re, urllib.request
root=pathlib.Path('assets/crests');root.mkdir(parents=True,exist_ok=True)
shl={'Björklöven':'ifb1_ifb','Brynäs IF':'bif1_bif','Djurgårdens IF':'dif1_dif','Frölunda HC':'fhc1_fhc','Färjestad BK':'fbk1_fbk','HV71':'hv711_hv71','Linköping HC':'lhc1_lhc','Luleå Hockey':'lhf1_lhf','Malmö Redhawks':'mif1_mif','Rögle BK':'rbk1_rbk','Skellefteå AIK':'saik1_saik','Timrå IK':'tik1_tik','Växjö Lakers':'vlh1_vlh','Örebro Hockey':'ohk1_ohk'}
ha={'AIK':'AIK','Almtuna IS':'AIS','BIK Karlskoga':'BIK','IK Oskarshamn':'IKO','Kalmar HC':'KHC','Leksands IF':'LIF','MoDo Hockey':'MoDo','Mora IK':'MORA','Nybro Vikings':'NVIF','Södertälje SK':'SSK','Vimmerby HC':'VHC','Visby/Roma':'VIS','Västerås IK':'VIK','Östersunds IK':'ÖIK'}
nhl_names=['Anaheim Ducks','Boston Bruins','Buffalo Sabres','Calgary Flames','Carolina Hurricanes','Chicago Blackhawks','Colorado Avalanche','Columbus Blue Jackets','Dallas Stars','Detroit Red Wings','Edmonton Oilers','Florida Panthers','Los Angeles Kings','Minnesota Wild','Montréal Canadiens','Nashville Predators','New Jersey Devils','New York Islanders','New York Rangers','Ottawa Senators','Philadelphia Flyers','Pittsburgh Penguins','San Jose Sharks','Seattle Kraken','St. Louis Blues','Tampa Bay Lightning','Toronto Maple Leafs','Utah Mammoth','Vancouver Canucks','Vegas Golden Knights','Washington Capitals','Winnipeg Jets']
nhl_codes='ANA BOS BUF CGY CAR CHI COL CBJ DAL DET EDM FLA LAK MIN MTL NSH NJD NYI NYR OTT PHI PIT SJS SEA STL TBL TOR UTA VAN VGK WSH WPG'.split()
page=pathlib.Path('/tmp/hm-ha.html').read_text()
found={}
for tag in re.findall(r'<img[^>]+>',page):
 alt=re.search(r'alt="([^"]*)',tag);src=re.search(r'src="([^"]*)',tag)
 if alt and src and 'ha-media.hadigital.se' in src[1]:found[html.unescape(alt[1])]=html.unescape(src[1])
jobs=[(name,key,'https://sportality.cdn.s8y.se/team-logos/'+key+'.svg') for name,key in shl.items()]
jobs += [(name,'ha-'+code.lower().replace('ö','o'),found[code]) for name,code in ha.items()]
jobs += [(name,'nhl-'+code.lower(),'https://assets.nhle.com/logos/nhl/svg/'+code+'_dark.svg') for name,code in zip(nhl_names,nhl_codes)]
def fetch(job):
 name,key,url=job
 with urllib.request.urlopen(url,timeout=35) as response:data=response.read()
 if url.endswith('.svg'):
  content=data.decode();assert '<svg' in content and '<script' not in content.lower()
 else:
  assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
  content='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image width="256" height="256" preserveAspectRatio="xMidYMid meet" href="data:image/webp;base64,'+base64.b64encode(data).decode()+'"/></svg>'
 path=root/(key+'.svg');path.write_text(content)
 return name,{'file':str(path),'source':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:entries=dict(pool.map(fetch,jobs))
(root/'sources.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
print('Downloaded',len(entries),'verified club assets')
