"""Reproject pinned outlines to a shared geographic frame for cross-border teaching maps."""
import math,json,re
from capital_projection import _conic

def context_geometry(states,root):
 def xy(lon,lat):return [(lon+180)*math.cos(math.radians(55))*10,(90-lat)*10]
 def invert(x,y,a):
  k=1300;tx,ty=487.5,305;p0,p1,rot,center=29.5,45.5,96,(-.6,38.7)
  if a=='AK':p0,p1,rot,center=55,65,154,(-2,58.5);tx-=.307*k;ty+=.201*k;k*=.35
  if a=='HI':p0,p1,rot,center=8,18,157,(-3,19.9);tx-=.205*k;ty+=.212*k
  n=(math.sin(math.radians(p0))+math.sin(math.radians(p1)))/2;c=math.cos(math.radians(p0))**2+2*n*math.sin(math.radians(p0));r0=math.sqrt(c)/n
  cx,cy=_conic(center[0]-rot,center[1],(p0,p1),rot,(0,0),1,(0,0));cy=-cy
  xx=(x-tx)/k+cx;yy=r0-((ty-y)/k+cy)
  lon=math.degrees(math.atan2(xx,yy)/n)-rot;lat=math.degrees(math.asin(max(-1,min(1,(c-(xx*xx+yy*yy)*n*n)/(2*n)))))
  return lon,lat
 def item(a,rings):
  pts=[p for r in rings for p in r];xs,ys=zip(*pts)
  return {'abbr':a,'path':''.join('M'+'L'.join(f'{x:.3f},{y:.3f}' for x,y in r)+'Z' for r in rings),'bounds':[min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys)]}
 result=[]
 for s in states:
  rings=[]
  for r in s['path'].split('Z'):
   if not r:continue
   pts=[list(map(float,p)) for p in re.findall(r'(-?[\d.]+),(-?[\d.]+)',r)]
   rings.append([xy(*invert(x,y,s['abbr'])) for x,y in pts])
  result.append(item(s['abbr'],rings))
 for f in json.loads((root/'data/expansion-boundaries.geojson').read_text())['features']:
  result.append(item(f['properties']['abbr'],[[xy(lon,lat) for lon,lat in r] for poly in f['geometry']['coordinates'] for r in poly]))
 # Keep the collective UM islands in their actual Pacific positions across the dateline.
 islands=json.loads((root/'data/um-islands.json').read_text())
 result.append(item('UM',[[xy(lon-360 if lon>0 else lon,lat) for lon,lat in r] for group in islands.values() for r in group]))
 return result
