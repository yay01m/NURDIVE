"""Download only explicitly recorded MHLW sources; retain hashes and raw extraction."""
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.request
import pdfplumber

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

def download(url, path):
    if urllib.request.urlparse(url).hostname != 'www.mhlw.go.jp':
        raise ValueError('Only www.mhlw.go.jp sources are allowed')
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'RECARE-official-dataset/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            content = response.read()
        if path.suffix == '.pdf' and not content.startswith(b'%PDF'):
            raise ValueError('Not a PDF: ' + url)
        path.write_bytes(content)
    return hashlib.sha256(path.read_bytes()).hexdigest()

def collect(exam):
    manifest = json.loads((DATA / 'source_manifest.json').read_text(encoding='utf-8'))
    entry = next(x for x in manifest if x['exam'] == exam)
    for source in entry['documents']:
        path = DATA / 'sources' / str(exam) / source['filename']
        source['sha256'] = download(source['url'], path)
        if path.suffix == '.pdf':
            out = path.with_suffix('.pages.json')
            if not out.exists():
                with pdfplumber.open(path) as pdf:
                    pages = [{'page': i+1, 'width': p.width, 'height': p.height,
                              'text': p.extract_text(x_tolerance=2) or ''}
                             for i, p in enumerate(pdf.pages)]
                out.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf-8')
            source['pages'] = len(json.loads(out.read_text(encoding='utf-8')))
        print(exam, source['filename'], source['sha256'][:12], flush=True)
    (DATA / 'source_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    collect(int(sys.argv[1]))
