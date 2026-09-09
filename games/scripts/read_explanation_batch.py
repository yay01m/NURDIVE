"""Read only the requested range, including case context and fixed official answers."""
import json,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parents[1]
exam,session,start,end=sys.argv[1:]
seen=set()
for q in json.loads((root/'data/additional_questions.json').read_text(encoding='utf-8')):
    if str(q['exam'])!=exam or q['session']!=session or not int(start)<=q['number']<=int(end):continue
    if q['case_text'] and q['case_id'] not in seen:
        print('CASE',q['case_id'],' '.join(q['case_text'].split()));seen.add(q['case_id'])
    for prior in q.get('preceding_context',[]):
        if prior['id'] not in seen:print('PRIOR',prior['id'],' '.join(prior['question'].split()));seen.add(prior['id'])
    print(q['id'],' '.join(q['question'].split()),'正答',q['accepted_answer_sets'])
    print(' / '.join(f'{i}:{" ".join(c.split())}' for i,c in enumerate(q['choices'],1)))
    seen.add(q['id'])
