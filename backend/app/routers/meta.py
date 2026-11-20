from __future__ import annotations

import sqlite3
from datetime import datetime

from fastapi import APIRouter, Depends

from ..config import get_db_path
from ..database import get_db
from ..services.config_service import load_config
from ..utils import human_file_size

router = APIRouter(tags=["系统"])


def _distribution(connection: sqlite3.Connection, table: str, column: str, question_column: str) -> list[dict]:
    rows = connection.execute(
        f"""
        SELECT t.ID AS id, t.{column} AS name, COUNT(q.ID) AS count
        FROM {table} t
        LEFT JOIN Questions q ON q.{question_column} = t.ID
        WHERE t.ID > 0
        GROUP BY t.ID, t.{column}
        ORDER BY count DESC, t.ID ASC
        """
    ).fetchall()
    return [dict(row) for row in rows]


@router.get("/meta", summary="题库元数据与统计")
def meta(connection: sqlite3.Connection = Depends(get_db)) -> dict:
    db_path = get_db_path()
    config = load_config(force=True)
    type_rows = _distribution(connection, "Qtypes", "题型", "题型")
    difficulty_rows = _distribution(connection, "Difficulties", "难度", "难度")
    knowledge_counts = {
        row["ID"]: row["count"]
        for row in connection.execute(
            "SELECT 知识点 AS ID, COUNT(*) AS count FROM Questions "
            "WHERE 知识点 IS NOT NULL GROUP BY 知识点"
        ).fetchall()
    }

    def enrich_node(node: dict) -> dict:
        count = sum(knowledge_counts.get(int(item_id), 0) for item_id in node["knowledge_ids"])
        return {
            **node,
            "count": count,
            "children": [enrich_node(child) for child in node["children"]],
        }

    knowledge_tree = [enrich_node(node) for node in config["knowledge_tree"]]

    question_count = connection.execute("SELECT COUNT(*) FROM Questions").fetchone()[0]
    paper_count = connection.execute("SELECT COUNT(*) FROM Papers").fetchone()[0]
    knowledge_total = connection.execute(
        "SELECT COUNT(DISTINCT 知识点) FROM Questions WHERE 知识点 IS NOT NULL"
    ).fetchone()[0]
    db_info = connection.execute("SELECT * FROM db_info LIMIT 1").fetchone()
    recent_papers = [
        dict(row)
        for row in connection.execute(
            """
            SELECT p.ID AS id, p.试卷 AS name, COUNT(q.ID) AS question_count
            FROM Papers p
            LEFT JOIN Questions q ON q.来源 = p.ID
            GROUP BY p.ID, p.试卷
            ORDER BY p.ID DESC
            LIMIT 6
            """
        ).fetchall()
    ]

    return {
        "database": {
            "file_name": db_info["file_name"] if db_info else db_path.name,
            "question_count": question_count,
            "max_id": db_info["max_id"] if db_info else None,
            "paper_count": paper_count,
            "knowledge_count": knowledge_total,
            "size": db_path.stat().st_size if db_path.exists() else 0,
            "size_label": human_file_size(db_path.stat().st_size) if db_path.exists() else "0B",
            "updated_at": datetime.fromtimestamp(db_path.stat().st_mtime).isoformat()
            if db_path.exists()
            else None,
        },
        "qtypes": type_rows,
        "difficulties": difficulty_rows,
        "knowledge_tree": knowledge_tree,
        "recent_papers": recent_papers,
    }
