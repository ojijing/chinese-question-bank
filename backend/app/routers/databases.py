from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import DATA_DIR, get_db_path, set_db_path

router = APIRouter(prefix="/databases", tags=["题库"])

REQUIRED_COLUMNS = {
    "Questions": {"ID", "题干", "解析", "难度", "知识点", "来源", "题型"},
    "Papers": {"ID", "试卷"},
    "Knowledge": {"ID", "知识点"},
    "Qtypes": {"ID", "题型"},
    "Difficulties": {"ID", "难度"},
    "db_info": {"file_name", "question_count", "max_id", "encrypted"},
}


class SwitchDatabaseRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)


def _is_sqlite(path: Path) -> bool:
    try:
        with path.open("rb") as source:
            return source.read(16) == b"SQLite format 3\x00"
    except OSError:
        return False


def _validate(path: Path) -> dict:
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="题库文件不存在")
    if not _is_sqlite(path):
        raise HTTPException(status_code=400, detail="所选文件不是有效的题库文件")
    connection = sqlite3.connect(path, timeout=10)
    try:
        names = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        missing_tables = sorted(REQUIRED_COLUMNS.keys() - names)
        if missing_tables:
            raise HTTPException(
                status_code=400,
                detail=f"题库缺少必要数据表：{', '.join(missing_tables)}",
            )
        for table, required in REQUIRED_COLUMNS.items():
            columns = {
                row[1]
                for row in connection.execute(f"PRAGMA table_info('{table}')").fetchall()
            }
            missing = sorted(required - columns)
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"{table} 缺少字段：{', '.join(missing)}",
                )
        count = connection.execute("SELECT COUNT(*) FROM Questions").fetchone()[0]
        info = connection.execute(
            "SELECT file_name FROM db_info LIMIT 1"
        ).fetchone()
        return {
            "count": count,
            "name": (info[0] if info and info[0] else path.name),
        }
    except sqlite3.Error as exc:
        raise HTTPException(status_code=400, detail=f"题库文件无法读取：{exc}") from exc
    finally:
        connection.close()


def _candidate_files() -> list[Path]:
    files = [
        path
        for path in DATA_DIR.iterdir()
        if path.is_file()
        and path.suffix.lower() in {".db", ".sqlite", ".sqlite3"}
        and _is_sqlite(path)
    ]
    current = get_db_path().resolve()
    if current.is_file() and current not in files:
        files.append(current)
    return sorted(files, key=lambda path: path.name.lower())


def _payload(path: Path) -> dict:
    stat = path.stat()
    try:
        details = _validate(path)
        valid = True
        count = details["count"]
        name = details["name"]
        error = None
    except HTTPException as exc:
        valid = False
        count = 0
        name = path.name
        error = str(exc.detail)
    return {
        "path": str(path),
        "file": path.name,
        "name": name,
        "question_count": count,
        "size": stat.st_size,
        "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "valid": valid,
        "error": error,
    }


@router.get("", summary="获取可切换题库列表")
def list_databases() -> dict:
    current = get_db_path().resolve()
    items = [_payload(path) for path in _candidate_files()]
    return {"current": str(current), "items": items}


@router.post("/switch", summary="切换当前题库")
def switch_database(payload: SwitchDatabaseRequest) -> dict:
    requested = Path(payload.path).expanduser()
    if not requested.is_absolute():
        requested = DATA_DIR / requested
    requested = requested.resolve()
    try:
        requested.relative_to(DATA_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="只能切换数据目录中的题库文件") from None

    details = _validate(requested)
    set_db_path(requested)
    return {
        "message": "题库切换成功",
        "current": str(requested),
        "name": details["name"],
        "question_count": details["count"],
    }
