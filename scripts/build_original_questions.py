"""Compatibility entry point; authored originals are stored under data/original/."""
import runpy
from pathlib import Path
if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('export_original_questions.py')), run_name='__main__')
