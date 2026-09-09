"""Publish text/official-answer data separately from the existing explained 115 bank."""
import collections
import hashlib
import json
import re
from pathlib import Path
from classification_schema import normalize

ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
def write(name,data):(ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def main():
    manifest=read('data/source_manifest.json')
    special=read('data/special_status_manifest.json')
    selected=[];held=[];yearly=[]
    for exam in range(111,115):
        entry=next(e for e in manifest if e['exam']==exam)
        for source in entry['documents']:
            assert hashlib.sha256((ROOT/f'data/sources/{exam}'/source['filename']).read_bytes()).hexdigest()==source['sha256']
        records=read(f'data/work/{exam}-recovered.json')
        for q in records:q['dataset_status']='pending_review'
        records=normalize(records)
        answers=read(f'data/sources/{exam}/answer_rows.json')
        assert {q['id'] for q in records}=={f'{exam}-{session}-{n:03}' for session in ('AM','PM') for n in range(1,121)}
        for q in records:
            reasons=[]
            answer=answers[('A' if q['session']=='AM' else 'B')+f"{q['number']:03}"]
            assert q['official_answer_cells']==answer['cells']
            expected=[[int(n) for n in c if n.isdigit()] for c in answer['cells'] if c]
            if q['answer_format']!='numeric':assert q['accepted_answer_sets']==expected
            if q['id'] in special:
                q['special_source']=special[q['id']];q['special_status']=special[q['id']]['status']
            if q['id']=='112-PM-026':
                assert '僧房弁' in q['choices'][0]
                q['choices'][0]=q['choices'][0].replace('僧房弁','僧帽弁')
                src=next(d for d in entry['documents'] if d['role']=='errata')
                q['errata']={'url':src['url'],'before':'僧房弁','after':'僧帽弁','choice_number':1,'applied':True}
            text='\n'.join([q['question'],q['case_text'] or '',*q['choices']])
            if q['requires_image']:reasons.append('画像・図表が必要')
            if q['special_status'] in ('採点除外','条件付き採点除外'):reasons.append(q['special_status'])
            if q['answer_format']=='numeric':reasons.append('数値入力形式は未対応')
            if not 4<=len(q['choices'])<=5 or q['choice_numbers']!=list(range(1,len(q['choices'])+1)):reasons.append('選択肢データの確認が必要')
            if not q['accepted_answer_sets'] or any(not group or any(n<1 or n>len(q['choices']) for n in group) for group in q['accepted_answer_sets']):reasons.append('公式正答と選択肢の対応を要確認')
            if re.search(r'\(cid:|�|次の文を読み',text) or not q['question'].strip():reasons.append('本文の抽出確認が必要')
            if q['number']>=91 and not q['case_text']:reasons.append('共通症例が欠落')
            count=re.search(r'([2-5])\s*つ選べ',q['question']);expected_count=int(count[1]) if count else 1
            if any(len(group)!=expected_count for group in q['accepted_answer_sets']):reasons.append('回答形式を要確認')
            if reasons:
                held.append({'id':q['id'],'year':q['year'],'reasons':list(dict.fromkeys(reasons)),'source':q['source']['url']});continue
            q['dataset_status']='adopted_official_answers_only'
            q['publication_mode']='official_answers_only'
            q['explanation_status']='pending';q['simulator_status']='pending'
            q['text_check']={'glyphs':'pdf_font_resource_encoding_and_visually_verified_symbol_glyphs','structure':'passed','official_answer_rows':'matched','full_page_visual_review':False}
            q['review_reasons']=['科目分類・解説・個別投影演出は準備中']
            q['needs_review']=True
            selected.append(q)
        yselected=[q for q in selected if q['exam']==exam]
        yearly.append({'exam':exam,'year':exam+1911,'input':240,'added':len(yselected),'held':240-len(yselected)})
    from apply_additional_classification import apply, report
    selected = apply(selected)
    write('data/classification/report.json', report(selected))
    write('data/additional_questions.json',selected)
    write('data/additional_questions_held.json',held)
    write('data/additional_questions_report.json',{'input':960,'added':len(selected),'held':len(held),'yearly':yearly,'unprocessed':0,'mode':'official_answers_only','full_page_visual_review':False})
    print(json.dumps(yearly))

if __name__=='__main__':main()
