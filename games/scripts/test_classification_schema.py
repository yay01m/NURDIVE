"""Check separation of item type, subject, shared case and per-item text."""
import json
from pathlib import Path
from collections import defaultdict
from classification_schema import CATEGORIES

root=Path(__file__).resolve().parents[1]
records=json.loads((root/'data/all_questions.json').read_text(encoding='utf-8'))
assert len(records)==2400
groups=defaultdict(list)
for q in records:
    assert q['question_type'] in ('必修問題','一般問題','状況設定問題')
    assert q['category'] in CATEGORIES or (q['category'] is None and q['needs_review'])
    assert q['question']==q['question_stem']
    assert q['classification_confidence'] is None or 0<=q['classification_confidence']<=1
    if q['case_id']:
        assert q['case_text']
        groups[q['case_id']].append(q)
        assert len(q['preceding_context'])==len(q['preceding_context_ids'])
    else:
        assert q['case_text'] is None
        if q['question_type']=='状況設定問題':assert q['needs_review']
for key,items in groups.items():
    assert len({q['case_text'] for q in items})==1,key
    assert len({(q['exam'],q['session']) for q in items})==1,key
for session in ('AM','PM'):
    for start in range(91,121,3):
        items=[q for q in records if q['exam']==115 and q['session']==session and start<=q['number']<start+3]
        assert len(items)==3 and len({q['case_id'] for q in items})==1
cats=json.loads((root/'data/categories.json').read_text(encoding='utf-8'))
assert [c['name'] for c in cats['categories']]==CATEGORIES
print(f'PASS: {len(records)} records; {len(groups)} extracted shared-case groups; exactly 11 subjects')
