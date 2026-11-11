"""Read an independent author's CC0 firework recording pack."""
import pathlib,requests,re,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
out=ROOT/'.research';out.mkdir(exist_ok=True)
url='https://opengameart.org/node/92774'
r=requests.get(url,timeout=40);r.raise_for_status()
(out/'opengameart-92774.html').write_text(r.text,encoding='utf8')
assert 'CC0' in r.text and 'I recorded 25' in r.text
links=re.findall(r'href=["\']([^"\']+\.zip)["\']',r.text)
print(links,flush=True)
link=next(x for x in links if '25-CC0-bang' in x)
from urllib.parse import urljoin
link=urljoin(url,link)
data=requests.get(link,timeout=40);data.raise_for_status()
path=out/'25-CC0-bang-sfx.zip';path.write_bytes(data.content)
with zipfile.ZipFile(path) as z:
    print(z.namelist())
    for member in z.infolist():
        target=(out/'oga'/member.filename).resolve()
        assert target.is_relative_to((out/'oga').resolve())
    z.extractall(out/'oga')
