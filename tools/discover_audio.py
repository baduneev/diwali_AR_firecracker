import requests,re,html,concurrent.futures
urls=['https://freesound.org/people/iliyabylich04/packs/36282/', 'https://freesound.org/people/LOVEBURD/']
def inspect(url):
    t=requests.get(url,timeout=30).text
    title=re.search(r'<title>(.*?)</title>',t,re.S)
    licenses=re.findall(r'https?://creativecommons.org/[^\s"<>]+',t)
    audio=re.findall(r'https://cdn.freesound.org/previews/[^\s"<>]+hq.mp3',t)
    print(url, html.unescape(title.group(1).strip()) if title else '', list(dict.fromkeys(licenses)),list(dict.fromkeys(audio)))
links=[]
for u in urls:
    t=requests.get(u,timeout=30).text
    links+=re.findall(r'href="(/people/[^"<>]+/sounds/\d+/)"',t)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    list(ex.map(inspect,['https://freesound.org'+p for p in dict.fromkeys(links)][:24]))
