"""Collect Internet video metadata and storyboard sequences for motion research."""
import pathlib,sys,json,requests
from PIL import Image
from io import BytesIO
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/python'))
import yt_dlp
out=ROOT/'.research';out.mkdir(exist_ok=True)
queries={'anar-demo':'anar flower pot fireworks testing','ladi-demo':'1000 wala ladi firecrackers testing','phuljhadi-demo':'real sparkler burning close up diwali','sky-demo':'skyshot fireworks burst night testing'}
results={}
with yt_dlp.YoutubeDL({'quiet':True,'skip_download':True,'extract_flat':'in_playlist','js_runtimes':{'node':{'path':'C:/Program Files/nodejs/node.exe'}}}) as ydl:
    for key,query in queries.items():
        cache=out/f'video-{key}.json'
        try:
            if cache.exists(): info=json.loads(cache.read_text(encoding='utf8'))
            else:
                search=ydl.extract_info('ytsearch5:'+query,download=False)
                found=next(e for e in search['entries'] if not any(w in e['title'].lower() for w in ['green screen','experiment','making',' vs ','homemade','world','biggest']))
                info=ydl.extract_info('https://www.youtube.com/watch?v='+found['id'],download=False)
                cache.write_text(json.dumps(info),encoding='utf8')
            result={'title':info['title'],'url':info['webpage_url'],'duration':info.get('duration'),'review':'Storyboard frames available; full video/audio playback not verified.'}
            formats=[f for f in info.get('formats',[]) if f.get('protocol')=='mhtml']
            if formats:
                f=max(formats,key=lambda x:x['width']);frames=f.get('fragments',[])[:1]
                if frames:
                    r=requests.get(frames[0]['url'],timeout=20);r.raise_for_status()
                    im=Image.open(BytesIO(r.content));im.save(out/f'storyboard-{key}.jpg')
                    result['storyboard']=f'storyboard-{key}.jpg'
            results[key]=result;print(key,json.dumps(result,ensure_ascii=True),flush=True)
        except Exception as e: print(key,str(e),flush=True)
(out/'video-sources.json').write_text(json.dumps(results,indent=2),encoding='utf8')
