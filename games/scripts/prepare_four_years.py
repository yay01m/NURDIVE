"""Re-extract using each PDF font resource's encoding, not shared font names."""
import hashlib
import json
import sys
import re
from pathlib import Path
import build_official as extraction
from pdf_font_recovery import recovered_pdf

ROOT=Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8')

def main():
    manifest=json.loads((ROOT/'data/source_manifest.json').read_text(encoding='utf-8'))
    glyphs=json.loads((ROOT/'data/work/pdf-encoding-glyphs.json').read_text(encoding='utf-8'))['glyphs']
    reviewed_115=json.loads((ROOT/'data/work/115-review.json').read_text(encoding='utf-8'))
    original_open=extraction.pdfplumber.open
    for exam in range(111,116):
        entry=next(e for e in manifest if e['exam']==exam)
        answers=json.loads((ROOT/f'data/sources/{exam}/answer_rows.json').read_text(encoding='utf-8'))
        all_records=[]
        for source in entry['documents']:
            if source['role']!='questions':continue
            assert hashlib.sha256((ROOT/f'data/sources/{exam}'/source['filename']).read_bytes()).hexdigest()==source['sha256']
            def corrected_open(*args,**kwargs):
                recovered,unknown=recovered_pdf(args[0],glyphs)
                assert unknown <= glyphs.keys(), f'Unverified glyphs: {unknown-glyphs.keys()}'
                doc=original_open(recovered,*args[1:],**kwargs)
                for page in doc.pages:
                    for char in page.chars:
                        # This symbol font deliberately reuses Japanese code points.
                        # Verified source crops: tmp/font-recovery/symbols.png.
                        if 'ZZ-PIStd-819' in char['fontname']:
                            char['text']={'袷':'+','安':'−','案':'±','庵':'×'}.get(char['text'],char['text'])
                        if exam==115:
                            match=re.fullmatch(r'\(cid:(\d+)\)',char['text'])
                            if match and match[1] in reviewed_115['glyph_transcriptions']:
                                char['text']=reviewed_115['glyph_transcriptions'][match[1]]['text']
                return doc
            extraction.pdfplumber.open=corrected_open
            try:all_records.extend(extraction.extract_session(entry,source,answers))
            finally:extraction.pdfplumber.open=original_open
        if exam==115:
            for q in all_records:
                for correction in reviewed_115['reading_order_corrections']:
                    for key in ('question','question_stem','case_text'):
                        if q[key]:q[key]=q[key].replace(correction['before'],correction['after'])
                    q['choices']=[c.replace(correction['before'],correction['after']) for c in q['choices']]
        extraction.dump(ROOT/f'data/work/{exam}-recovered.json',all_records)
        print(exam,len(all_records),sum('グリフ' in r for q in all_records for r in q['review_reasons']),flush=True)

if __name__=='__main__':main()
