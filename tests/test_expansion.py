import json,unittest,pathlib,sys,math,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from expansion import build_expansion
class Expansion(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.locations=build_expansion(ROOT);cls.facts=json.loads((ROOT/'data/extra-facts.json').read_text())
 def test_groups_and_facts(self):
  self.assertEqual(len(self.locations),20)
  self.assertEqual({g:sum(s['group']==g for s in self.locations) for g in ['usExtras','canadaProvinces','canadaTerritories']},{'usExtras':7,'canadaProvinces':10,'canadaTerritories':3})
  for s in self.locations:
   with self.subTest(location=s['abbr']):
    f=self.facts[s['abbr']];self.assertNotIn('statehood_date',f);self.assertNotIn('statehood_order',f)
    self.assertTrue(s['path'].startswith('M'));self.assertTrue(all(math.isfinite(v) for v in s['bounds']));self.assertGreater(min(s['bounds'][2:]),0)
    self.assertTrue((ROOT/'public'/f['flag']).is_file())
    if f['flag'].endswith('.jpg'):
     image=(ROOT/'public'/f['flag']).read_bytes();self.assertTrue(image.startswith(b'\xff\xd8') and image.endswith(b'\xff\xd9'))
    self.assertTrue(all(u.startswith('https://') for u in f['sources']))
    if s['abbr']!='UM':self.assertGreater(f['population'],0);self.assertTrue(f['water_sq_mi'] is None or abs(f['land_sq_mi']+f['water_sq_mi']-f['area_sq_mi'])<.01)
 def test_capitals_inside_exact_displayed_outlines(self):
  count=0
  for s in self.locations:
   if not s.get('capitalPoint'):continue
   count+=1;x=s['capitalPoint']['x'];y=s['capitalPoint']['y'];inside=False
   for ring in s['path'].split('M')[1:]:
    pts=[tuple(map(float,p.split(','))) for p in ring.rstrip('Z').split('L')]
    for (ax,ay),(bx,by) in zip(pts,pts[1:]+pts[:1]):
     if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:inside=not inside
   self.assertTrue(inside,s['abbr'])
  self.assertEqual(count,18)
 def test_um_collective_and_flag_safety(self):
  um=next(s for s in self.locations if s['abbr']=='UM');islands=json.loads((ROOT/'data/um-islands.json').read_text())
  self.assertEqual(len(islands),9);self.assertEqual(um['inset_names'],list(islands));self.assertFalse(um.get('capitalPoint'));self.assertIsNone(self.facts['UM']['population'])
  for name,rs in islands.items():self.assertGreater(sum(map(len,rs)),3,name)
  for p in (ROOT/'public/assets/extra-flags').glob('*.svg'):
   for el in ET.fromstring(p.read_bytes()).iter():
    self.assertNotIn(el.tag.split('}')[-1].lower(),['script','foreignobject'])
    for k,v in el.attrib.items():
     self.assertFalse(k.lower().startswith('on'))
     if k.split('}')[-1]=='href':self.assertTrue(v.startswith('#') or v.startswith('data:'))
