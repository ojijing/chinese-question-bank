from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query

from ..database import get_db
from ..services.question_repo import get_questions_by_paper

router = APIRouter(prefix="/papers", tags=["试卷"])


@router.get("", summary="筛选试卷")
def list_papers(
    keyword: str = "",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=60),
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    where = ""
    params: list[object] = []
    if keyword.strip():
        where = "WHERE p.试卷 LIKE ?"
        params.append(f"%{keyword.strip()}%")
    total = connection.execute(
        f"SELECT COUNT(*) FROM Papers p {where}", params
    ).fetchone()[0]
    rows = connection.execute(
        f"""
        SELECT p.ID AS id, p.试卷 AS name, COUNT(q.ID) AS question_count
        FROM Papers p
        LEFT JOIN Questions q ON q.来源 = p.ID
        {where}
        GROUP BY p.ID, p.试卷
        ORDER BY p.ID DESC
        LIMIT ? OFFSET ?
        """,
        [*params, page_size, (page - 1) * page_size],
    ).fetchall()
    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/{paper_id}", summary="获取试卷及题目")
def paper_detail(
    paper_id: int,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    paper = connection.execute(
        "SELECT ID AS id, 试卷 AS name FROM Papers WHERE ID = ?", (paper_id,)
    ).fetchone()
    if paper is None:
        raise HTTPException(status_code=404, detail="试卷不存在")
    questions = get_questions_by_paper(connection, paper_id)
    return {**dict(paper), "questions": questions, "question_count": len(questions)}
