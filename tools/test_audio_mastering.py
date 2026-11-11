import unittest
import numpy as np
from audio_mastering import master,RATE

class MasteringTest(unittest.TestCase):
    def test_keeps_original_transient_spacing_after_prefix(self):
        a=np.zeros(2400,dtype=np.float32);a[600]=.5;a[1400]=1
        out=master(a,np.zeros(480,dtype=np.float32),gain=.4,tail=0)
        peaks=np.flatnonzero(out>.1)
        self.assertEqual([1080,1880],peaks.tolist())
        self.assertAlmostEqual(.4,float(out[1880]),places=5)
        self.assertEqual(.5,float(a[600]))
    def test_adds_tail_without_replacing_recorded_signal(self):
        a=np.ones(4800,dtype=np.float32)
        out=master(a,tail=.1)
        self.assertEqual(9600,len(out))
        self.assertGreater(float(np.max(out[:4800])),.1)
        self.assertTrue(np.all(out[4800:]==0))
    def test_refuses_silent_or_nonfinite_sources(self):
        for a in [np.zeros(4800),np.array([np.nan]),np.array([])]:
            with self.assertRaises(ValueError):master(a)
if __name__=='__main__':unittest.main()
