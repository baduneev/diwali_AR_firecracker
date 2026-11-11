"""Native camera regression: compare rendered viewport, not a JS state label.

Expects the task's 720x1600 emulator and an installed standalone APK.
"""
from pathlib import Path
import subprocess,time,json,re,xml.etree.ElementTree as ET,hashlib
from PIL import Image,ImageChops,ImageStat
ROOT=Path(__file__).resolve().parents[1]
ADB=Path.home()/'AppData/Local/Android/Sdk/platform-tools/adb.exe'
OUT=ROOT/'dist/screenshots/camera';OUT.mkdir(parents=True,exist_ok=True)
def adb(*args):
 return subprocess.run([str(ADB),'-s','emulator-5580',*args],check=True,capture_output=True).stdout.decode(errors='replace')
def tree():
 adb('shell','uiautomator','dump','/sdcard/camera-qa.xml')
 return ET.fromstring(adb('shell','cat','/sdcard/camera-qa.xml'))
def button(t,label):
 parents={c:p for p in t.iter() for c in p}
 for n in t.iter('node'):
  if label not in (n.get('text'),n.get('content-desc')):continue
  while n is not None and n.get('clickable')!='true':n=parents.get(n)
  if n is not None and n.get('enabled')=='true':
   b=list(map(int,re.findall(r'\d+',n.get('bounds'))))
   if len(b)==4 and 0<=b[0]<b[2]<=720:return b
 return None
def tap(b):
 assert b,'Button missing or disabled'
 adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
def wait(predicate,timeout=50):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  t=tree()
  if predicate(t):return t
  time.sleep(.25)
 raise AssertionError('UI timeout: '+repr([n.get('text') for n in t.iter('node')]))
def text(t,prefix):return any(n.get('text','').startswith(prefix) for n in t.iter('node'))
def shot(name):
 time.sleep(.8)
 adb('shell','screencap','-p','/sdcard/camera-qa.png');adb('pull','/sdcard/camera-qa.png',str(OUT/(name+'.png')))
 return Image.open(OUT/(name+'.png')).convert('RGB').crop((100,410,620,900))
def difference(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
adb('shell','am','force-stop','com.neev.diwaliar');adb('shell','am','start','-W','-n','com.neev.diwaliar/.MainActivity')
t=wait(lambda t:button(t,'Open 3D studio'));tap(button(t,'Open 3D studio'))
wait(lambda t:text(t,'Tap the studio floor'))
# A drag before placement must leave the studio empty.
adb('shell','input','swipe','250','600','470','650','700')
t=tree();assert text(t,'Tap the studio floor'),'Dragging accidentally placed an object'
if button(t,'Reset view'):tap(button(t,'Reset view'))
adb('shell','input','tap','360','650')
wait(lambda t:text(t,'Placed.') and button(t,'Light firecracker'))
before=shot('default')
adb('shell','input','swipe','200','600','520','600','900')
orbit=shot('orbit')
orbit_diff=difference(before,orbit)
assert orbit_diff>3,f'Horizontal drag did not move rendered camera: mean difference {orbit_diff:.4f}'
adb('shell','input','swipe','360','600','360','800','700')
elevated=shot('higher');vertical_diff=difference(orbit,elevated)
assert vertical_diff>3,f'Vertical drag did not change elevation: {vertical_diff}'
tap(button(tree(),'Reset view'));reset=shot('reset')
reset_diff=difference(before,reset)
assert reset_diff<2,f'Reset did not restore original view: {reset_diff}'
tap(button(tree(),'Zoom in'));zoom=shot('zoom');zoom_diff=difference(reset,zoom)
assert zoom_diff>3,f'Zoom did not move rendered camera: {zoom_diff}'
tap(button(tree(),'Zoom out'));zoom_back=shot('zoom-back')
assert difference(reset,zoom_back)<2,'Inverse zoom did not restore view'
# The companion dex injects a real two-pointer touchscreen gesture (adb shell).
adb('shell','CLASSPATH=/data/local/tmp/diwali-camera-gesture.dex','app_process','/system/bin','StudioPinch')
pinched=shot('pinch');pinch_diff=difference(reset,pinched)
assert pinch_diff>3,f'Two-finger pinch did not move rendered camera: {pinch_diff}'
assert text(tree(),'Placed.'),'Pinching replaced the placed object'
tap(button(tree(),'Reset view'))
# Camera input must remain usable while audio/combustion runs.
tap(button(tree(),'Light firecracker'));wait(lambda t:text(t,'Watch it burn'))
adb('shell','input','swipe','200','600','480','650','650')
shot('burning-orbit')
wait(lambda t:text(t,'Spent.'),35)
adb('shell','input','swipe','480','600','200','600','650')
shot('spent-orbit')
assert text(tree(),'Spent.'),'Dragging relit or replaced the spent object'
tap(button(tree(),'Clear'));wait(lambda t:text(t,'Tap the studio floor'))
apk=ROOT/'android/app/build/outputs/apk/release/app-release.apk'
result={'apk_sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'device':'emulator-5580','horizontal_drag_difference':orbit_diff,'vertical_drag_difference':vertical_diff,'zoom_difference':zoom_diff,'pinch_difference':pinch_diff,'reset_difference':reset_diff,'drag_does_not_place':True,'camera_available_while_burning_and_spent':True}
(ROOT/'dist/qa-studio-camera.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2),flush=True)
