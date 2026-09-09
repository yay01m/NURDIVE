"""Record links actually present in verified official index pages."""
import html
import json
import re
import sys
import unicodedata
from urllib.parse import urljoin
from collect_official import DATA, download, collect

INDEX={114:'tp250428',113:'tp240424',112:'tp230524',111:'tp220421',110:'tp210416',109:'tp200414',108:'tp190415',107:'tp180511',106:'tp170425'}

def decode(path):
    raw=path.read_bytes()
    for encoding in ['utf-8','cp932','euc_jp']:
        try: return raw.decode(encoding)
        except UnicodeDecodeError: pass
    raise ValueError('Cannot decode official HTML')

def text(s): return unicodedata.normalize('NFKC',html.unescape(re.sub('<[^>]+>','',s))).strip()

def discover(exam):
    base='https://www.mhlw.go.jp/seisakunitsuite/bunya/kenkou_iryou/iryou/topics/'
    index=base+INDEX[exam]+'-03_04_05.html'
    path=DATA/'sources'/str(exam)/'index.html'
    download(index,path)
    body=decode(path)
    found=re.search(r'<h2[^>]*>[^<]*看護師国家試験問題.*?(?=<h2|<h[34]|<div class="m-box|照会先)',body,re.S)
    if not found: raise ValueError('Nursing question section not found')
    section=found[0]
    assert str(exam) in text(section[:section.index('</h2>')])
    docs=[{'role':'index','filename':'index.html','url':index}]
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>',section,re.S):
        label=text(row)
        links=re.findall(r'href=["\']([^"\']+\.pdf)["\']',row,re.I)
        if not links: continue
        role='questions' if ('午前' in label or '午後' in label) and 'ルビ' not in label else 'answers' if '正答' in label else 'errata' if '正誤' in label else None
        if not role: continue
        session='AM' if '午前' in label else 'PM'
        filename=session+'.pdf' if role=='questions' else role+'.pdf'
        docs.append({'role':role,'filename':filename,'url':urljoin(index,html.unescape(links[0])),**({'session':session} if role=='questions' else {})})
    assert sum(d['role']=='questions' for d in docs)==2
    assert sum(d['role']=='answers' for d in docs)==1
    # This candidate URL must return an official page containing the correct exam title.
    results=f'https://www.mhlw.go.jp/general/sikaku/successlist/{exam+1911}/siken03_04_05/about.html'
    rp=path.with_name('results.html')
    download(results,rp)
    result_body=decode(rp)
    assert f'第{exam}回看護師' in re.sub(r'\s','',text(result_body))
    docs.append({'role':'results','filename':'results.html','url':results})
    special_links=[u for u in re.findall(r'href=["\']([^"\']+\.pdf)["\']',result_body,re.I) if 'kangoshi' in u.lower() and 'seitou' not in u.lower()]
    for i,u in enumerate(dict.fromkeys(special_links)):
        docs.append({'role':'special','filename':f'special_{i+1:02}.pdf','url':urljoin(results,html.unescape(u))})
    manifest=json.loads((DATA/'source_manifest.json').read_text(encoding='utf-8'))
    if any(e['exam']==exam for e in manifest): raise ValueError('Exam already recorded')
    manifest.append({'exam':exam,'year':exam+1911,'documents':docs})
    (DATA/'source_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    collect(exam)

if __name__=='__main__': discover(int(sys.argv[1]))
