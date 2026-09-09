"""Keep official input immutable; publish all explanations with review flags."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
raw=(DATA/'questions.json').read_bytes()
questions=json.loads(raw)
drafts=json.loads((DATA/'work/explanation-drafts.json').read_text(encoding='utf-8'))
candidates={}
for path in sorted((DATA/'work').glob('explanation-candidates-*.json')):
    batch=json.loads(path.read_text(encoding='utf-8'))
    assert not (set(batch) & (set(candidates) | set(drafts))), 'Duplicate explanation'
    candidates.update(batch)
assert set(drafts) | set(candidates) == {q['id'] for q in questions}
previous=json.loads((DATA/'explanation_report.json').read_text(encoding='utf-8'))
reviews=json.loads((DATA/'work/explanation-verification.json').read_text(encoding='utf-8'))
quality=json.loads((DATA/'explanation_validation.json').read_text(encoding='utf-8'))
quality_anchors=json.loads((DATA/'work/quality-validation-anchors.json').read_text(encoding='utf-8'))
final_reviews={r['id']:r for r in json.loads((DATA/'explanation_final_validation.json').read_text(encoding='utf-8'))}
final_anchors=json.loads((DATA/'work/final-quality-anchors.json').read_text(encoding='utf-8'))
assert set(quality)=={q['id'] for q in questions}
assert set(final_reviews)=={qid for qid,r in quality.items() if r['result']=='REVIEW'}
def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
assert previous['input_sha256']==hashlib.sha256(raw).hexdigest(), 'Official input changed'

def write(path,value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def anchor(q):
    return {key:q.get(key) for key in ['id','exam','year','session','number','question','choices','correct_answers','accepted_answer_sets','case_id','case_text','preceding_context']}

inputs=[]
output=[]
audit={}
published=[]
special_reasons={
 '115-AM-006':['欧文併記が日本語の設問途中に入り込んでいる。抽出順序を原本と再照合するまで解説案は要確認。'],
 '115-AM-011':['リンパ液にも凝固に関連する成分が含まれ得るため、選択肢の説明で「止血機構が全くない」と断定しない。設問の意図と説明範囲の専門的確認が必要。'],
 '115-AM-026':['細胞外カルシウムの選択肢を、短期の収縮機構と長期の細胞機能を混同せず説明するため、専門的確認が必要。'],
 '115-AM-029':['公式正答は1で固定。Dダイマー高値だけでは肺血栓塞栓症を確定できないため、「確定診断」という設問表現との関係を原本・公式資料と専門家で確認する必要がある。無理に正答を正当化する解説は生成しない。'],
 '115-AM-080':['公式には4または5の一方を許容する問題。両方を同時選択する問題と区別し、各選択肢の医学的説明を確認が必要。']
}
for q in questions:
    rows=json.loads((DATA/'sources'/str(q['exam'])/'answer_rows.json').read_text(encoding='utf-8'))
    row=rows[('A' if q['session']=='AM' else 'B')+f"{q['number']:03}"]
    assert row['cells']==q['official_answer_cells']
    item={k:q.get(k) for k in ['id','exam','year','question_type','category','subcategory','case_text','question','choices']}
    item.update(official_answer=q['correct_answers'],accepted_answer_sets=q['accepted_answer_sets'],preceding_context=q.get('preceding_context',[]))
    inputs.append(item)
    d=drafts.get(q['id'])
    verified=d is not None
    reasons=[] if verified else ['解説案作成済み。出典と各選択肢の医学的・制度的整合性は未検証。'] + special_reasons.get(q['id'],[])
    if not verified:
        candidate=candidates[q['id']]
        d={'explanation':candidate[0],'key_point':candidate[1],'choices':candidate[2:],'confidence':0.0,'sources':[]}
        review=reviews[q['id']]
        assert review['input_sha256']==digest(q), 'Reviewed input changed: '+q['id']
        assert review['explanation_sha256']==digest(candidate), 'Reviewed explanation changed: '+q['id']
        verified=review['status']=='approved'
        d['confidence']=review['confidence']
        d['sources']=[(s['title'],s['url']) for s in review['sources']]
        reasons=[] if verified else review['notes']+special_reasons.get(q['id'],[])
    if d and d['confidence']<0.90:reasons.append('解説確信度が0.90未満')
    if d and (q['requires_image'] or q['needs_review']):reasons.append('入力問題に要確認事項がある')
    # User's three-point quality decision supersedes the old evidence/10-check gate.
    decision=quality[q['id']]
    assert set(decision)=={'result','reason'}
    assert decision['result'] in ('PASS','REVIEW')
    assert bool(decision['reason'])==(decision['result']=='REVIEW')
    assert quality_anchors[q['id']]['input_sha256']==digest(q), 'Quality input changed: '+q['id']
    assert quality_anchors[q['id']]['explanation_sha256']==digest({'explanation':d['explanation'],'key_point':d['key_point']}), 'Quality explanation changed: '+q['id']
    reasons=[decision['reason']] if decision['result']=='REVIEW' else []
    final=final_reviews.get(q['id'])
    rejected=False
    if final:
        fa=final_anchors[q['id']]
        assert fa['input_sha256']==digest(q)
        assert fa['previous_explanation_sha256']==digest({'explanation':d['explanation'],'key_point':d['key_point']})
        assert fa['result_sha256']==digest(final)
        assert final['official_answer_verified'] is True
        assert final['result'] in ('PASS','FIX','REJECT')
        rejected=final['result']=='REJECT'
        reasons=final['issues_found'] if rejected else []
        d={**d,'explanation':final['explanation']}
    e={'id':q['id'],'official_answer':list(q['correct_answers']),
       'explanation':d['explanation'] if d else '',
       'choice_explanations':[{'choice':i+1,'correct':i+1 in q['correct_answers'],'explanation':d['choices'][i] if d else ''} for i in range(len(q['choices']))],
       'key_point':d['key_point'] if d else '', 'needs_review':bool(reasons),
       'review_reasons':reasons,'confidence':d['confidence'] if d else 0.0}
    assert e['official_answer']==item['official_answer']
    if d:
        assert len(d['choices'])==len(q['choices'])
        assert all(c['explanation'] for c in e['choice_explanations'])
        assert e['explanation'] and e['key_point']
        if verified: assert d['sources']
    output.append(e)
    audit[q['id']]={'status':'ai_checked' if d and not reasons else 'draft_requires_verification',
        'sources':[{'title':title,'url':url} for title,url in d['sources']] if d else [],
        'input_anchor':anchor(q),'official_answer_source':q['answer_source'],
        'checks':{f'CHECK {i}':('pass' if i==1 or not reasons else 'pending_verification') for i in range(1,11)},
        'confidence_note':'AIによる自己評価。統計的に校正された正確率ではない。' if verified else '確信度は未評価のため0。解説案は作成済み。0は解説内容の誤り確率を表さない。',
        'year_note':'出題年に依存する法律・数値・治療推奨の新規追加はしていない。基礎知識の説明。' if verified else '出題年度との照合が必要。'}
    if q['id']=='115-AM-029':
        audit[q['id']]['checks']['CHECK 2']='review_required'
        audit[q['id']]['sources']=[{'title':'MSD Manual：肺塞栓症の診断（Dダイマーだけでは確定できない）','url':'https://www.msdmanuals.com/home/lung-and-airway-disorders/pulmonary-embolism/pulmonary-embolism-pe?ruleredirectid=742'}]
    if q['id'] in reviews:
        audit[q['id']]['verification']=reviews[q['id']]
    audit[q['id']]['quality_validation']=decision
    audit[q['id']]['sources']+=quality_anchors[q['id']].get('sources',[])
    audit[q['id']]['checks']={'scope':['公式正答との矛盾','重大な医学的誤り','複数正答・情報不足など重大な疑義'],'result':decision['result']}
    audit[q['id']]['confidence_note']='旧方式の参考情報。現在のPASS/REVIEWは指定された3点で判定し、出典未照合や表現だけではREVIEWにしない。'
    audit[q['id']]['year_note']='出題時点の問題・公式正答を維持。制度情報の網羅的な現行化は今回の検証対象外。'
    if final:
        audit[q['id']]['final_validation']=final
        audit[q['id']]['status']='rejected' if rejected else 'final_fixed' if final['result']=='FIX' else 'final_pass'
        audit[q['id']]['sources']=[{'title':s['title'],'url':s['url']} for s in final['sources']]
    if d and not rejected:
        published.append({'id':q['id'],'record':{k:e[k] for k in ['explanation','key_point','needs_review']},'verification_status':('review_required' if e['needs_review'] else 'ai_checked'),'input_anchor':anchor(q),'sources':audit[q['id']]['sources']})

assert len(output)==len(questions) and len({e['id'] for e in output})==len(output)
write(DATA/'explanation_inputs.json',inputs)
compact={e['id']:{k:e[k] for k in ['explanation','key_point','needs_review']} for e in output}
for qid,e in compact.items():
    assert 0<len(e['explanation'])<=150, 'Explanation length: '+qid
    assert 0<len(e['key_point'])<=80, 'Key point length: '+qid
write(DATA/'explanations.json',compact)
write(DATA/'explanation_audit.json',audit)
write(DATA/'explanation_report.json',{'status':'final_review_complete','final_reviewed':len(final_reviews),'final_fixed':sum(r['result']=='FIX' for r in final_reviews.values()),'rejected':sum(r['result']=='REJECT' for r in final_reviews.values()),'displayed_review':sum(p['record']['needs_review'] for p in published),'validation_scope':'公式正答との矛盾・重大な医学的誤り・重大な疑義のみ。文章表現は評価しない。','written':len(output),'unwritten':0,'verification_pending':0,'total':len(output),'displayable':len(published),'pass':sum(not e['needs_review'] for e in output),'review':sum(e['needs_review'] for e in output),'text_reviewed':len(output),'evidence_pending':sum(r['status']=='evidence_pending' for r in reviews.values()),'evidence_note':'旧方式の出典照合状況。3点検証の未着手件数ではない。','individual_review_required':sum(e['needs_review'] for e in output),'input_sha256':hashlib.sha256(raw).hexdigest(),'official_input_unchanged':True,'human_reviewed':False})
(ROOT/'explanations.js').write_text('// Generated by scripts/build_explanations.py. Only displayable explanations.\nwindow.RECARE_EXPLANATIONS='+json.dumps(published,ensure_ascii=False,separators=(',',':'))+';\nwindow.RECARE_REJECTED_QUESTION_IDS='+json.dumps([qid for qid,r in final_reviews.items() if r['result']=='REJECT'])+';\n',encoding='utf-8')
assert raw==(DATA/'questions.json').read_bytes(),'Official questions were modified'
print(f'{len(output)} drafts written; 0 unwritten; {len(published)} explanations displayable; {sum(e['needs_review'] for e in output)} REVIEW; official input unchanged')

# Keep the current choice-based publication when rebuilding historical short data.
import runpy
runpy.run_path(str(ROOT/'scripts/build_choice_explanations.py'),run_name='__main__')
