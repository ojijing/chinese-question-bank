from __future__ import annotations

import sqlite3
from typing import Any

QUESTION_SELECT = """
SELECT
    q.ID AS id,
    q.题干 AS content,
    q.解析 AS analysis,
    q.难度 AS difficulty_id,
    q.知识点 AS knowledge_id,
    q.来源 AS paper_id,
    q.题型 AS qtype_id,
    d.难度 AS difficulty_name,
    k.知识点 AS knowledge_name,
    p.试卷 AS paper_name,
    t.题型 AS qtype_name
FROM Questions q
LEFT JOIN Difficulties d ON d.ID = q.难度
LEFT JOIN Knowledge k ON k.ID = q.知识点
LEFT JOIN Papers p ON p.ID = q.来源
LEFT JOIN Qtypes t ON t.ID = q.题型
"""


def serialize_question(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    return {
        "id": data["id"],
        "content": data.get("content") or "",
        "analysis": data.get("analysis") or "",
        "difficulty": {
            "id": data.get("difficulty_id"),
            "name": data.get("difficulty_name") or "未分类",
        },
        "knowledge": {
            "id": data.get("knowledge_id"),
            "name": data.get("knowledge_name") or "未分类",
        },
        "qtype": {
            "id": data.get("qtype_id"),
            "name": data.get("qtype_name") or "未分类",
        },
        "paper": {
            "id": data.get("paper_id"),
            "name": data.get("paper_name") or "未关联试卷",
        },
    }


def _where_clause(
    *,
    keyword: str = "",
    qtype_id: int | None = None,
    difficulty_id: int | None = None,
    knowledge_id: int | None = None,
    qtype_ids: list[int] | None = None,
    difficulty_ids: list[int] | None = None,
    knowledge_ids: list[int] | None = None,
    exclude_ids: list[int] | None = None,
) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if keyword.strip():
        clauses.append("q.题干 LIKE ?")
        params.append(f"%{keyword.strip()}%")
    if qtype_id and qtype_id > 0:
        clauses.append("q.题型 = ?")
        params.append(qtype_id)
    if difficulty_id and difficulty_id > 0:
        clauses.append("q.难度 = ?")
        params.append(difficulty_id)
    if knowledge_id and knowledge_id > 0:
        clauses.append("q.知识点 = ?")
        params.append(knowledge_id)
    if knowledge_ids:
        valid_knowledge = [value for value in knowledge_ids if value > 0]
        if valid_knowledge:
            clauses.append(f"q.知识点 IN ({','.join('?' for _ in valid_knowledge)})")
            params.extend(valid_knowledge)
    if qtype_ids:
        valid = [value for value in qtype_ids if value > 0]
        if valid:
            clauses.append(f"q.题型 IN ({','.join('?' for _ in valid)})")
            params.extend(valid)
    if difficulty_ids:
        valid = [value for value in difficulty_ids if value > 0]
        if valid:
            clauses.append(f"q.难度 IN ({','.join('?' for _ in valid)})")
            params.extend(valid)
    if knowledge_ids:
        valid = [value for value in knowledge_ids if value > 0]
        if valid:
            clauses.append(f"q.知识点 IN ({','.join('?' for _ in valid)})")
            params.extend(valid)
    if exclude_ids:
        clauses.append(f"q.ID NOT IN ({','.join('?' for _ in exclude_ids)})")
        params.extend(exclude_ids)
    return (" WHERE " + " AND ".join(clauses)) if clauses else "", params


def query_questions(
    connection: sqlite3.Connection,
    *,
    page: int = 1,
    page_size: int = 12,
    keyword: str = "",
    qtype_id: int | None = None,
    difficulty_id: int | None = None,
    knowledge_id: int | None = None,
    knowledge_ids: list[int] | None = None,
    sort: str = "newest",
) -> tuple[list[dict[str, Any]], int]:
    where, params = _where_clause(
        keyword=keyword,
        qtype_id=qtype_id,
        difficulty_id=difficulty_id,
        knowledge_id=knowledge_id,
        knowledge_ids=knowledge_ids,
    )
    total = connection.execute(
        f"SELECT COUNT(*) FROM Questions q{where}", params
    ).fetchone()[0]
    order = "ASC" if sort == "oldest" else "DESC"
    rows = connection.execute(
        f"{QUESTION_SELECT}{where} ORDER BY q.ID {order} LIMIT ? OFFSET ?",
        [*params, page_size, (page - 1) * page_size],
    ).fetchall()
    return [serialize_question(row) for row in rows], total


def get_question(connection: sqlite3.Connection, question_id: int) -> dict[str, Any] | None:
    row = connection.execute(
        f"{QUESTION_SELECT} WHERE q.ID = ?", (question_id,)
    ).fetchone()
    return serialize_question(row) if row else None


def get_questions_by_ids(
    connection: sqlite3.Connection, question_ids: list[int]
) -> list[dict[str, Any]]:
    if not question_ids:
        return []
    placeholders = ",".join("?" for _ in question_ids)
    rows = connection.execute(
        f"{QUESTION_SELECT} WHERE q.ID IN ({placeholders})", question_ids
    ).fetchall()
    found = {row["id"]: serialize_question(row) for row in rows}
    return [found[question_id] for question_id in question_ids if question_id in found]


def get_questions_by_paper(
    connection: sqlite3.Connection, paper_id: int
) -> list[dict[str, Any]]:
    rows = connection.execute(
        f"{QUESTION_SELECT} WHERE q.来源 = ? ORDER BY q.ID ASC", (paper_id,)
    ).fetchall()
    return [serialize_question(row) for row in rows]


def get_random_questions(
    connection: sqlite3.Connection,
    *,
    count: int,
    qtype_ids: list[int],
    difficulty_ids: list[int],
    knowledge_ids: list[int],
    keyword: str,
    exclude_ids: list[int],
) -> list[dict[str, Any]]:
    where, params = _where_clause(
        keyword=keyword,
        qtype_ids=qtype_ids,
        difficulty_ids=difficulty_ids,
        knowledge_ids=knowledge_ids,
        exclude_ids=exclude_ids,
    )
    rows = connection.execute(
        f"{QUESTION_SELECT}{where} ORDER BY RANDOM() LIMIT ?", [*params, count]
    ).fetchall()
    return [serialize_question(row) for row in rows]
