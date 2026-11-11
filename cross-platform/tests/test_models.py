import unittest,sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'tools'))
from build_models import models
class ModelsTest(unittest.TestCase):
 def test_all_six_models_have_closed_grounded_volumetric_parts(self):
  catalog=models()
  self.assertEqual(set(catalog),{'anar','sutli','chakri','sky','ladi','phuljhadi'})
  for kind,parts in catalog.items():
   self.assertTrue(parts,kind)
   vertices=[v for part in parts for v in part['mesh']['vertices']]
   self.assertGreater(max(v[1] for v in vertices),.002,kind)
   self.assertGreaterEqual(min(v[1] for v in vertices),-.00001,kind)
   for part in parts:
    mesh=part['mesh'];self.assertTrue(mesh['faces'])
    for face in mesh['faces']:
     self.assertEqual(len(face),3)
     self.assertTrue(all(0<=i<len(mesh['vertices']) for i in face))
    self.assertTrue(all(math.isfinite(x) for v in mesh['vertices'] for x in v))
 def test_chakri_and_sparkler_are_flat_and_ladi_contains_36_separate_crackers(self):
  m=models();self.assertEqual(len([p for p in m.get('ladi',[]) if p.get('role')=='charge']),36)
  for kind in ['chakri','phuljhadi']:
   v=[v for p in m[kind] for v in p['mesh']['vertices']]
   height=max(p[1] for p in v)-min(p[1] for p in v)
   extent=max(max(p[a] for p in v)-min(p[a] for p in v) for a in [0,2])
   self.assertLess(height,extent*.2,kind)
if __name__=='__main__':unittest.main()
