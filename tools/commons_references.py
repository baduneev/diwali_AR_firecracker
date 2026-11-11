import pathlib,json,requests,sys,subprocess,re
from PIL import Image,ImageDraw
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'.research'
sys.path.insert(0,str(ROOT/'.tools/python'))
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
pages=json.loads((out/'commons.json').read_text(encoding='utf8'))['query']['pages']
for page in pages.values():
    info=page['imageinfo'][0];meta=info['extmetadata'];key=page['title'].split(' ')[-1].split('.')[0]
    print(key,meta.get('LicenseShortName'),meta.get('Artist'),meta.get('ImageDescription'),flush=True)
    path=out/f'commons-{key}.ogv'
    if not path.exists():
        r=requests.get(info['url'].split('?')[0],headers={'User-Agent':'DiwaliCamera/0.1 asset research'},timeout=60);r.raise_for_status();path.write_bytes(r.content)
    subprocess.run([ffmpeg,'-y','-v','error','-i',str(path),'-vf','fps=1/2,scale=240:-1,tile=5x3','-frames:v','1',str(out/f'commons-sheet-{key}.jpg')],check=True)
    p=subprocess.run([ffmpeg,'-i',str(path)],capture_output=True,text=True)
    print(p.stderr[-1400:],flush=True)
