import json,sys
sys.stdout.reconfigure(encoding='utf-8')
seen=set()
for q in json.load(open('data/additional_questions.json',encoding='utf-8')):
 if str(q['exam'])!=sys.argv[1] or q['session']!=sys.argv[2]:continue
 case=q['case_text'] or ''
 if case and case not in seen: print('CASE',q['case_id'],' '.join(case.split()));seen.add(case)
 print(q['number'],' '.join(q['question'].split()),'|',' / '.join(' '.join(x.split()) for x in q['choices']))
