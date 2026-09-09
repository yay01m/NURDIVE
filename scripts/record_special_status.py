"""Read explicit MHLW disposition notices. Never derive an answer by solving a question."""
import json
import re
import unicodedata
from build_official import DATA,dump

manifest=json.loads((DATA/'source_manifest.json').read_text(encoding='utf-8'))
notices={}
for entry in manifest:
    for d in entry['documents']:
        if d['role']!='special': continue
        p=DATA/'sources'/str(entry['exam'])/d['filename'].replace('.pdf','.pages.json')
        raw='\n'.join(x['text'] for x in json.loads(p.read_text(encoding='utf-8')))
        s=re.sub(r'\s','',unicodedata.normalize('NFKC',raw))
        if not s and entry['exam']==110:
            # Transcribed after visual inspection of the original notice (image-only PDF).
            n=86 if d['filename']=='special_01.pdf' else 114
            session='AM' if n==86 else 'PM'
            status='複数正答組合せ' if n==86 else '複数正答'
            raw='3通りの解答を正解として採点する。3つの選択肢が正解であるため。' if n==86 else '採点上の取り扱い：複数の正解があるため。'
        else:
            m=re.search(r'(午前|午後)第(\d+)問',s)
            if not m: raise ValueError('Notice question number not found: '+str(p))
            session='AM' if m[1]=='午前' else 'PM'; n=int(m[2])
            status='条件付き採点除外' if '正解した受験者' in s else '採点除外' if re.search(r'採点対象から除外する',s) else '複数正答組合せ' if '通りの解答' in s else '複数正答' if '複数' in s else '要確認'
        key=f"{entry['exam']}-{session}-{n:03}"
        assert key not in notices
        notices[key]={'status':status,'url':d['url'],'page':1,'official_text':raw,'source_sha256':d['sha256']}
dump(DATA/'special_status_manifest.json',notices)
print('Official notices recorded:',len(notices))
