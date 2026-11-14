"""Run the actual Android scene bridge against deterministic SDK boundaries.

This exercises Java event delivery/serialization, not ARCore tracking or GPU FPS.
Only Android/RN/Viro SDK types are substituted; VRTARScene is compiled unchanged.
"""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NativeEventsTest(unittest.TestCase):
 def test_native_callbacks_are_bounded_before_serialization_and_retired_updates_are_cancelled(self):
  java_home = os.environ.get('JAVA_HOME')
  local_jdk = ROOT.parent / '.tools/jdk-17.0.21+9'
  java_bin = Path(java_home) / 'bin' if java_home else local_jdk / 'bin'
  javac = str(java_bin / 'javac.exe') if (java_bin / 'javac.exe').exists() else shutil.which('javac')
  java = str(java_bin / 'java.exe') if (java_bin / 'java.exe').exists() else shutil.which('java')
  self.assertTrue(javac and java, 'JDK 17 is required for native bridge callback tests')
  stubs = {
   'android.graphics.Bitmap': 'public class Bitmap {}',
   'android.os.Looper': 'public class Looper {public static Looper getMainLooper(){return new Looper();}}',
   'android.os.Handler': '''public class Handler {
    static java.util.List<Runnable> pending=new java.util.ArrayList<>();
    public Handler(Looper l){} public boolean postDelayed(Runnable r,long delay){pending.add(r);return true;}
    public boolean post(Runnable r){pending.add(r);return true;}
    public void removeCallbacks(Runnable r){pending.removeIf(p->p==r);}
    public void removeCallbacksAndMessages(Object o){pending.clear();}
    public static void flush(){var copy=new java.util.ArrayList<>(pending);pending.clear();for(var r:copy)r.run();}
   }''',
   'com.facebook.react.bridge.ReadableMap': 'public interface ReadableMap {}',
   'com.facebook.react.bridge.ReadableArray': 'public interface ReadableArray {int size();String getString(int i);}',
   'com.facebook.react.bridge.WritableMap': '''public class WritableMap extends java.util.HashMap<String,Object> implements ReadableMap {
    public void putInt(String k,int v){put(k,v);} public void putDouble(String k,double v){put(k,v);}
    public void putString(String k,String v){put(k,v);} public void putMap(String k,ReadableMap v){put(k,v);}
    public void putArray(String k,Object v){put(k,v);}
   }''',
   'com.facebook.react.bridge.Arguments': '''public class Arguments {
    public static WritableMap createMap(){return new WritableMap();}
    public static Object makeNativeArray(float[] v){return v;}
   }''',
   'com.facebook.react.uimanager.events.RCTEventEmitter': '''public interface RCTEventEmitter {
    void receiveEvent(int id,String name,com.facebook.react.bridge.WritableMap map);
   }''',
   'com.facebook.react.bridge.ReactContext': '''public class ReactContext {
    public static final java.util.List<String> names=new java.util.ArrayList<>();
    public static final java.util.List<WritableMap> maps=new java.util.ArrayList<>();
    public <T> T getJSModule(Class<T> type){return type.cast((com.facebook.react.uimanager.events.RCTEventEmitter)(id,name,map)->{names.add(name);maps.add(map);});}
   }''',
   'com.viro.core.Vector': '''public class Vector {public float x,y,z;
    public Vector(float a,float b,float c){x=a;y=b;z=c;} public float[] toArray(){return new float[]{x,y,z};}
   }''',
   'com.viro.core.ARAnchor': '''public class ARAnchor {
    public enum Type {PLANE;public String getStringValue(){return "plane";}}
    public Type getType(){return Type.PLANE;} public String getAnchorId(){return "floor";}
    public Vector getPosition(){return new Vector(1,0,-2);} public Vector getScale(){return new Vector(1,1,1);}
    public Vector getRotation(){return new Vector(0,0,0);}
   }''',
   'com.viro.core.ARPlaneAnchor': '''public class ARPlaneAnchor extends ARAnchor {
    public float width=.24f; public Vector getCenter(){return new Vector(0,0,0);}
    public Vector getExtent(){return new Vector(width,0,.3f);} public Label getAlignment(){return new Label();}
    public Label getClassification(){return new Label();}
    public static class Label {public String getStringValue(){return "HorizontalUpward";}}
   }''',
   'com.viro.core.ARNode': 'public class ARNode {}',
   'com.viro.core.Scene': 'public class Scene {public void setVisibilityListener(Object l){}}',
   'com.viro.core.EventDelegate': 'public class EventDelegate {public enum EventAction {ON_CAMERA_AR_HIT_TEST,ON_AR_POINT_CLOUD_UPDATE} public void setEventEnabled(EventAction a,boolean b){}}',
   'com.viro.core.ViroViewARCore': 'public class ViroViewARCore {public enum AnchorDetectionType {HORIZONTAL;public static AnchorDetectionType valueFromString(String s){return HORIZONTAL;}}}',
   'com.viro.core.ARScene': '''public class ARScene extends Scene {
    public ARScene(boolean b){} public interface Listener {} public enum OcclusionMode {DISABLED}
    public enum TrackingState {NORMAL;public int getId(){return 3;}}
    public enum TrackingStateReason {NONE;public int getId(){return 1;}}
    public void setListener(Object o){} public void displayPointCloud(boolean b){} public void resetPointCloudSurface(){}
    public void setPointCloudSurfaceScale(Vector v){} public void setPointCloudMaxPoints(int i){}
    public void addARDeclarativeNode(Object o){} public void updateARDeclarativeNode(Object o){}
    public void removeARDeclarativeNode(Object o){} public void setAnchorDetectionTypes(Object o){}
    public void setOcclusionMode(OcclusionMode o){} public void setPointCloudQuad(Quad q){}
   }''',
   'com.viro.core.Texture': 'public class Texture {public enum Format {RGBA8} public Texture(){} public Texture(Object i,boolean a,boolean b,Object c){}}',
   'com.viro.core.Quad': 'public class Quad {public Quad(float a,float b){} public void dispose(){} public void setImageTexture(Texture t){}}',
   'com.viro.core.internal.ARDeclarativeNode': 'public class ARDeclarativeNode {}',
   'com.viro.core.internal.Image': 'public class Image extends com.viro.core.Texture {public Image(android.graphics.Bitmap b,Format f){}}',
   'com.viromedia.bridge.utility.ImageDownloadListener': 'public interface ImageDownloadListener {boolean isValid();void completed(android.graphics.Bitmap b);void failed(String e);}',
   'com.viromedia.bridge.utility.ImageDownloader': 'public class ImageDownloader {public ImageDownloader(Object o){} public void setTextureFormat(com.viro.core.Texture.Format f){} public void getImageAsync(Object o,ImageDownloadListener l){}}',
   'com.viromedia.bridge.utility.ARUtils': '''public class ARUtils {
    public static int mapCalls=0;
    public static com.facebook.react.bridge.WritableMap mapFromARAnchor(com.viro.core.ARAnchor a){
     mapCalls++;var m=new com.facebook.react.bridge.WritableMap();m.putString("anchorId",a.getAnchorId());m.putArray("vertices",new float[300]);return m;
    }
   }''',
   'com.viromedia.bridge.utility.ViroEvents': '''public class ViroEvents {
    public static final String ON_TRACKING_UPDATED="tracking",ON_AMBIENT_LIGHT_UPDATE="light",ON_ANCHOR_FOUND="found",ON_ANCHOR_UPDATED="updated",ON_ANCHOR_REMOVED="removed";
   }''',
   'com.viromedia.bridge.component.node.VRTScene': '''public class VRTScene {
    protected com.facebook.react.bridge.ReactContext mReactContext;
    protected com.viro.core.Scene mNativeScene=new com.viro.core.ARScene(true);
    protected com.viro.core.EventDelegate mEventDelegateJni=new com.viro.core.EventDelegate();
    public VRTScene(com.facebook.react.bridge.ReactContext c){mReactContext=c;}
    protected com.viro.core.Scene createSceneJni(){return mNativeScene;} public Object getContext(){return null;}
    public boolean isTornDown(){return false;} public int getId(){return 1;} public void onSceneDidAppear(){} public void onTearDown(){}
    public void onTrackingUpdated(com.viro.core.ARScene.TrackingState s,com.viro.core.ARScene.TrackingStateReason r){}
    public void onTrackingInitialized(){} public void onAmbientLightUpdate(float i,com.viro.core.Vector c){}
    public void onAnchorFound(com.viro.core.ARAnchor a,com.viro.core.ARNode n){}
    public void onAnchorUpdated(com.viro.core.ARAnchor a,com.viro.core.ARNode n){}
    public void onAnchorRemoved(com.viro.core.ARAnchor a,com.viro.core.ARNode n){}
   }''',
  }
  harness = '''import android.os.Handler;
import com.viro.core.*;
import com.facebook.react.bridge.*;
import com.viromedia.bridge.component.node.VRTARScene;
public class Harness {
 static int count(String event){return java.util.Collections.frequency(ReactContext.names,event);}
 static void check(boolean condition,String why){if(!condition)throw new AssertionError(why);}
 public static void main(String[] args){
  var scene=new VRTARScene(new ReactContext());var plane=new ARPlaneAnchor();
  scene.onAnchorFound(plane,null);
  for(int i=0;i<60;i++){
   plane.width=.24f+i*.01f;scene.onAnchorUpdated(plane,null);
   scene.onAmbientLightUpdate(400+i,new Vector(1,1,1));
  }
  Handler.flush();
  check(count("updated")<=2,"60 native plane callbacks crossed the bridge without backpressure: "+count("updated"));
  check(count("light")<=2,"ambient light callbacks were not bounded: "+count("light"));
  var update=ReactContext.maps.get(ReactContext.names.indexOf("updated"));
  var anchor=(WritableMap)update.get("anchor");
  check((Double)anchor.get("width")>.8,"newest plane estimate was discarded");
  check(!anchor.containsKey("vertices"),"unused polygon vertices still serialized into scene updates");
  int before=count("updated");scene.onAnchorUpdated(plane,null);scene.onAnchorRemoved(plane,null);Handler.flush();
  check(count("updated")==before,"queued update revived a removed plane");
  before=count("updated");
  for(int i=0;i<40;i++){
   final String id="patch-"+i;
   scene.onAnchorUpdated(new ARPlaneAnchor(){@Override public String getAnchorId(){return id;}},null);
  }
  Handler.flush();
  check(count("updated")-before<=8,"many native patches grew the pending queue without a bound");
  var newest=(WritableMap)ReactContext.maps.get(ReactContext.names.lastIndexOf("updated")).get("anchor");
  check("patch-39".equals(newest.get("anchorId")),"queue bound discarded the newest native patch");
  scene.onAnchorUpdated(plane,null);scene.onAmbientLightUpdate(800,new Vector(1,1,1));
  int events=ReactContext.names.size();scene.onTearDown();Handler.flush();
  check(ReactContext.names.size()==events,"callbacks escaped after scene disposal");
  System.out.println("60 plane + 60 light callbacks: 1 plane event; 40-patch queue bounded; stale updates cancelled; teardown drained");
 }
}'''
  with tempfile.TemporaryDirectory(prefix='diwali-native-events-') as temp:
   folder=Path(temp);files=[]
   for name,body in stubs.items():
    package,_,simple=name.rpartition('.')
    p=folder/Path(*name.split('.')).with_suffix('.java');p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text('package '+package+';\n'+body,encoding='utf-8');files.append(str(p))
   # Compile the production bridge, not a copy of its event-handling logic.
   production=ROOT/'plugins/native/VRTARScene.java'
   (folder/'Harness.java').write_text(harness,encoding='utf-8')
   sources=[*files,str(production),str(folder/'Harness.java')]
   build=subprocess.run([javac,'-encoding','UTF-8','-d',str(folder/'classes'),*sources],capture_output=True,text=True)
   self.assertEqual(build.returncode,0,build.stdout+build.stderr)
   result=subprocess.run([java,'-cp',str(folder/'classes'),'Harness'],capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stdout+result.stderr)
   print(result.stdout.strip())
