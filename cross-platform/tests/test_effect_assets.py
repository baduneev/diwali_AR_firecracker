import json,unittest,wave,hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
class EffectAssetsTest(unittest.TestCase):
 def test_longer_chakri_retains_ignition_and_matches_its_playback_manifest(self):
  with wave.open(str(ROOT/'assets/audio/chakri.wav'),'rb') as w:
   rate=w.getframerate();pcm=w.readframes(w.getnframes());duration=w.getnframes()/rate
  self.assertGreaterEqual(duration,13)
  # Hash of the original 48,000-frame ignition PCM; no sibling checkout needed.
  self.assertEqual(hashlib.sha256(pcm[:48000*2]).hexdigest(),'7893c1d01816aad95177c793af35d4a83e8fd825f5e86d00b1138c2bc06ab38b','Keep the original real ignition cue')
  manifest=json.loads((ROOT/'assets/audio-manifest.json').read_text())['chakri']
  self.assertEqual(duration,manifest['duration'])
  self.assertEqual(hashlib.sha256((ROOT/'assets/audio/chakri.wav').read_bytes()).hexdigest(),manifest['sha256'])

 def test_colour_textures_retain_saturated_hues_and_transparent_edges(self):
  from PIL import Image
  for name,axis in [('red',0),('green',1),('blue',2)]:
   path=ROOT/f'assets/models/spark-{name}.png';self.assertTrue(path.exists())
   im=Image.open(path).convert('RGBA');p=im.getpixel((64,64))
   self.assertGreater(p[axis],200);self.assertLess(min(p[:3]),100)
   self.assertEqual(im.getpixel((0,0))[3],0)

if __name__=='__main__':unittest.main()
