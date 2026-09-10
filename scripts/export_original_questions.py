"""Validate and publish independently authored original questions, preserving seed IDs."""
import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
DIRECTORY=ROOT/'data/original'
FIELDS={
 'anatomy':('人体の構造と機能','ANA'), 'fundamentals':('基礎看護学','FND'),
 'adult':('成人看護学','ADL'), 'gerontology':('老年看護学','GER'),
 'pediatric':('小児看護学','PED'), 'maternity':('母性看護学','MAT'),
 'psychiatric':('精神看護学','PSY'), 'community':('地域・在宅看護論','COM'),
 'integration':('看護の統合と実践','INT')}
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def build(complete=False,check_only=False):
 rows=read(DIRECTORY/'seed-20.json')
 seed_review=read(DIRECTORY/'seed-review.json')
 sources=dict(seed_review['sources'])
 effects=read(DIRECTORY/'seed-effects.json')
 seed_ids={r['id'] for r in rows}
 for filename,(category,prefix) in FIELDS.items():
  path=DIRECTORY/(filename+'.json')
  if not path.exists():continue
  package=read(path)
  assert package['category']==category,path
  for key,source in package['sources'].items():
   assert key not in sources or sources[key]==source,f'Source collision: {key}'
   assert source.get('title') and source.get('checked_at') and source.get('url','').startswith('https://'),key
   sources[key]=source
  for q in package['questions']:
   assert q['category']==category and re.fullmatch(f'ORG-{prefix}-[0-9]{{3}}',q['id']),q['id']
   assert q.get('review_status')=='checked' and q.get('review_note'),f'Unreviewed {q["id"]}'
   assert q.get('reference_keys') or ('計算' in q['review_note'] or '算術' in q['review_note']),f'No evidence {q["id"]}'
  rows.extend(package['questions'])
 ids=set();stems=set();warnings=[]
 official_stems={re.sub(r'\s+','',q['question']) for f in ('questions.json','additional_questions.json') for q in read(ROOT/'data'/f)}
 css='\n'.join(path.read_text(encoding='utf-8-sig') for path in ROOT.glob('*.css'))
 dynamic_effects=set(re.findall(r"'((?:affected|sim)-[a-z-]+)':",(ROOT/'projection.js').read_text(encoding='utf-8')))
 categories=Counter();answers=Counter();topics=Counter();game=[]
 for q in rows:
  identifier=q['id'];assert identifier not in ids,f'Duplicate ID {identifier}';ids.add(identifier)
  assert q['category'] in {x[0] for x in FIELDS.values()},identifier
  stem=re.sub(r'\s+','',q['question']);assert stem not in stems,f'Duplicate question {identifier}';stems.add(stem)
  assert stem not in official_stems,f'Official stem reused: {identifier}'
  assert len(q['choices'])==len(q['notes'])==4 and len(set(q['choices']))==4,identifier
  assert all(isinstance(c,str) and c.strip() for c in q['choices']),identifier
  assert all(isinstance(n,str) and len(n.strip())>=10 for n in q['notes']),identifier
  assert len(set(q['notes']))==4,f'Repeated option explanations: {identifier}'
  assert type(q['answer']) is int and 1<=q['answer']<=4,identifier
  assert all(k in sources for k in q['reference_keys']),f'Unknown source {identifier}'
  assert not any(re.search(r'https?://',s) for s in [q['question'],*q['choices'],*q['notes']]),identifier
  assert not any(re.search(r'&#(?:x[0-9a-fA-F]+|[0-9]+);|&nbsp;|\ufffd',s) for s in [q['question'],*q['choices'],*q['notes']]),f'Encoding artifact: {identifier}'
  categories[q['category']]+=1;answers[q['answer']]+=1;topics[(q['category'],q['topic'])]+=1
  effect=dict(name='学習負荷',detail='誤答によるゲーム内の負荷です。実際の症状を表すものではありません。',damage=10,pulse=0,spo2=0,focus=5,className='')
  effect.update(effects.get(identifier,q.get('effect',{})))
  if effect.get('disease'):
   assert effect.get('name') and effect.get('detail') and effect.get('avatarClasses'),identifier
   assert all(re.fullmatch(r'(affected|sim)-[a-z-]+',name) and ('.'+name in css or name in dynamic_effects) for name in effect['avatarClasses'].split()),f'Unknown effect: {identifier}'
  source=f'RE:CARE オリジナル 第1集 · 第{int(identifier[-3:])}問' if identifier in seed_ids else f'RE:CARE オリジナル · {q["category"]} {int(identifier[-3:]):03}'
  game.append(dict(id=identifier,category=q['category'],topic=q['topic'],question=q['question'],choices=q['choices'],notes=q['notes'],questionType=q.get('questionType','一般問題'),official=False,source=source,scenario=q['category']+' / '+q['topic'],acceptedAnswerSets=[[q['answer']-1]],explanation='',hasExplanation=True,explanationNeedsReview=False,effect=effect))
 assert all(n<=100 for n in categories.values()),dict(categories)
 if complete:assert len(rows)==900 and all(categories[c]==100 for c,_ in FIELDS.values()),dict(categories)
 report=dict(total=len(rows),target=900,by_category=dict(categories),answer_distribution=dict(answers),unique_topics=len(topics),explanations=sum(len(q['notes']) for q in rows),complete=len(rows)==900,method='独自執筆・AIによる資料照合。医療専門職の監修なし。',warnings=warnings)
 if not check_only:
  def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  write(ROOT/'data/original_questions.json',rows)
  write(ROOT/'data/original-question-review.json',dict(reviewed_at=str(date.today()),method=report['method'],sources=sources,questions=[{k:q[k] for k in ('id','reference_keys','review_status','review_note') if k in q} for q in rows]))
  write(ROOT/'data/original-question-report.json',report)
  (ROOT/'original-questions.js').write_text('window.ORIGINAL_BANK='+json.dumps(game,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
  docs=['# RE:CARE オリジナル問題一覧',f'全{len(rows)}問。独自作成・AI資料照合。医療専門職の監修なし。','']
  for category,_ in FIELDS.values():
   docs.extend([f'## {category}（{categories[category]}問）',''])
   for q in [q for q in rows if q['category']==category]:
    docs.extend([f'### {q["id"]}｜{q["topic"]}','',q['question'],'',*[f'{i}. {c}' for i,c in enumerate(q['choices'],1)],'',f'**正答：{q["answer"]}**','',*[f'- 選択肢{i}：{n}' for i,n in enumerate(q['notes'],1)],''])
  (ROOT/'data/original-questions-all.md').write_text('\n'.join(docs),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False))
 return game,report
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--require-complete',action='store_true');parser.add_argument('--check-only',action='store_true');args=parser.parse_args();build(args.require_complete or not args.check_only,args.check_only)
