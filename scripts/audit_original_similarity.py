"""Flag similar stems for editorial review; similarity is not a correctness decision."""
import json,re
from pathlib import Path
from difflib import SequenceMatcher
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/original/seed-20.json').read_text(encoding='utf-8'))
for path in (ROOT/'data/original').glob('*.json'):
 if path.name.startswith('seed-'):continue
 data=json.loads(path.read_text(encoding='utf-8'))
 if isinstance(data,dict) and isinstance(data.get('questions'),list):rows.extend(data['questions'])
normalized=[re.sub(r'\s+|[、。〈〉「」『』]','',q['question']) for q in rows]
grams=[{s[i:i+3] for i in range(len(s)-2)} for s in normalized]
similar=[]
for i,a in enumerate(rows):
 for j in range(i+1,len(rows)):
  overlap=len(grams[i]&grams[j])/max(1,len(grams[i]|grams[j]))
  if overlap<.35:continue
  ratio=SequenceMatcher(None,normalized[i],normalized[j]).ratio()
  if ratio>=.65:similar.append({'ids':[a['id'],rows[j]['id']],'ratio':round(ratio,3),'questions':[a['question'],rows[j]['question']]})
result={'total':len(rows),'review_pairs':sorted(similar,key=lambda x:-x['ratio'])}
(ROOT/'data/original-similarity-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
