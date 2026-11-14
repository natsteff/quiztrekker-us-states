import unittest,json,pathlib,datetime,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Facts(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.f=json.loads((ROOT/'data/state-facts.json').read_text())
 def test_fifty_ranked_states(self):
  self.assertEqual(len(self.f),50)
  for field in ('population_rank','area_rank','statehood_order'):
   self.assertEqual(sorted(s[field] for s in self.f.values()),list(range(1,51)))
  for key,rank in [('population','population_rank'),('area_sq_mi','area_rank')]:
   ordered=sorted(self.f.values(),key=lambda s:s[rank]);self.assertEqual([s[key] for s in ordered],sorted([s[key] for s in ordered],reverse=True))
 def test_five_hundred_places(self):
  self.assertEqual(sum(len(s['top_ten_places']) for s in self.f.values()),500)
  for abbr,s in self.f.items():
   places=s['top_ten_places'];self.assertEqual(len(places),10)
   self.assertEqual([p['rank'] for p in places],list(range(1,11)))
   self.assertEqual(len({p['census_id'] for p in places}),10)
   self.assertEqual([p['population'] for p in places],sorted([p['population'] for p in places],reverse=True))
   for p in places:
    self.assertIsInstance(p['population'],int);self.assertGreaterEqual(p['population'],0)
    self.assertTrue(p['name'] and p['population_as_of'])
    self.assertEqual(p['place_type'],'census_designated_place' if abbr=='HI' else 'minor_civil_division' if abbr=='RI' else 'incorporated_place')
   if abbr=='HI':self.assertTrue(all('2020–2024' in p['population_as_of'] for p in places))
   else:self.assertTrue(all(p['population_as_of']=='2025-07-01' for p in places))
  self.assertIn('Urban Honolulu',self.f['HI']['top_ten_places'][0]['name'])
  self.assertIn('Cumberland town',[p['name'] for p in self.f['RI']['top_ten_places']])
 def test_dates_areas_and_symbols(self):
  for s in self.f.values():
   datetime.date.fromisoformat(s['statehood_date'])
   self.assertLessEqual(abs(s['land_sq_mi']+s['water_sq_mi']-s['area_sq_mi']),1)
   self.assertEqual(s['population_as_of'],'2025-07-01')
   for field in ('bird','flower','motto','nickname'):self.assertTrue(s[field])
   self.assertTrue(s['landmarks'][0]['url'].startswith('https://www.nps.gov/'))
  for a,n,d in [('DE',1,'1787-12-07'),('WI',30,'1848-05-29'),('AK',49,'1959-01-03'),('HI',50,'1959-08-21')]:
   self.assertEqual(self.f[a]['statehood_order'],n);self.assertEqual(self.f[a]['statehood_date'],d)
  self.assertEqual(self.f['AK']['area_rank'],1);self.assertEqual(self.f['RI']['area_rank'],50)
 def test_neighbors(self):
  for a,s in self.f.items():
   self.assertEqual(len(s['neighbors']),len(set(s['neighbors'])))
   self.assertNotIn(a,s['neighbors'])
   for b in s['neighbors']:self.assertIn(a,self.f[b]['neighbors'])
  self.assertEqual(self.f['AK']['neighbors'],[]);self.assertEqual(self.f['HI']['neighbors'],[])
  self.assertEqual(self.f['ME']['neighbors'],['NH'])
  self.assertNotIn('AZ',self.f['CO']['neighbors']);self.assertNotIn('UT',self.f['NM']['neighbors'])
  self.assertIn('MI',self.f['IL']['neighbors']);self.assertIn('MI',self.f['MN']['neighbors']);self.assertIn('NY',self.f['RI']['neighbors'])
 def test_fifty_local_flags_safe_and_unchanged(self):
  paths=list((ROOT/'public/assets/flags').glob('*.svg'));self.assertEqual({p.stem for p in paths},set(self.f))
  for p in paths:
   root=ET.fromstring(p.read_bytes());self.assertTrue(root.tag.endswith('svg'))
   self.assertTrue(root.attrib.get('viewBox') or (root.attrib.get('width') and root.attrib.get('height')))
   for el in root.iter():
    self.assertNotIn(el.tag.split('}')[-1].lower(),['script','foreignobject'])
    for k,v in el.attrib.items():
     self.assertFalse(k.lower().startswith('on'))
     if k.split('}')[-1]=='href':self.assertTrue(v.startswith('#') or v.startswith('data:'))
   built=ROOT/'dist/assets/flags'/p.name
   self.assertEqual(p.read_bytes(),built.read_bytes())
if __name__=='__main__':unittest.main()
