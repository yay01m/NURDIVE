"""Process years sequentially; checkpoint every outcome without inventing missing rows."""
import json
import sys
import traceback
from build_official import DATA, main as extract, dump
from discover_official import discover
from validate_official import main as validate

sys.stdout.reconfigure(encoding='utf-8')
checkpoint=DATA/'progress.json'
progress=json.loads(checkpoint.read_text(encoding='utf-8')) if checkpoint.exists() else {'status':'incomplete','years':{}}
for exam in [int(n) for n in sys.argv[1:]]:
    try:
        manifest=json.loads((DATA/'source_manifest.json').read_text(encoding='utf-8'))
        if not any(e['exam']==exam for e in manifest): discover(exam)
        extract(exam)
        validate()
        progress['years'][str(exam)]={'stage':'extracted_and_mechanically_checked','semantic_review_complete':(DATA/'work'/f'{exam}-classification.tsv').exists(),'visual_full_review_complete':False}
    except Exception as e:
        progress['years'][str(exam)]={'stage':'requires_extraction_work','error':str(e)}
        print('CHECKPOINT ERROR',exam,str(e),flush=True)
    dump(checkpoint,progress)
