import unittest,sys,pathlib,json,math
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from build import build
class Geography(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.states=build()
    def test_exact_fifty(self):
        self.assertEqual(len(self.states),50)
        self.assertEqual(len({s['abbr'] for s in self.states}),50)
        self.assertNotIn('DC',[s['abbr'] for s in self.states])
    def test_metadata_and_paths(self):
        for s in self.states:
            self.assertTrue(s['capital'] and s['name'])
            self.assertTrue(s['path'].startswith('M') and s['path'].endswith('Z'))
            self.assertTrue(all(math.isfinite(v) for v in s['bounds']))
            self.assertGreater(s['bounds'][2],0)
            self.assertGreater(s['bounds'][3],0)
    def test_reference_and_islands(self):
        by={s['abbr']:s for s in self.states}
        self.assertEqual(by['NY']['capital'],'Albany')
        self.assertEqual(by['AK']['capital'],'Juneau')
        self.assertGreater(by['HI']['path'].count('M'),1)
        self.assertGreater(by['MI']['path'].count('M'),1)
        self.assertGreater(by['CA']['bounds'][3],by['CA']['bounds'][2])
if __name__=='__main__': unittest.main()
