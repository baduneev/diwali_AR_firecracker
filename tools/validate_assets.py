"""Release gate: fail rather than ship missing or silent substitute recordings."""
import pathlib,json,wave,array,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/'app/src/main/assets'
manifest=assets/'audio-manifest.json'
if not manifest.exists():
    sys.exit('INCOMPLETE: licensed audio bundle and audio-manifest.json have not been generated. See ASSETS.md.')
meta=json.loads(manifest.read_text(encoding='utf8'))
for name in ['anar','sutli','chakri','sky','ladi','phuljhadi']:
    path=assets/'audio'/f'{name}.wav'
    assert path.is_file(),f'Missing {path.name}'
    with wave.open(str(path),'rb') as w:
        assert (w.getnchannels(),w.getsampwidth(),w.getframerate())==(1,2,48000),name
        duration=w.getnframes()/48000
        samples=array.array('h',w.readframes(w.getnframes()))
    assert len(samples)>48000 and max(abs(s) for s in samples)>100,f'Silent or empty {name}'
    assert max(abs(s) for s in samples)<30000,f'Peak ceiling exceeded {name}'
    assert abs(duration-meta[name]['duration'])<.001,name
    assert 0<=meta[name]['main_start']<=meta[name]['peak']<duration,name
    assert hashlib.sha256(path.read_bytes()).hexdigest()==meta[name]['sha256'],name
    assert meta[name]['source'] and meta[name]['license'],name
    print(name,round(duration,3),'seconds:',meta[name]['match_status'])
assert (assets/'credits.txt').is_file(),'Missing in-app credits'
print('Bundle structurally valid. Audition, subtype fidelity, device sync and performance still need review.')
