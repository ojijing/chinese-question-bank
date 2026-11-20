from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from ..database import get_db
from ..schemas import QuestionUpdate, RandomQuestionRequest
from ..services.question_repo import (
    get_question,
    get_questions_by_ids,
    get_random_questions,
    query_questions,
)

router = APIRouter(prefix="/questions", tags=["试题"])


class BulkQuestionRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=300)


@router.get("", summary="筛选试题")
def list_questions(
    keyword: str = "",
    qtype_id: int = Query(default=0, ge=0),
    difficulty_id: int = Query(default=0, ge=0),
    knowledge_id: int = Query(default=0, ge=0),
    knowledge_ids: list[int] | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    items, total = query_questions(
        connection,
        page=page,
        page_size=page_size,
        keyword=keyword,
        qtype_id=qtype_id,
        difficulty_id=difficulty_id,
        knowledge_id=knowledge_id,
        knowledge_ids=knowledge_ids or [],
        sort=sort,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/bulk", summary="按 ID 批量获取试题")
def bulk_questions(
    payload: BulkQuestionRequest,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    unique_ids = list(dict.fromkeys(payload.ids))
    return {"items": get_questions_by_ids(connection, unique_ids)}


@router.post("/random", summary="随机抽取试题")
def random_questions(
    payload: RandomQuestionRequest,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    items = get_random_questions(
        connection,
        count=payload.count,
        qtype_ids=payload.qtype_ids,
        difficulty_ids=payload.difficulty_ids,
        knowledge_ids=payload.knowledge_ids,
        keyword=payload.keyword,
        exclude_ids=payload.exclude_ids,
    )
    return {"items": items, "count": len(items)}


@router.get("/{question_id}", summary="获取单道试题")
def question_detail(
    question_id: int,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    question = get_question(connection, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="试题不存在")
    return question


@router.put("/{question_id}", summary="更新试题")
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    exists = connection.execute(
        "SELECT ID FROM Questions WHERE ID = ?", (question_id,)
    ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="试题不存在")

    checks = [
        ("Qtypes", payload.qtype_id, "题型"),
        ("Difficulties", payload.difficulty_id, "难度"),
        ("Knowledge", payload.knowledge_id, "知识点"),
    ]
    for table, item_id, label in checks:
        row = connection.execute(
            f"SELECT ID FROM {table} WHERE ID = ?", (item_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=400, detail=f"{label}参数无效")

    try:
        connection.execute(
            """
            UPDATE Questions
            SET 题干 = ?, 解析 = ?, 题型 = ?, 难度 = ?, 知识点 = ?
            WHERE ID = ?
            """,
            (
                payload.content,
                payload.analysis,
                payload.qtype_id,
                payload.difficulty_id,
                payload.knowledge_id,
                question_id,
            ),
        )
        connection.commit()
    except sqlite3.Error as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"保存失败：{exc}") from exc

    question = get_question(connection, question_id)
    return {"message": "试题更新成功", "question": question}
