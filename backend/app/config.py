from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("TIKU_DATA_DIR", ROOT_DIR / "data")).resolve()
DB_PATH = Path(os.getenv("TIKU_DB_PATH", DATA_DIR / "data.db")).resolve()
CONFIG_XLSX_PATH = Path(
    os.getenv("TIKU_CONFIG_XLSX", DATA_DIR / "config.xlsx")
).resolve()
STATIC_DIR = Path(os.getenv("TIKU_STATIC_DIR", ROOT_DIR / "static")).resolve()
DB_STATE_PATH = DATA_DIR / "current-db.txt"

APP_NAME = "智能题库系统"
APP_VERSION = "2.2.0"
DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 60


def _is_sqlite_signature(path: Path) -> bool:
    try:
        with path.open("rb") as source:
            return source.read(16) == b"SQLite format 3\x00"
    except OSError:
        return False


_current_db_path = DB_PATH
try:
    _saved = DB_STATE_PATH.read_text(encoding="utf-8").strip()
    if _saved:
        _candidate = Path(_saved).expanduser()
        if not _candidate.is_absolute():
            _candidate = DATA_DIR / _candidate
        _candidate = _candidate.resolve()
        if _candidate.is_file() and _is_sqlite_signature(_candidate):
            _current_db_path = _candidate
except OSError:
    pass


def get_db_path() -> Path:
    return _current_db_path


def set_db_path(path: Path) -> Path:
    global _current_db_path
    resolved = path.resolve()
    _current_db_path = resolved
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DB_STATE_PATH.write_text(str(resolved), encoding="utf-8")
    except OSError:
        pass
    return resolved
