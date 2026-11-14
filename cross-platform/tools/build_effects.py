"""Generate particle sprites, extend Chakri and master the licensed Sutli bang.

Offline, deterministic. The original Kotlin recording is the immutable input;
the shared AR app gets a crossfaded loop, with unchanged pitch and attribution.
"""
from pathlib import Path
import hashlib,json,wave
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def build():
 out=ROOT/'assets/models'
 for name,rgb in {'gold':(255,166,35),'red':(255,35,65),'green':(30,255,100),'blue':(60,115,255)}.items():
  im=Image.new('RGBA',(128,128))
  for y in range(128):
   for x in range(128):
    radius=(((x-63.5)/64)**2+((y-63.5)/64)**2)**.5
    im.putpixel((x,y),(*rgb,round(255*max(0,1-radius)**2.5)))
  im.save(out/f'spark-{name}.png')
 source=ROOT.parent/'app/src/main/assets/audio/chakri.wav'
 with wave.open(str(source),'rb') as w:
  assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(1,2,48000)
  pcm=w.readframes(w.getnframes())
 rate=48000;prefix=pcm[:rate*2]
 body=np.frombuffer(pcm[rate*2:-round(.25*rate)*2],dtype='<i2').astype(np.float64)
 mixed=body.copy();overlap=round(.04*rate);weights=np.linspace(0,1,overlap)
 while len(mixed)<12*rate:
  mixed[-overlap:]=mixed[-overlap:]*(1-weights)+body[:overlap]*weights
  mixed=np.concatenate((mixed,body[overlap:]))
 mixed=mixed[:12*rate];fade=round(.08*rate);mixed[-fade:]*=np.linspace(1,0,fade)
 extended=prefix+np.rint(mixed).astype('<i2').tobytes()+bytes(round(.25*rate)*2)
 target=ROOT/'assets/audio/chakri.wav'
 with wave.open(str(target),'wb') as w:
  w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(extended)
 path=ROOT/'assets/audio-manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'))
 meta=manifest['chakri'];meta.update(duration=len(extended)/2/rate,peak=1+int(np.argmax(np.abs(mixed)))/rate,
  sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
  base_edit_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
  loop_edit={'input_asset':'original Kotlin audio/chakri.wav','input_body_start':1,'input_body_end':2.92,'crossfade_seconds':.04,'body_duration_seconds':12,'end_fade_seconds':.08},
  match_status='Crossfaded 12 s loop of a real spinning-bee recording; not an unedited chakri field recording.',
  edits='Original 1 s real sparkler-hiss ignition retained. The mastered spinning-bee body is repeated with 40 ms linear crossfades, unchanged pitch, an 80 ms final fade and 250 ms silence. Only the shared AR app uses this extended edit.')
 path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
 print(f'Chakri: {meta["duration"]} s, sha256 {meta["sha256"]}')

 # Restore the immutable original edit; retain quiet ignition. Reinforce the
 # recording's own low mids and softly compress its short transient for phone
 # speakers. No synthetic explosion, pitch change or hard clipping is added.
 source=ROOT.parent/'app/src/main/assets/audio/sutli.wav'
 with wave.open(str(source),'rb') as w:
  assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(1,2,48000)
  pcm=w.readframes(w.getnframes())
 body=np.frombuffer(pcm[rate*2:],dtype='<i2').astype(np.float64)
 body/=32768
 def lowpass(samples,cutoff):
  coefficient=1-np.exp(-2*np.pi*cutoff/rate);out=np.empty_like(samples);previous=0.
  for i,value in enumerate(samples):
   previous+=coefficient*(value-previous);out[i]=previous
  return out
 low_mids=lowpass(body,400)-lowpass(body,70)
 shaped=np.tanh(4*(body+.6*low_mids))
 shaped*=.96/np.max(np.abs(shaped));body=np.rint(shaped*32768).astype('<i2')
 target=ROOT/'assets/audio/sutli.wav'
 with wave.open(str(target),'wb') as w:
  w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(pcm[:rate*2]+body.tobytes())
 meta=manifest['sutli'];meta.update(sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
  peak_gain=.96,peak=1+int(np.argmax(np.abs(body.astype(np.int32))))/rate,
  mastering={'soft_drive':4,'source_low_mid_band_hz':[70,400],'low_mid_mix':.6,'peak_headroom':.96},
  base_edit_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
  edits='Original 1 s real ignition retained. The bang/decay uses source-derived 70-400 Hz reinforcement and soft transient compression, normalized to 0.96 full-scale with headroom. No synthetic sound, pitch change or hard clipping. Runtime gain is strongest for Sutli; source is a generic Diwali bang, not a brand-specific recording.')
 path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
 print(f'Sutli: peak {meta["peak"]:.5f} s, 0.96 full scale; sha256 {meta["sha256"]}')

if __name__=='__main__':build()
