"""User-specified classification schema, independent of PDF extraction format."""
CATEGORIES = ['人体の構造と機能','疾病の成り立ちと回復の促進','健康支援と社会保障制度','基礎看護学','成人看護学','老年看護学','小児看護学','母性看護学','精神看護学','地域・在宅看護論','看護の統合と実践']
TYPES = {'必修':'必修問題','一般':'一般問題','状況設定':'状況設定問題'}

def normalize(records):
    by_id = {q['id']:q for q in records}
    # Use extracted shared-case boundaries, never assume that every three items form a case.
    boundaries = {}
    for q in records:
        if q.get('case_text'):
            start = min([q['number']] + [int(i.rsplit('-',1)[1]) for i in q.get('preceding_context_ids',[])])
            boundaries.setdefault((q['exam'],q['session']),set()).add(start)
    groups = {key:{start:i+1 for i,start in enumerate(sorted(starts))} for key,starts in boundaries.items()}
    for q in records:
        q['question_type'] = TYPES.get(q['question_type'],q['question_type'])
        q['question'] = q['question_stem']
        q['preceding_context'] = [{'id':i,'question':by_id[i]['question_stem']} for i in q.get('preceding_context_ids',[]) if i in by_id]
        q['case_id'] = None
        if q.get('case_text'):
            start = min([q['number']] + [int(i.rsplit('-',1)[1]) for i in q.get('preceding_context_ids',[])])
            q['case_id'] = f"{q['exam']}-{q['session']}-CASE-{groups[(q['exam'],q['session'])][start]:02}"
        else:
            q['case_text'] = None
        q['classification_confidence'] = None  # No calibrated numeric confidence has been assessed.
        q['classification_status'] = 'classified_unofficial' if q.get('category') in CATEGORIES else 'pending_review'
        q['classification_source'] = None  # No item-level match against official criteria has been verified.
        if q.get('category') not in CATEGORIES:
            if q.get('category') is not None:
                q['review_reasons'].append('指定11科目以外の分類を要確認')
            q['category'] = q['subcategory'] = q['topic'] = None
            q['review_reasons'].append('科目分類が未確認')
        if q['question_type']=='状況設定問題' and not q['case_id']:
            q['review_reasons'].append('共通症例の範囲と本文を要確認')
        q['review_reasons'] = list(dict.fromkeys(q['review_reasons']))
        q['needs_review'] = bool(q['review_reasons'])
        if q['needs_review'] and q['dataset_status']=='adopted':
            q['dataset_status']='pending_review'
    return records
