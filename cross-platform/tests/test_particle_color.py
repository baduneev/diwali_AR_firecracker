import os,shutil,subprocess,tempfile,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
class ParticleColorTest(unittest.TestCase):
 def test_native_argb_channels_are_normalized_before_reaching_the_particle_shader(self):
  java_bin=Path(os.environ.get('JAVA_HOME',''))/'bin'
  javac=str(java_bin/'javac.exe') if (java_bin/'javac.exe').exists() else shutil.which('javac')
  java=str(java_bin/'java.exe') if (java_bin/'java.exe').exists() else shutil.which('java')
  self.assertTrue(java and javac)
  with tempfile.TemporaryDirectory() as folder:
   out=Path(folder);test=out/'ColorCheck.java'
   test.write_text('''import com.viromedia.bridge.component.node.control.NormalizedParticleColor;
public class ColorCheck {
 public static void main(String[] args){
  check(0xffff0000,new float[]{1,0,0}); check(0xff00ff00,new float[]{0,1,0});
  check(0xff0000ff,new float[]{0,0,1}); check(0xff000000,new float[]{0,0,0});
  check(0xffffffff,new float[]{1,1,1}); check(0xff804020,new float[]{128f/255,64f/255,32f/255});
 }
 static void check(int argb,float[] want){float[] got=NormalizedParticleColor.fromArgb(argb);
  for(int i=0;i<3;i++)if(Math.abs(got[i]-want[i])>0.000001f)throw new AssertionError("Shader channel: "+got[i]+" expected "+want[i]);
 }
}''')
   subprocess.run([javac,'-d',str(out),str(ROOT/'plugins/native/NormalizedParticleColor.java'),str(test)],check=True,capture_output=True)
   result=subprocess.run([java,'-cp',str(out),'ColorCheck'],capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr)
