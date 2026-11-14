"""Execute the actual particle bridge setters against SDK type boundaries.

Constructor/GPU creation is bypassed; this regression checks whether live
modifier updates request the destructive native reset, not rendered GPU output.
"""
import os,subprocess,tempfile,unittest,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class ParticleUpdatesTest(unittest.TestCase):
 def test_live_power_and_direction_updates_do_not_request_a_destructive_particle_reset(self):
  sdk=Path(os.environ.get('ANDROID_HOME',Path.home()/'AppData/Local/Android/Sdk'))
  aars=list((Path.home()/'.gradle/caches/modules-2/files-2.1/com.facebook.react/react-android/0.81.4').glob('*/*.aar'))
  bridge=ROOT/'node_modules/@reactvision/react-viro/android/react_viro/react_viro-release.aar'
  renderer=ROOT/'node_modules/@reactvision/react-viro/android/viro_renderer/viro_renderer-release.aar'
  android=sdk/'platforms/android-36/android.jar'
  if not(aars and bridge.exists() and renderer.exists() and android.exists()):self.skipTest('Native Android SDK/dependency jars required')
  jdk=Path(os.environ.get('JAVA_HOME',ROOT.parent/'.tools/jdk-17.0.21+9'))/'bin'
  with tempfile.TemporaryDirectory() as folder:
   out=Path(folder)
   with zipfile.ZipFile(aars[0]) as z:(out/'react.jar').write_bytes(z.read('classes.jar'))
   for name,aar in [('bridge',bridge),('renderer',renderer)]:
    with zipfile.ZipFile(aar) as z:(out/(name+'.jar')).write_bytes(z.read('classes.jar'))
   stub=out/'VRTControl.java';stub.write_text('''package com.viromedia.bridge.component.node.control;
import com.facebook.react.bridge.ReactContext;import com.viro.core.*;import com.viromedia.bridge.component.node.VRTScene;
public class VRTControl {
 protected ViroContext mViroContext;protected VRTScene mScene;
 public VRTControl(ReactContext context){} public void onPropsSet(){} public void onTearDown(){}
 public void setViroContext(ViroContext c){} public void setScene(VRTScene s){}
 public boolean isTornDown(){return false;}public Node getNodeJni(){return null;}
 public ReactContext getContext(){return null;}public void onError(String error){}
}''')
   harness=out/'ParticleUpdateCheck.java';harness.write_text('''import com.viromedia.bridge.component.node.control.VRTParticleEmitter;
import sun.misc.Unsafe;import java.lang.reflect.Field;
public class ParticleUpdateCheck {
 public static void main(String[] args)throws Exception {
  Field unsafeField=Unsafe.class.getDeclaredField("theUnsafe");unsafeField.setAccessible(true);
  Unsafe unsafe=(Unsafe)unsafeField.get(null);
  VRTParticleEmitter emitter=(VRTParticleEmitter)unsafe.allocateInstance(VRTParticleEmitter.class);
  Field restart=VRTParticleEmitter.class.getDeclaredField("mEmitterNeedsRestart");restart.setAccessible(true);
  emitter.setSpawnBehavior(null);check(!restart.getBoolean(emitter),"Changing power destroys in-flight particles");
  emitter.setParticlePhysics(null);check(!restart.getBoolean(emitter),"Changing Chakri jet direction destroys its trail");
  emitter.setParticleAppearance(null);check(!restart.getBoolean(emitter),"Changing fade destroys existing sparks");
  emitter.setDuration(400);check(restart.getBoolean(emitter),"A new timed emission cycle must still reset");
  restart.setBoolean(emitter,false);emitter.setDelay(100);check(restart.getBoolean(emitter),"A rescheduled cycle must reset");
 }
 static void check(boolean ok,String why){if(!ok)throw new AssertionError(why);}
}''')
   cp=os.pathsep.join(map(str,[out,android,out/'react.jar',out/'renderer.jar',out/'bridge.jar']))
   sources=[stub,harness,ROOT/'plugins/native/VRTParticleEmitter.java',ROOT/'plugins/native/NormalizedParticleColor.java']
   compiled=subprocess.run([str(jdk/'javac.exe'),'-cp',cp,'-d',str(out),*map(str,sources)],capture_output=True,text=True)
   self.assertEqual(compiled.returncode,0,compiled.stderr)
   run=subprocess.run([str(jdk/'java.exe'),'-cp',cp,'ParticleUpdateCheck'],capture_output=True,text=True)
   self.assertEqual(run.returncode,0,run.stderr)
