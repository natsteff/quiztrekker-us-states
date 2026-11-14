"""Refresh versioned facts from pinned Census vintages and factual reference tables.
Run python3 scripts/refresh_facts.py --download to fetch sources; no API key.
Normal application builds consume data/state-facts.json and never use the network.
"""
import csv, json, pathlib, re, sys, urllib.request, zipfile, hashlib
from html_tables import tables
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'data/sources'
SOURCES={
 'population-2025.csv':'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/totals/NST-EST2025-ALLDATA.csv',
 'cities-2025.csv':'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv',
 'area.html':'https://www.census.gov/geographies/reference-files/2010/geo/state-area.html',
 'birds.html':'https://en.wikipedia.org/wiki/List_of_U.S._state_birds',
 'flowers.html':'https://en.wikipedia.org/wiki/List_of_U.S._state_and_territory_flowers',
 'mottos.html':'https://en.wikipedia.org/wiki/List_of_U.S._state_and_territory_mottos',
 'nicknames.html':'https://en.wikipedia.org/wiki/List_of_U.S._state_and_territory_nicknames',
 'flags.zip':'https://flagcdn.com/us-svg.zip',
}
ACS='https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/'
ACS_FILES={'hawaii-acs-pop.dat':ACS+'data/5YRData/acsdt5y2024-b01003.dat','hawaii-acs-geos.txt':ACS+'documentation/Geos20245YR.txt'}
def download():
 CACHE.mkdir(exist_ok=True,parents=True)
 for name,url in SOURCES.items():
  req=urllib.request.Request(url,headers={'User-Agent':'StateQuest/1.0 (github.com/natsteff/statequest)'})
  (CACHE/name).write_bytes(urllib.request.urlopen(req,timeout=60).read())
 for name,url in ACS_FILES.items():
  with urllib.request.urlopen(url,timeout=60) as r:
   (CACHE/name).write_bytes(b''.join(line for i,line in enumerate(r) if i==0 or b'1600000US15' in line))
def rows(name,encoding='utf-8-sig',delimiter=','):
 return list(csv.DictReader((CACHE/name).open(encoding=encoding),delimiter=delimiter))
def generate():
 meta=[line.split('\t') for line in (ROOT/'data/states.tsv').read_text().splitlines()]
 byname={name:abbr for _,abbr,name,_ in meta};names=set(byname)
 pop={r['NAME']:int(r['POPESTIMATE2025']) for r in rows('population-2025.csv') if r['SUMLEV']=='040' and r['NAME'] in names}
 cities=rows('cities-2025.csv','cp1252')
 area={r[0]:dict(area_sq_mi=int(r[1].replace(',','')),land_sq_mi=int(r[3].replace(',','')),water_sq_mi=int(r[5].replace(',',''))) for r in tables((CACHE/'area.html').read_text())[0] if r and r[0] in names}
 def symbols(file,cols):
  out={};current=None
  for r in tables((CACHE/(file+'.html')).read_text())[0][1:]:
   if not r:continue
   r[0]=r[0].replace('Hawaiʻi','Hawaii')
   if r[0] in names:current=r[0];value=r[1]
   elif len(r)<cols and current:value=r[0]
   else:current=None;continue
   value=value.replace(' | ',' ').strip()
   out.setdefault(current,[]).append(value)
  return {name:'; '.join(dict.fromkeys(vals)) for name,vals in out.items()}
 birds=symbols('birds',5);flowers=symbols('flowers',5);mottos=symbols('mottos',6)
 nick=dict(line.split('\t') for line in (ROOT/'data/nicknames.tsv').read_text().splitlines())
 landmark={a:dict(name=n,url=f'https://www.nps.gov/{code}/index.htm') for a,n,code in (line.split('\t') for line in (ROOT/'data/landmarks.tsv').read_text().splitlines())}
 statehood={r['abbreviation']:r for r in csv.DictReader((ROOT/'data/statehood.csv').open())}
 geo={r['GEO_ID']:r['NAME'] for r in rows('hawaii-acs-geos.txt',delimiter='|')}
 hi=sorted(rows('hawaii-acs-pop.dat',delimiter='|'),key=lambda r:-int(r['B01003_E001']))[:10]
 topo=json.loads((ROOT/'data/states-albers-10m.json').read_text());arcs={}
 for g in topo['objects']['states']['geometries']:
  if g['properties']['name'] not in names:continue
  polygons=g['arcs'] if g['type']=='MultiPolygon' else [g['arcs']]
  arcs[byname[g['properties']['name']]]={i if i>=0 else ~i for poly in polygons for ring in poly for i in ring}
 adjacent={a:sorted(b for b in arcs if b!=a and arcs[a]&arcs[b]) for a in arcs}
 # Cartographic coastlines omit three wholly-water shared boundaries.
 for a,b in [('MI','IL'),('MI','MN'),('NY','RI')]:
  adjacent[a]=sorted(set(adjacent[a]+[b]));adjacent[b]=sorted(set(adjacent[b]+[a]))
 result={}
 for fips,abbr,name,capital in meta:
  candidates=sorted([r for r in cities if r['STNAME']==name and r['SUMLEV']==('061' if abbr=='RI' else '162')],key=lambda r:(-int(r['POPESTIMATE2025']),r['PLACE']))[:10]
  places=[dict(rank=i+1,name=r['NAME'],population=int(r['POPESTIMATE2025']),population_as_of='2025-07-01',place_type='minor_civil_division' if abbr=='RI' else 'incorporated_place',census_id=r['STATE']+r['COUNTY']+r['COUSUB'] if abbr=='RI' else r['STATE']+r['PLACE']) for i,r in enumerate(candidates)]
  if abbr=='HI':places=[dict(rank=i+1,name=geo[r['GEO_ID']].removesuffix(', Hawaii'),population=int(r['B01003_E001']),population_as_of='2020–2024 ACS 5-year',place_type='census_designated_place',census_id=r['GEO_ID']) for i,r in enumerate(hi)]
  result[abbr]=dict(abbr=abbr,name=name,population=pop[name],population_rank=sorted(pop,key=lambda x:-pop[x]).index(name)+1,population_as_of='2025-07-01',**area[name],area_rank=sorted(area,key=lambda x:-area[x]['area_sq_mi']).index(name)+1,statehood_date=statehood[abbr]['statehood_date'],statehood_order=int(statehood[abbr]['statehood_order']),top_ten_places=places,bird=birds[name],flower=flowers[name],motto=mottos[name],nickname=nick[abbr],landmarks=[landmark[abbr]],neighbors=adjacent[abbr])
 assert len(result)==50 and sum(len(s['top_ten_places']) for s in result.values())==500
 (ROOT/'data/state-facts.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 manifest={name:{'url':url,'sha256':hashlib.sha256((CACHE/name).read_bytes()).hexdigest()} for name,url in {**SOURCES,**ACS_FILES}.items()}
 for filename,url in [('statehood.csv','https://www.congress.gov/crs-product/R47747'),('landmarks.tsv','https://www.nps.gov/findapark/index.htm'),('nicknames.tsv',SOURCES['nicknames.html'])]:
  manifest[filename]={'url':url,'sha256':hashlib.sha256((ROOT/'data'/filename).read_bytes()).hexdigest()}
 (ROOT/'data/source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 flagdir=ROOT/'public/assets/flags';flagdir.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(CACHE/'flags.zip') as z:
  for abbr in result:(flagdir/(abbr+'.svg')).write_bytes(z.read(abbr.lower()+'.svg'))
 print('Generated 50 fact profiles, 500 places and 50 flags')
if __name__=='__main__':
 if '--download' in sys.argv:download()
 generate()
