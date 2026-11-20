from __future__ import annotations

from .html_to_docx import html_to_docx_bytes


class DocxServiceError(RuntimeError):
    pass


async def convert_html_to_docx(html_content: str) -> bytes:
    try:
        return html_to_docx_bytes(html_content)
    except Exception as exc:
        raise DocxServiceError(f"DOCX 转换失败：{exc}") from exc

