import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'tools'))
from build_models import tube
class NormalsTest(unittest.TestCase):
 def test_tube_front_face_points_outward_for_native_backface_culling(self):
  m=tube([(0,.01,0),(.02,.01,0)],.003)
  a,b,c=[m['vertices'][i] for i in m['faces'][0]];u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
  normal_z=u[0]*v[1]-u[1]*v[0]
  self.assertGreater(normal_z,0)
