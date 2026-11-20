from __future__ import annotations

import sqlite3
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response

from ..database import get_db
from ..schemas import ExportRequest
from ..services.docx_service import DocxServiceError, convert_html_to_docx
from ..services.html_builder import build_export_html
from ..services.question_repo import get_questions_by_ids
from ..utils import attachment_headers, safe_filename

router = APIRouter(prefix="/exports", tags=["导出"])


@router.post("/docx", summary="导出试题或试卷为 DOCX")
async def export_docx(
    payload: ExportRequest,
    connection: sqlite3.Connection = Depends(get_db),
) -> Response:
    unique_ids = list(dict.fromkeys(payload.question_ids))
    questions = get_questions_by_ids(connection, unique_ids)
    if not questions:
        raise HTTPException(status_code=400, detail="没有可导出的试题")
    if len(questions) != len(unique_ids):
        missing = sorted(set(unique_ids) - {item["id"] for item in questions})
        raise HTTPException(
            status_code=400,
            detail=f"以下试题不存在：{', '.join(map(str, missing[:10]))}",
        )

    html_content = build_export_html(
        title=payload.title,
        questions=questions,
        mode=payload.mode,
        subtitle=payload.subtitle,
    )
    title_stem = safe_filename(payload.title, "试题")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"{title_stem}_{timestamp}.docx"
    try:
        docx_content = await convert_html_to_docx(html_content)
    except DocxServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(
        content=docx_content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=attachment_headers(filename),
    )
