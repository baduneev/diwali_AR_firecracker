"""Original meter-scale OBJ meshes, Y-up. No downloaded models or packaging."""
from pathlib import Path
from math import sin,cos,pi,sqrt
import json,random,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def lathe(profile,n=32):
 v=[];uv=[];f=[]
 for j,(r,y) in enumerate(profile):
  for i in range(n+1):
   a=i/n*2*pi;v.append((r*cos(a),y,r*sin(a)));uv.append((i/n,j/(len(profile)-1)))
 for j in range(len(profile)-1):
  for i in range(n):
   a=j*(n+1)+i;b=a+n+1;f.extend([(a,b,a+1),(a+1,b,b+1)])
 return dict(vertices=v,uv=uv,faces=f)
def tube(points,r,sides=8):
 v=[];uv=[];f=[]
 for j,p in enumerate(points):
  prev=points[max(0,j-1)];nxt=points[min(len(points)-1,j+1)];d=[nxt[k]-prev[k] for k in range(3)];l=sqrt(sum(x*x for x in d));d=[x/l for x in d]
  ref=(0,1,0) if abs(d[1])<.9 else (1,0,0)
  u=[d[1]*ref[2]-d[2]*ref[1],d[2]*ref[0]-d[0]*ref[2],d[0]*ref[1]-d[1]*ref[0]];l=sqrt(sum(x*x for x in u));u=[x/l for x in u]
  w=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]]
  for i in range(sides+1):
   a=2*pi*i/sides;v.append(tuple(p[k]+r*(u[k]*cos(a)+w[k]*sin(a)) for k in range(3)));uv.append((i/sides,j/(len(points)-1)))
 for j in range(len(points)-1):
  for i in range(sides):
   a=j*(sides+1)+i;b=a+sides+1;f.extend([(a,a+1,b),(a+1,b+1,b)])
 for j,reverse in [(0,True),(len(points)-1,False)]:
  center=len(v);v.append(tuple(points[j]));uv.append((.5,.5));base=j*(sides+1)
  for i in range(sides):f.append((center,base+i+1,base+i) if reverse else (center,base+i,base+i+1))
 return dict(vertices=v,uv=uv,faces=f)
def models():
 m={k:[] for k in ['anar','sutli','chakri','sky','ladi','phuljhadi']}
 def add(k,mesh,mat,role='shell',burn=2):m[k].append(dict(mesh=mesh,material=mat,role=role,burn=burn))
 for i in range(6):
  low=i*.025;high=(i+1)*.025;r0=.047*(1-low/.16);r1=.047*(1-high/.16)
  add('anar',lathe([(0,low),(r0,low),(r1,high),(max(0,r1-.002),high),(max(0,r0-.002),low),(0,low)]),'red' if i%2 else 'gold',burn=(5-i)/6)
 add('anar',lathe([(0,0),(.048,0),(.048,.005),(0,.005)]),'green')
 profile=[(.038*sin(pi*j/24),.038-.038*cos(pi*j/24)) for j in range(25)]
 add('sutli',lathe(profile),'green',role='charge',burn=0)
 for j in range(1,13):
  a=pi*j/14;y=.038-.037*cos(a);r=.038*sin(a);pts=[(r*cos(t*2*pi/48),y,r*sin(t*2*pi/48)) for t in range(49)]
  add('sutli',tube(pts,.0012),'rope')
 for j in range(12):
  pts=[]
  for i in range(25):
   t=(j+i/24)/12;a=t*10*pi;r=.006+.037*t;pts.append((r*cos(a),.006,r*sin(a)))
  add('chakri',tube(pts,.003),'rope' if j%2 else 'blue',burn=1-j/12)
 add('chakri',lathe([(0,0),(.045,0),(.045,.002),(0,.002)]),'paper')
 add('sky',lathe([(0,0),(.025,0),(.025,.12),(.021,.12),(.021,.005),(0,.005)]),'blue',burn=.2)
 add('sky',lathe([(0,0),(.034,0),(.034,.008),(0,.008)]),'paper')
 for i in range(36):
  x=-.023 if i%2==0 else .023;z=-.144+(i//2)*.016
  add('ladi',tube([(x-.019,.007,z),(x+.019,.007,z)],.006,12),'red' if i%3 else 'pink',role='charge',burn=i/36)
 add('ladi',tube([(0,.003,-.16),(0,.003,.15)],.0015),'rope')
 add('phuljhadi',tube([(0,.005,-.135),(0,.005,.135)],.0009),'metal',role='wire')
 for i in range(18):
  z=-.13+i*.01;add('phuljhadi',tube([(0,.005,z),(0,.005,z+.0098)],.003,10),'coating',role='coating',burn=i/18)
 for k,pts in {'anar':[(0,.15,0),(.005,.158,0)],'sutli':[(0,.075,0),(.012,.09,0)],'sky':[(.024,.008,0),(.045,.01,0)]}.items():add(k,tube(pts,.001),'rope',role='fuse',burn=0)
 return m
def write_obj(path,mesh):
 lines=['# Original Diwali AR mesh; meters, Y up.']
 lines+=['v %.7f %.7f %.7f'%tuple(v) for v in mesh['vertices']];lines+=['vt %.6f %.6f'%tuple(uv) for uv in mesh['uv']]
 for face in mesh['faces']:
  a,b,c=[mesh['vertices'][i] for i in face];u=[b[i]-a[i] for i in range(3)];w=[c[i]-a[i] for i in range(3)]
  n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];l=sqrt(sum(x*x for x in n)) or 1;lines.append('vn %.7f %.7f %.7f'%tuple(x/l for x in n))
 lines+=['f '+' '.join(f'{v+1}/{v+1}/{j+1}' for v in face) for j,face in enumerate(mesh['faces'])];path.write_text('\n'.join(lines)+'\n')
def textures(out):
 rng=random.Random(22);n=256;paper=Image.new('RGB',(n,n));normal=Image.new('RGB',(n,n));char=Image.new('RGB',(n,n))
 for y in range(n):
  for x in range(n):
   f=rng.randrange(-14,15);v=max(0,min(255,220+f+(8 if y%31==0 else 0)));paper.putpixel((x,y),(v,v,v));normal.putpixel((x,y),(128+f//3,128+f//3,253));b=rng.randrange(15,62);char.putpixel((x,y),(b,b-3,b-7))
 paper.save(out/'paper.png');normal.save(out/'paper-normal.png');char.save(out/'char.png')
 for name,smoke in [('spark',False),('smoke',True),('contact',True)]:
  im=Image.new('RGBA',(128,128));p=im.load()
  for y in range(128):
   for x in range(128):
    r=sqrt(((x-63.5)/64)**2+((y-63.5)/64)**2);alpha=max(0,1-r)**(1.8 if smoke else 3);color=(180,178,174) if name=='smoke' else (0,0,0) if name=='contact' else (255,237,193);p[x,y]=(*color,int(alpha*(120 if name=='contact' else 255)))
  im.save(out/(name+'.png'))
def main():
 out=ROOT/'assets/models';out.mkdir(parents=True,exist_ok=True);textures(out);catalog={};ts=['// Generated by tools/build_models.py. Metro requires literal paths.','export const MODELS = {']
 for kind,parts in models().items():
  catalog[kind]=[];ts.append(f'  {kind}: [')
  for i,p in enumerate(parts):
   name=f'{kind}-{i}.obj';write_obj(out/name,p['mesh']);meta={k:v for k,v in p.items() if k!='mesh'};meta['file']=name;catalog[kind].append(meta)
   ts.append('    {'+f"source: require('../assets/models/{name}'),material:'{p['material']}',role:'{p['role']}',burn:{p['burn']}"+'},')
  ts.append('  ],')
 ts.append('} as const;');(ROOT/'src/models.ts').write_text('\n'.join(ts));(out/'catalog.json').write_text(json.dumps(catalog,indent=2))
 audio=ROOT/'assets/audio';audio.mkdir(exist_ok=True)
 for p in (ROOT.parent/'app/src/main/assets/audio').glob('*.wav'):shutil.copy2(p,audio/p.name)
 for name in ['audio-manifest.json','credits.txt']:
  source=ROOT.parent/'app/src/main/assets'/name
  if source.exists():shutil.copy2(source,ROOT/'assets'/name)
  elif not (ROOT/'assets'/name).exists():raise FileNotFoundError(name)
 print('Built',sum(len(p) for p in catalog.values()),'original OBJ parts, textures and six recording resources')
if __name__=='__main__':main()
