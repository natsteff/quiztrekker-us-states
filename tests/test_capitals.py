import unittest,json,pathlib,sys,re,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from capital_projection import project_capital
class Capitals(unittest.TestCase):
    def test_source_and_projection(self):
        capitals=json.loads((ROOT/'data/capital-coordinates.json').read_text())
        golden=json.loads((ROOT/'data/capital-projected.json').read_text())
        usgs=json.loads((ROOT/'data/capitals-usgs.json').read_text())
        source={f['attributes']['city']:f['geometry'] for f in usgs['features']}
        states=json.loads((ROOT/'dist/states.js').read_text().removeprefix('export const states = ').strip().removesuffix(';'))
        self.assertEqual(len(capitals),50)
        self.assertEqual(len({c['state'] for c in capitals}),50)
        for s in states:
            with self.subTest(state=s['abbr']):
                c=next(c for c in capitals if c['state']==s['name'])
                self.assertEqual(c['city'].replace('Saint','St.'),s['capital'].replace('Saint','St.'))
                self.assertAlmostEqual(c['lon'],source[c['city']]['x'],places=6)
                self.assertAlmostEqual(c['lat'],source[c['city']]['y'],places=6)
                xy=project_capital(c['lon'],c['lat'],s['abbr'])
                expected=next(c for c in golden if c['state']==s['name'])['xy']
                self.assertLess(math.dist(xy,expected),1e-8)
                self.assertEqual(xy,[s['capitalPoint']['x'],s['capitalPoint']['y']])
                # Even-odd point containment in the exact rendered outline, including holes.
                inside=False;x,y=xy
                for ring in s['path'].split('M')[1:]:
                    pts=[tuple(map(float,p.split(','))) for p in ring.rstrip('Z').split('L')]
                    for (ax,ay),(bx,by) in zip(pts,pts[1:]+pts[:1]):
                        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:inside=not inside
                self.assertTrue(inside,'Capital must fall inside its own displayed state')
