from __future__ import annotations

from fastapi import APIRouter, Response

from ..services.config_service import export_config_workbook
from ..utils import attachment_headers

router = APIRouter(prefix="/config", tags=["题库参数"])


@router.get("/export", summary="下载题库参数表")
def export_config() -> Response:
    content = export_config_workbook()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=attachment_headers("题库参数表.xlsx"),
    )
