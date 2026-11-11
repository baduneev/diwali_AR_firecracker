"""Master licensed browser-downloaded recordings offline. No network requests.
Place the five source MP3s in .research/audio-inputs/. See ASSETS.md for licenses.
"""
import sys,pathlib,json,subprocess,wave,hashlib
import numpy as np
from scipy.signal import find_peaks
from audio_mastering import master,RATE
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/python'))
import imageio_ffmpeg
OUT=ROOT/'app/src/main/assets';(OUT/'audio').mkdir(parents=True,exist_ok=True)
INPUT=ROOT/'.research/audio-inputs'
LICENSE='https://pixabay.com/service/terms/'
SOURCES={
 'fountain':('alex_jauk-firework-fountain-200051.mp3','Alexander Jauk / Alex_Jauk','https://pixabay.com/sound-effects/film-special-effects-firework-fountain-200051/'),
 'sparkler':('freesound_community-onesparkler-67535.mp3','RytmenPinnen, published by freesound_community on Pixabay','https://pixabay.com/sound-effects/film-special-effects-onesparkler-67535/'),
 'cracker':('tanweraman-cracker-sound-261119.mp3','Aman Kumar / TanwerAman','https://pixabay.com/sound-effects/film-special-effects-cracker-sound-261119/'),
 'spinner':('freesound_community-buzzingbeefirework1-107785.mp3','j1987, published by freesound_community on Pixabay','https://pixabay.com/sound-effects/film-special-effects-buzzingbeefirework1-107785/'),
 'sky':('alex_jauk-firework-explosion-with-echo-147321.mp3','Alexander Jauk / Alex_Jauk','https://pixabay.com/sound-effects/city-firework-explosion-with-echo-147321/'),
}
def read(key):
    filename,_,_=SOURCES[key];p=INPUT/filename
    if not p.exists():raise FileNotFoundError(f'Place licensed source in {p}')
    raw=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(p),'-ac','1','-ar',str(RATE),'-f','f32le','-'])
    return np.frombuffer(raw,dtype='<f4').copy()
def metadata(key):
    filename,author,url=SOURCES[key]
    return {'source':url,'author':author,'source_filename':filename,'source_sha256':hashlib.sha256((INPUT/filename).read_bytes()).hexdigest(),'license':'Pixabay Content License','license_url':LICENSE,'license_version_checked':'2026-10-20 terms','checked':'2026-11-10','acquisition':'Downloaded using the public Pixabay Free download button in the browser; source page displayed Content License.'}
def segment(a,start,end):return a[round(start*RATE):min(len(a),round(end*RATE))].copy()
def onsets(a):
    block=240
    envelope=np.max(np.abs(a[:len(a)//block*block].reshape(-1,block)),axis=1)
    peaks,_=find_peaks(envelope,height=float(envelope.max())*.27,distance=60,prominence=float(envelope.max())*.15)
    return peaks*block
def build():
    raw={k:read(k) for k in SOURCES}
    prefix=master(segment(raw['sparkler'],16,17),gain=.035,tail=0)
    tracks={
        'anar':('fountain',raw['fountain'],0,len(raw['fountain'])/RATE,.36,'Recorded fountain; category match.'),
        'chakri':('spinner',raw['spinner'],0,len(raw['spinner'])/RATE,.34,'Real spinning-bee firework recording; variant differs from the pictured chakri.'),
        'phuljhadi':('sparkler',segment(raw['sparkler'],34,48.1),34,48.1,.30,'Recorded sparkler excerpt; category match.'),
        'sky':('sky',raw['sky'],0,6,.50,'Recorded firework explosion with natural echo; virtual launch follows recording lead-in.'),
        'sutli':('cracker',segment(raw['cracker'],10.9,11.6),10.9,11.6,.43,'Provisional: isolated recorded Diwali firecracker bang; source does not identify sutli subtype.'),
    }
    # A rapid string assembled from distinct REAL bangs, with unchanged pitch.
    positions=onsets(raw['cracker']);assert len(positions)>=6
    positions=positions[:12];pop_offsets=[];excerpt_edits=[]
    sequence=np.zeros(round(4.6*RATE),dtype=np.float32)
    for i in range(36):
        peak=int(positions[i%len(positions)])
        start=max(0,peak-round(.025*RATE));end=min(len(raw['cracker']),peak+round(.18*RATE))
        snippet=master(raw['cracker'][start:end],gain=.25,tail=0)
        offset=round((i*.116+(i%3)*.008)*RATE)
        sequence[offset:offset+len(snippet)]+=snippet
        pop_offsets.append((offset+int(np.argmax(np.abs(snippet))))/RATE+1)
        excerpt_edits.append({'source_start':start/RATE,'source_end':end/RATE,'output_offset':offset/RATE})
    tracks['ladi']=('cracker',sequence,0,28.32,.38,'Assembled rapid string using distinct recorded Diwali bangs; not an unedited ladi recording.')
    manifest={}
    for name,(key,a,start,end,gain,match) in tracks.items():
        pcm=master(a,prefix,gain=gain);asset=OUT/'audio'/f'{name}.wav'
        with wave.open(str(asset),'wb') as w:
            w.setparams((1,2,RATE,0,'NONE','not compressed'));w.writeframes((pcm*32767).astype('<i2').tobytes())
        meta=metadata(key)
        meta.update(duration=len(pcm)/RATE,main_start=1.0,peak=1+int(np.argmax(np.abs(a)))/RATE,trim_start=start,trim_end=end,peak_gain=gain,match_status=match,sha256=hashlib.sha256(asset.read_bytes()).hexdigest(),edits='Decoded MP3 to 48 kHz mono PCM16, adjusted gain without pitch change, 10 ms edge fades, 1 s real sparkler-hiss ignition cue and 250 ms tail silence.')
        if name=='ladi':meta.update(burst_times=pop_offsets,assembly=excerpt_edits)
        manifest[name]=meta
    manifest['_ignition']={**metadata('sparkler'),'trim_start':16,'trim_end':17,'description':'Recorded sparkler hiss used as virtual ignition cue at low gain.'}
    (OUT/'audio-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    credits=['Real firework recordings, edited for Diwali Camera.','Licensed under the Pixabay Content License, checked 10 November 2026.',LICENSE,'']
    for name,m in manifest.items():credits += [name.replace('_','').title(),m['author'],m['source'],m.get('match_status',m.get('description','')),'']
    credits+=['Recordings are incorporated into this interactive app. They are not licensed as a standalone sound library.','Original artwork and simulated particles are created for this app.']
    (OUT/'credits.txt').write_text('\n'.join(credits),encoding='utf8')
    print(json.dumps({k:{x:v[x] for x in ('duration','peak','match_status')} for k,v in manifest.items() if not k.startswith('_')},indent=2))
if __name__=='__main__':build()
