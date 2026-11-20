from __future__ import annotations

import sqlite3
from collections.abc import Generator

from .config import get_db_path


def create_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    if not db_path.exists():
        raise RuntimeError(f"SQLite 数据库不存在：{db_path}")
    connection = sqlite3.connect(
        db_path,
        timeout=30,
        check_same_thread=False,
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 30000")
    return connection


def get_db() -> Generator[sqlite3.Connection, None, None]:
    connection = create_connection()
    try:
        yield connection
    finally:
        connection.close()
