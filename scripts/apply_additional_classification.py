"""Apply individually reviewed ID-based labels; never infer labels from keywords."""
import hashlib
import json
from collections import Counter
from pathlib import Path
from classification_schema import CATEGORIES

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'data/classification'

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def apply(records):
    anchors = read(DIRECTORY / 'input-anchors.json')
    reviews = read(DIRECTORY / 'review-notes.json')
    labels = {}
    for path in sorted(DIRECTORY.glob('*.txt')):
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            number, category, subcategory, topic = line.split('|')
            identifier = f'{path.stem}-{int(number):03}'
            assert identifier not in labels
            assert 1 <= int(category) <= len(CATEGORIES) and subcategory and topic
            labels[identifier] = (CATEGORIES[int(category)-1], subcategory, topic)
    ids = {q['id'] for q in records}
    assert len(ids) == len(records) == 897
    assert ids == labels.keys() == anchors['sha256_by_id'].keys()
    assert reviews.keys() <= ids
    for q in records:
        protected = {key:q.get(key) for key in anchors['fields']}
        digest = hashlib.sha256(json.dumps(protected, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        assert digest == anchors['sha256_by_id'][q['id']], f"Source changed: {q['id']}"
        q['category'], q['subcategory'], q['topic'] = labels[q['id']]
        q['classification_status'] = 'provisional_review' if q['id'] in reviews else 'classified_unofficial'
        q['classification_needs_review'] = q['id'] in reviews
        q['classification_review_reason'] = reviews.get(q['id'], '')
        q['classification_method'] = 'individual_question_case_and_choices_review'
        q['classification_source'] = None  # No official item-level category is claimed.
        q['classification_confidence'] = None
        q['review_reasons'] = [r for r in q['review_reasons'] if r not in ('科目分類・解説・個別投影演出は準備中', '科目分類が未確認') and not r.startswith('分類要確認：')]
        if '解説・個別投影演出は準備中' not in q['review_reasons']:
            q['review_reasons'].append('解説・個別投影演出は準備中')
        if q['id'] in reviews:
            q['review_reasons'].append('分類要確認：' + reviews[q['id']])
        q['needs_review'] = bool(q['review_reasons'])
    return records

def report(records):
    return {'input':len(records), 'classified':len(records), 'classification_review':sum(q['classification_needs_review'] for q in records), 'missing':0,
            'categories':dict(Counter(q['category'] for q in records)), 'official_item_classification_verified':False,
            'source_content_unchanged':True, 'scope':'追加4年度897問の分類のみ。解説検証・原文訂正は含まない。'}

if __name__ == '__main__':
    path = ROOT / 'data/additional_questions.json'
    records = apply(read(path))
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    result = report(records)
    (DIRECTORY / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))
