from __future__ import annotations

import re
from urllib.parse import quote

_UNSAFE_FILENAME = re.compile(r'[\\/:*?"<>|\x00-\x1f]+')


def safe_filename(value: str, fallback: str = "试题") -> str:
    name = _UNSAFE_FILENAME.sub("_", (value or "").strip()).strip(" ._")
    return name or fallback


def attachment_headers(filename: str) -> dict[str, str]:
    safe = safe_filename(filename, "export.docx")
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "_", safe) or "export.docx"
    return {
        "Content-Disposition": (
            f"attachment; filename=\"{ascii_name}\"; "
            f"filename*=UTF-8''{quote(safe)}"
        )
    }


def human_file_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f}{unit}" if unit != "B" else f"{int(value)}B"
        value /= 1024
    return f"{size}B"
