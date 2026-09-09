"""Regression checks for source corruption, without re-solving exam questions."""
import hashlib
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
records=read('data/questions.json')+read('data/additional_questions.json')
by_id={q['id']:q for q in records}
assert len(records)==len(by_id)==1125
def text(identifier):
    q=by_id[identifier]
    return '\n'.join([q['question'],q['case_text'] or '',*q['choices']])
for identifier, expected in {
    '111-AM-034':['WHO'], '111-AM-073':['疼痛'],
    '111-PM-017':['末梢'], '111-PM-116':['疼痛','×'],
    '112-AM-094':['尿蛋白(−)','尿潜血(−)'],
    '112-PM-091':['対光反射(+)','瞳孔不同(−)','尿ケト'],
    '113-AM-041':['NRS','VAS','VRS'],
    '113-PM-100':['全身倦怠感'],
    '114-PM-108':['尿蛋白+','赤血球(−)','白血球2+'],
}.items():
    for fragment in expected:assert fragment in text(identifier),(identifier,fragment)
for q in records:
    value=json.dumps({k:q.get(k) for k in ['question','choices','case_text','preceding_context']},ensure_ascii=False)
    assert not re.search(r'\(cid:|�|[ŁŒƒ]|[\ue000-\uf8ff]|[\U000f0000-\U0010ffff]|腿HO|痰痛',value),q['id']
report=read('data/work/font-recovery-report.json')
old=report['previous_classification_anchors']
current=read('data/classification/input-anchors.json')
for identifier,digest in old['sha256_by_id'].items():
    q={f:by_id[identifier].get(f) for f in old['fields']}
    assert hashlib.sha256(json.dumps(q,ensure_ascii=False,sort_keys=True).encode()).hexdigest()==current['sha256_by_id'][identifier]
    for change in report['changes']:
        if change['id']==identifier:q[change['field']]=change['before']
    assert hashlib.sha256(json.dumps(q,ensure_ascii=False,sort_keys=True).encode()).hexdigest()==digest,identifier
assert hashlib.sha256((ROOT/'data/questions.json').read_bytes()).hexdigest()=='1d4c906d807332123f14935d809048240e689919db065285af29ecf341ffb0ae'
print('PASS: 1125 records; restored text; original 228 unchanged; protected source/answer fields preserved')
