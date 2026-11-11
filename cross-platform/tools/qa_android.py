"""Exercise the standalone Android preview on an explicitly selected adb device."""
from pathlib import Path
import subprocess,time,xml.etree.ElementTree as ET,json,re,hashlib,argparse
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--serial',default='emulator-5580');parser.add_argument('--only',choices=['anar','sutli','chakri','sky','ladi','phuljhadi']);args=parser.parse_args()
ADB=Path.home()/'AppData/Local/Android/Sdk/platform-tools/adb.exe'
out=ROOT/'dist/screenshots';out.mkdir(parents=True,exist_ok=True)
def adb(*cmd):
 return subprocess.run([str(ADB),'-s',args.serial,*cmd],check=True,capture_output=True).stdout.decode('utf-8',errors='replace')
def tree():
 adb('shell','uiautomator','dump','/sdcard/diwali-qa.xml')
 return ET.fromstring(adb('shell','cat','/sdcard/diwali-qa.xml'))
def texts(t):return [n.get('text','') for n in t.iter('node')]
def rect(n):return [int(x) for x in re.findall(r'-?\d+',n.get('bounds',''))]
def button(t,label):
 parents={c:p for p in t.iter() for c in p}
 for n in t.iter('node'):
  if n.get('text')!=label and n.get('content-desc')!=label:continue
  while n is not None and n.get('clickable')!='true':n=parents.get(n)
  if n is None:continue
  b=rect(n)
  if len(b)==4 and 0<=b[0]<b[2]<=720 and b[1]<b[3] and n.get('enabled')=='true':return b
 return None
def tap(b):adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
def wait(predicate,timeout=30):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  t=tree()
  if predicate(t):return t
  time.sleep(.25)
 raise AssertionError('UI did not reach expected state: '+repr(texts(t)))
def shot(name):
 adb('shell','screencap','-p','/sdcard/diwali-qa.png');adb('pull','/sdcard/diwali-qa.png',str(out/(name+'.png')))
def select(label):
 for _ in range(5):
  t=tree();b=button(t,label)
  if b:tap(b);return
  adb('shell','input','swipe','645','1245','120','1245','350')
 raise AssertionError('Could not select '+label)
adb('shell','am','force-stop','com.neev.diwaliar');adb('shell','am','start','-W','-n','com.neev.diwaliar/.MainActivity')
t=wait(lambda t:'Open 3D studio' in texts(t),60);tap(button(t,'Open 3D studio'))
wait(lambda t:any('Tap the studio floor' in s for s in texts(t)),30)
manifest=json.loads((ROOT/'assets/audio-manifest.json').read_text());results=[]
for kind,label in [('anar','Anar'),('sutli','Sutli bomb'),('chakri','Chakri'),('sky','Sky shot'),('ladi','Ladi'),('phuljhadi','Phuljhadi')]:
 if args.only and args.only!=kind:continue
 select(label);adb('shell','input','tap','360','700')
 t=wait(lambda t:any(s.startswith('Placed.') for s in texts(t)) and button(t,'Light firecracker') is not None,30)
 shot(kind+'-placed');tap(button(t,'Light firecracker'));began=time.monotonic()
 wait(lambda t:'Watch it burn' in texts(t) or any(s.startswith('Spent.') for s in texts(t)),8)
 shot(kind+'-burning')
 wait(lambda t:any(s.startswith('Spent.') for s in texts(t)),manifest[kind]['duration']+10)
 shot(kind+'-spent')
 t=tree();assert button(t,'Light firecracker') is None,'Spent objects must not light again without selection'
 results.append({'effect':kind,'completed':True,'wall_seconds':round(time.monotonic()-began,2)})
 tap(button(t,'Clear'));wait(lambda t:any('Tap the studio floor' in s for s in texts(t)),10)
 print(kind,'placed, rendered, lit, completed and cleared',flush=True)
(ROOT/('dist/qa-smoke.json' if args.only else 'dist/qa-results.json')).write_text(json.dumps({'apk_sha256':hashlib.sha256((ROOT/'android/app/build/outputs/apk/release/app-release.apk').read_bytes()).hexdigest(),'device':args.serial,'mode':'3D studio; not AR tracking','checks':results},indent=2))
print('Native studio checks passed.',flush=True)
