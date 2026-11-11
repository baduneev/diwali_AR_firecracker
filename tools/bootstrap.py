"""Fetch a portable build JDK into the ignored .tools directory, if needed."""
import pathlib, requests, zipfile, os
root = pathlib.Path(__file__).resolve().parents[1]
dest = root / '.tools'
dest.mkdir(exist_ok=True)
archive = dest / 'jdk17.zip'
if not list(dest.glob('jdk-*/bin/java.exe')):
    with requests.get('https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse', stream=True, timeout=120) as r:
        r.raise_for_status()
        with archive.open('wb') as f:
            for chunk in r.iter_content(1024*1024): f.write(chunk)
    with zipfile.ZipFile(archive) as z: z.extractall(dest)
print(next(dest.glob('jdk-*/bin/java.exe')).parent.parent)
