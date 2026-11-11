import requests, re, pathlib, json, concurrent.futures
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.research'
OUT.mkdir(exist_ok=True)
def page(url):
    r = requests.get(url, timeout=40); r.raise_for_status(); return r.text
def inspect(url):
    t = page(url)
    links = list(dict.fromkeys(re.findall(r'https://[^\s"<>]+(?:mp3|ogg)', t)))
    title = re.findall(r'<title>(.*?)</title>', t, re.S)
    licenses = list(dict.fromkeys(re.findall(r'https?://creativecommons.org/[^\s"<>]+', t)))
    print(json.dumps({'url':url, 'title':title, 'license':licenses, 'audio':links[:6]}, ensure_ascii=False))
    (OUT / (url.rstrip('/').split('/')[-1]+'.html')).write_text(t,encoding='utf8')
if __name__ == '__main__':
    import sys
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        list(ex.map(inspect, sys.argv[1:]))
