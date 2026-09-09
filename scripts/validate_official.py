"""Publish only reviewed, structurally valid records. All remaining records stay visible."""
import collections
import csv
import hashlib
import json
from pathlib import Path
import re
import sys
from build_official import DATA, dump
from classification_schema import normalize, CATEGORIES

def review(exam):
    records = json.loads((DATA/'work'/f'{exam}.json').read_text(encoding='utf-8'))
    review_path = DATA/'work'/f'{exam}-review.json'
    reviewed = review_path.exists()
    notes = json.loads(review_path.read_text(encoding='utf-8')) if reviewed else {}
    cp = DATA/'work'/f'{exam}-classification.tsv'
    classes = {}
    sp=DATA/'special_status_manifest.json'
    special_notices=json.loads(sp.read_text(encoding='utf-8')) if sp.exists() else {}
    ip=DATA/'work'/'image-review.json'
    image_notes=json.loads(ip.read_text(encoding='utf-8')) if ip.exists() else {}
    if cp.exists():
        with cp.open(encoding='utf-8',newline='') as f:
            rows = list(csv.DictReader(f,delimiter='\t'))
        classes = {r['id']:r for r in rows}
        assert len(classes)==len(rows)
    for q in records:
        q['image_review_status']='text_reviewed' if reviewed else 'automatic_detection_requires_review'
        if q['id'] in image_notes:
            q['requires_image']=True
            q['excluded']=True
            q['exclusion_reason']=image_notes[q['id']]['reason']
            q['image_review_status']='visually_confirmed'
        if q['id'] in special_notices:
            q['special_status']=special_notices[q['id']]['status']
            q['special_source']=special_notices[q['id']]
            if q['special_status']=='採点除外':
                q['review_reasons']=[r for r in q['review_reasons'] if r!='公式正答欄が空欄']
        if q['id'] in classes:
            for key in ('category','subcategory','topic'): q[key]=classes[q['id']][key]
            q['classification_method']='本文・選択肢・症例文の意味内容を読んだ個別分類（AI、非公式）'
        if reviewed:
            for correction in notes.get('reading_order_corrections',[]):
                for key in ('question','question_stem','case_text'):
                    if q[key] and correction['before'] in q[key]:
                        q[key]=q[key].replace(correction['before'],correction['after'])
                        q.setdefault('transcription_notes',[]).append(correction)
                for i,c in enumerate(q['choices']):
                    if correction['before'] in c:
                        q['choices'][i]=c.replace(correction['before'],correction['after'])
                        q.setdefault('transcription_notes',[]).append(correction)
            for cid, correction in notes.get('glyph_transcriptions',{}).items():
                before = f'(cid:{cid})'
                for key in ('question','question_stem','case_text'):
                    if q[key] and before in q[key]:
                        q[key]=q[key].replace(before,correction['text'])
                        q.setdefault('transcription_notes',[]).append(correction)
                for i,c in enumerate(q['choices']):
                    if before in c:
                        q['choices'][i]=c.replace(before,correction['text'])
                        q.setdefault('transcription_notes',[]).append(correction)
            if not re.search(r'\(cid:|�',q['question']+''.join(q['choices'])):
                q['review_reasons']=[r for r in q['review_reasons'] if r!='PDF文字の未解決グリフ']
            if q['id'] in classes:
                q['review_reasons']=[r for r in q['review_reasons'] if r!='分野分類・原本照合の未実施']
            # Do not silently fix PDF extraction reading-order defects.
            if re.search(r'[A-Za-z]〈[a-z]',q['question']+''.join(q['choices'])):
                q['review_reasons'].append('欧文併記の文字順序を原本で要確認')
            q['review_reasons'].extend(notes.get('manual_review_reasons',{}).get(q['id'],[]))
            if q['id'] in notes.get('special',{}):
                special=notes['special'][q['id']]
                q['special_status']=special['status']
                q['special_source']=special
                if special['status']=='採点除外':
                    q['review_reasons']=[r for r in q['review_reasons'] if r!='公式正答欄が空欄']
        q['needs_review']=bool(q['review_reasons'])
        # Official erratum takes precedence; retain the raw extracted record in work/.
        if q['id']=='112-PM-026':
            old=q['choices'][0]
            if '僧房弁' in old:
                q['choices'][0]=old.replace('僧房弁','僧帽弁')
            elif '僧帽弁' not in old:
                q['review_reasons'].append('正誤表の訂正対象文字列の抽出を要確認')
                q['needs_review']=True
            errata_entry=next(e for e in json.loads((DATA/'source_manifest.json').read_text(encoding='utf-8')) if e['exam']==112)
            es=next(d for d in errata_entry['documents'] if d['role']=='errata')
            q['errata']={'url':es['url'],'page':1,'choice_number':1,'before':'僧房弁は開いている。','after':'僧帽弁は開いている。','applied':'僧帽弁' in q['choices'][0]}
        q['dataset_status']='excluded_image' if q['requires_image'] else 'withheld_special' if q['special_status'] in ('採点除外','条件付き採点除外') else 'pending_review' if q['needs_review'] else 'adopted'
    return normalize(records)

def validate(records,manifest):
    checks = {k:[] for k in ['duplicate_ids','duplicate_numbers','missing_numbers','empty_question','empty_choices','missing_answers','out_of_range_answers','session_mismatch','answer_table_mismatch','source_hash_mismatch','context_mismatch','answer_format_mismatch']}
    for key,count in collections.Counter(q['id'] for q in records).items():
        if count>1: checks['duplicate_ids'].append(key)
    for key,count in collections.Counter((q['exam'],q['session'],q['number']) for q in records).items():
        if count>1: checks['duplicate_numbers'].append(key)
    for exam in sorted({q['exam'] for q in records},reverse=True):
        entry=next(e for e in manifest if e['exam']==exam)
        answer_rows=json.loads((DATA/'sources'/str(exam)/'answer_rows.json').read_text(encoding='utf-8'))
        for source in entry['documents']:
            path=DATA/'sources'/str(exam)/source['filename']
            if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']: checks['source_hash_mismatch'].append(str(path))
        for session in ('AM','PM'):
            seen={q['number'] for q in records if q['exam']==exam and q['session']==session}
            checks['missing_numbers'].extend(f'{exam}-{session}-{n:03}' for n in range(1,121) if n not in seen)
        for q in (q for q in records if q['exam']==exam):
            if not q['question']: checks['empty_question'].append(q['id'])
            if not q['choices']: checks['empty_choices'].append(q['id'])
            if not q['correct_answers'] and q['correct_answer_value'] is None: checks['missing_answers'].append(q['id'])
            if any(a<1 or a>len(q['choices']) for a in q['correct_answers']): checks['out_of_range_answers'].append(q['id'])
            key=('A' if q['session']=='AM' else 'B')+f"{q['number']:03}"
            if answer_rows[key]['row_id']!=q['answer_source']['row_id'] or q['source']['session']!=('午前' if q['session']=='AM' else '午後'): checks['session_mismatch'].append(q['id'])
            if q['official_answer_cells']!=answer_rows[key]['cells']: checks['answer_table_mismatch'].append(q['id'])
            if q['question_type']=='状況設定問題' and not q['case_text']: checks['context_mismatch'].append(q['id'])
            count=re.search(r'([2-5２-５])\s*つ選べ',q['question_stem'])
            expected=int(count[1]) if count else 1
            if q['answer_format']!='numeric' and any(len(a)!=expected for a in q['accepted_answer_sets']): checks['answer_format_mismatch'].append(q['id'])
    return checks

def main():
    manifest=json.loads((DATA/'source_manifest.json').read_text(encoding='utf-8'))
    records=[]
    for p in sorted((DATA/'work').glob('*.json'),reverse=True):
        if p.stem.isdigit(): records.extend(review(int(p.stem)))
    records.sort(key=lambda q:(-q['exam'],q['session'],q['number']))
    groups={s:[q for q in records if q['dataset_status']==s] for s in ['adopted','excluded_image','withheld_special','pending_review']}
    checks=validate(records,manifest)
    adopted_ids={q['id'] for q in groups['adopted']}
    adopted_errors={k:[i for i in ids if i in adopted_ids] for k,ids in checks.items()}
    assert not any(adopted_errors.values()),adopted_errors
    for status,name in [('adopted','questions'),('excluded_image','excluded_questions'),('withheld_special','special_questions'),('pending_review','review_questions')]: dump(DATA/(name+'.json'),groups[status])
    dump(DATA/'all_questions.json',records)
    yearly=[]
    for exam in range(115,105,-1):
        qs=[q for q in records if q['exam']==exam]
        yearly.append({'exam':exam,'year':exam+1911,'status':'processed_with_pending_review' if qs else 'not_processed','expected':240,
            'AM':sum(q['session']=='AM' for q in qs),'PM':sum(q['session']=='PM' for q in qs),'total':len(qs),
            'text_only':sum(not q['requires_image'] for q in qs),'image_excluded':sum(q['requires_image'] for q in qs),
            'adopted':sum(q['dataset_status']=='adopted' for q in qs),'withheld_special':sum(q['dataset_status']=='withheld_special' for q in qs),
            'pending_review':sum(q['dataset_status']=='pending_review' for q in qs),'needs_review':sum(q['needs_review'] for q in qs),
            'answer_rows_matched':len(qs),'answers_obtained':sum(bool(q['correct_answers']) or q['correct_answer_value'] is not None for q in qs),
            'answers_unconfirmed':sum(not q['correct_answers'] and q['correct_answer_value'] is None and q['special_status']!='採点除外' for q in qs),
            'official_no_answer':sum(q['special_status']=='採点除外' for q in qs),
            'classified':sum(bool(q['category']) and bool(q['subcategory']) and bool(q['topic']) for q in qs)})
    report={'status':'incomplete','target_total':2400,'processed_total':len(records),'not_processed':2400-len(records),'adopted_total':len(groups['adopted']),
            'excluded_total':len(groups['excluded_image']),'needs_review_total':sum(q['needs_review'] for q in records),
            'answer_rows_matched':len(records),'classification_completed':sum(bool(q['category']) for q in records),
            'yearly':yearly,'checks':checks,'adopted_checks_pass':True,
            'limitations':['needs_reviewは画像除外等と重複する。合計はdataset_statusで集計する。','未処理年度は0問の完成年度ではない。','抽出済み本文の全ページ画像照合は未完了。','RE:CAREには採用済み228問を反映。未確認の問題は出題しない。']}
    dump(DATA/'validation_report.json',report)
    categories=CATEGORIES
    dump(DATA/'categories.json',{'classification':'非公式の学習内容分類。必修はquestion_typeで管理し、categoryには内容分野を設定。','categories':[{'name':c,'subcategories':[{'name':s,'topics':sorted({q['topic'] for q in records if q['category']==c and q['subcategory']==s})} for s in sorted({q['subcategory'] for q in records if q['category']==c})]} for c in categories]})
    # CSV is a flat audit export, not a workbook. JSON arrays remain JSON in each cell.
    fields=['id','exam','year','session','number','dataset_status','question_type','category','subcategory','topic','classification_confidence','classification_status','case_id','case_text','preceding_context_ids','question','choices','correct_answers','accepted_answer_sets','correct_answer_value','special_status','requires_image','excluded','exclusion_reason','needs_review','review_reasons','question_url','question_pages','answer_url','answer_page']
    with (DATA/'questions.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
        for q in records:
            row={k:q.get(k) for k in fields}
            row.update(question_url=q['source']['url'],question_pages=q['source']['pages'],answer_url=q['answer_source']['url'],answer_page=q['answer_source']['page'])
            for k,v in row.items():
                if isinstance(v,(list,dict,bool)): row[k]=json.dumps(v,ensure_ascii=False)
            w.writerow(row)
    print(json.dumps({k:report[k] for k in ['processed_total','adopted_total','excluded_total','needs_review_total','classification_completed']},ensure_ascii=False))

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8'); main()
