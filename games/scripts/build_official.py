"""Conservative, restartable extraction. No answer inference or generated questions."""
import json
import re
import sys
from pathlib import Path
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def answers(entry):
    source = next(d for d in entry['documents'] if d['role'] == 'answers')
    result = {}
    with pdfplumber.open(DATA / 'sources' / str(entry['exam']) / source['filename']) as pdf:
        for i, page in enumerate(pdf.pages):
            for table in page.extract_tables():
                for row in table:
                    for offset, cell in enumerate(row):
                        if cell and re.fullmatch(r'(?:[AB]|AM|PM)\d{1,3}', cell.strip()):
                            row_id = cell.strip()
                            prefix,number=re.fullmatch(r'([A-Z]+)(\d+)',row_id).groups()
                            key = ('A' if prefix in ('A','AM') else 'B')+f'{int(number):03}'
                            if key in result:
                                raise ValueError('Duplicate answer key '+key)
                            result[key] = {'cells': [(c or '').strip() for c in row[offset+1:offset+4]],
                                           'page': i+1, 'url': source['url'], 'row_id':row_id}
    expected = {s+f'{n:03}' for s in 'AB' for n in range(1,121)}
    if set(result) != expected:
        raise ValueError('Answer key coverage mismatch: '+str(expected-set(result)))
    dump(DATA / 'sources' / str(entry['exam']) / 'answer_rows.json', result)
    return result

def extract_session(entry, source, answer_rows):
    exam, session = entry['exam'], source['session']
    groups, records, current, group = [], [], None, None
    started = False
    last_number = 0
    marker_x = None
    marker_font = None
    source_path = DATA / 'sources' / str(exam) / source['filename']
    with pdfplumber.open(source_path) as pdf:
        for pi, page in enumerate(pdf.pages):
            for line in page.extract_text_lines(x_tolerance=2, y_tolerance=6):
                text = line['text'].strip()
                if re.search(r'(?:DKIX|DK[IX]|\.indd|\.iinndddd)', text):
                    continue
                match = re.match(r'^(\d{1,3})\s+(.*)', text)
                if not started:
                    if not match or int(match[1]) != 1 or not re.search(r'[ぁ-んァ-ヶ一-龯]', match[2]) or line['top'] > page.height*.75:
                        continue
                    # Instructions label answers with punctuation; actual question 1 has whitespace.
                    started, marker_x = True, line['x0']
                    marker_font = line['chars'][0]['fontname']
                if line['top'] > page.height*.92:
                    continue
                common = re.match(r'^次の文を読み\s*(\d+)(?:\s*[〜～~－―-、,]\s*(\d+))?\s*の問いに答えよ。', text)
                if common:
                    group = {'start': int(common[1]), 'end': int(common[2] or common[1]), 'lines': [], 'pages': [pi+1]}
                    groups.append(group)
                    current = None
                    continue
                if match and line['x0'] <= marker_x + 1 and line['chars'][0]['fontname'] == marker_font:
                    n = int(match[1])
                    if n != last_number+1:
                        raise ValueError(f'{exam}-{session}: question order {last_number} -> {n}, {text}')
                    last_number = n
                    current = {'number': n, 'lines': [match[2]], 'pages': [pi+1], 'group': group if group and group['start']<=n<=group['end'] else None}
                    records.append(current)
                elif current is not None:
                    current['lines'].append(text)
                    if pi+1 not in current['pages']: current['pages'].append(pi+1)
                elif group is not None:
                    group['lines'].append(text)
                    if pi+1 not in group['pages']: group['pages'].append(pi+1)
    if [r['number'] for r in records] != list(range(1,121)):
        raise ValueError(f'{exam}-{session}: expected 120 explicit question markers, got {len(records)}')
    output = []
    for r in records:
        n = r['number']
        stem, choices, labels = [], [], []
        for line in r['lines']:
            m = re.match(r'^(\d+)\s*[．.]\s*(.*)', line)
            if m:
                labels.append(int(m[1]))
                choices.append(m[2])
            elif choices:
                choices[-1] += '\n'+line
            else:
                stem.append(line)
        stem = '\n'.join(stem).strip()
        common = '\n'.join(r['group']['lines']) if r['group'] else None
        prior = [q['question_stem'] for q in output if r['group'] and r['group']['start'] <= q['number'] < n]
        question = '\n\n'.join(([common] if common else []) + prior + [stem])
        raw = answer_rows[('A' if session=='AM' else 'B')+f'{n:03}']
        cells = [c for c in raw['cells'] if c]
        numeric = not choices and bool(re.search(r'解答[:：]', stem))
        sets = [[int(d) for d in c if d.isdigit()] for c in cells] if not numeric else []
        issues = []
        if not choices and not numeric: issues.append('選択肢の抽出を要確認')
        if labels != list(range(1,len(choices)+1)): issues.append('選択肢番号の連続性を要確認')
        if not stem: issues.append('問題本文が空')
        if not cells: issues.append('公式正答欄が空欄')
        if any(d<1 or d>len(choices) for s in sets for d in s): issues.append('正答番号が選択肢範囲外')
        image = bool(re.search(r'別冊|(?:図|表|写真|グラフ|画像|心電図|イラスト)[^。\n]{0,35}(?:示す|示した|示され)|(?:次|以下)の図', question))
        if re.search(r'\(cid:|�', question+'\n'.join(choices)): issues.append('PDF文字の未解決グリフ')
        issues.append('分野分類・原本照合の未実施')
        output.append({
            'id': f'{exam}-{session}-{n:03}', 'exam':exam, 'year':entry['year'], 'session':session, 'number':n,
            'question_type':'必修' if n<=25 else '一般' if n<=90 else '状況設定',
            'category':None, 'subcategory':None, 'topic':None,
            'question':question, 'question_stem':stem, 'case_text':common,
            'preceding_context_ids':[f'{exam}-{session}-{k:03}' for k in range(r['group']['start'],n)] if r['group'] else [],
            'choices':[c.strip() for c in choices], 'choice_numbers':labels,
            'answer_format':'numeric' if numeric else 'multiple_select' if re.search(r'[2-5２-５]\s*つ選べ',stem) else 'single_select',
            'correct_answers':sorted(set(d for s in sets for d in s)),
            'accepted_answer_sets':sets, 'correct_answer_value':cells[0] if numeric and cells else None,
            'official_answer_cells':raw['cells'],
            'special_status':'複数正答' if len(cells)>1 else None,
            'source':{'organization':'厚生労働省','exam':f'第{exam}回看護師国家試験','session':'午前' if session=='AM' else '午後','question_number':n,'url':source['url'],'pages':r['pages'],'case_pages':r['group']['pages'] if r['group'] else [],'sha256':source['sha256']},
            'answer_source':{'url':raw['url'],'page':raw['page'],'row_id':raw['row_id']},
            'requires_image':image,'excluded':image,'exclusion_reason':'別冊画像が必要' if image and '別冊' in question else '図・画像等の視覚情報が必要' if image else None,
            'needs_review':True,'review_reasons':issues,'explanation':None
        })
    return output

def main(exam):
    entry = next(e for e in json.loads((DATA/'source_manifest.json').read_text(encoding='utf-8')) if e['exam']==exam)
    a = answers(entry)
    result = []
    for source in entry['documents']:
        if source['role']=='questions': result.extend(extract_session(entry,source,a))
    dump(DATA/'work'/f'{exam}.json',result)
    print('Extracted',len(result),'images',sum(q['requires_image'] for q in result),'numeric',sum(q['answer_format']=='numeric' for q in result))
    print('Unresolved glyph records',sum(any('グリフ' in r for r in q['review_reasons']) for q in result),flush=True)

if __name__=='__main__': main(int(sys.argv[1]))
