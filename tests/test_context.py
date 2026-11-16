import unittest,json,pathlib,re,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Context(unittest.TestCase):
 def test_shared_frame_preserves_capitals(self):
  raw=(ROOT/'dist/context-geometry.js').read_text();geo={s['abbr']:s for s in json.loads(raw.removeprefix('export const contextGeometry = ').strip().removesuffix(';'))}
  states=json.loads((ROOT/'dist/states.js').read_text().removeprefix('export const states = ').strip().removesuffix(';'))
  def inside(x,y,ring):
   hit=False
   for i,(ax,ay) in enumerate(ring):
    bx,by=ring[i-1]
    if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:hit=not hit
   return hit
  for s in states:
   c=s['capitalPoint'];x=(c['lon']+180)*math.cos(math.radians(55))*10;y=(90-c['lat'])*10
   rings=[[tuple(map(float,p)) for p in re.findall(r'(-?[\d.]+),(-?[\d.]+)',r)] for r in geo[s['abbr']]['path'].split('Z') if r]
   self.assertTrue(any(inside(x,y,r) for r in rings),s['abbr'])
