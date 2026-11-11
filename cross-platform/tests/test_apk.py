import unittest
from pathlib import Path
from zipfile import ZipFile
APK=Path(__file__).resolve().parents[1]/'android/app/build/outputs/apk/release/app-release.apk'
@unittest.skipUnless(APK.exists(),'Build the native APK first')
class ApkTest(unittest.TestCase):
 def test_every_advertised_architecture_includes_the_native_renderer(self):
  with ZipFile(APK) as z:
   names=set(z.namelist());abis={n.split('/')[1] for n in names if n.startswith('lib/') and n.endswith('.so')}
   self.assertTrue(abis)
   for abi in abis:self.assertIn(f'lib/{abi}/libviro_renderer.so',names,f'{abi} would crash during startup')
