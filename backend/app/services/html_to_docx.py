from __future__ import annotations

import base64
import re
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

from ..config import DATA_DIR, ROOT_DIR

BLOCK_TAGS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li"}
STRONG_TAGS = {"strong", "b"}
EM_TAGS = {"em", "i"}
UNDERLINE_TAGS = {"u"}
LIST_TAGS = {"ul", "ol"}
IGNORE_TAGS = {"thead", "tbody", "tfoot", "span", "font", "section", "article"}
DATA_URI_RE = re.compile(r"^data:image/[^;]+;base64,(.+)$", re.S)
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _fetch_image(src: str) -> bytes | None:
    src = (src or "").strip()
    if not src:
        return None
    try:
        if src.startswith("data:"):
            match = DATA_URI_RE.match(src)
            if not match:
                return None
            return base64.b64decode(re.sub(r"\s+", "", match.group(1)))
        parsed = urlparse(src)
        if parsed.scheme in {"http", "https"}:
            request = Request(src, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(request, timeout=10) as response:
                return response.read(MAX_IMAGE_BYTES + 1)[:MAX_IMAGE_BYTES]
        if parsed.scheme == "file":
            src = parsed.path
        path = Path(src)
        if not path.is_absolute():
            for base in (Path.cwd(), ROOT_DIR, DATA_DIR):
                candidate = base / path
                if candidate.is_file():
                    path = candidate
                    break
        if path.is_file():
            return path.read_bytes()[:MAX_IMAGE_BYTES]
    except Exception:
        return None
    return None


class _HTMLToDocxParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.document = Document()
        self.paragraph = None
        self.has_content = False
        self.bold = 0
        self.italic = 0
        self.underline = 0
        self.list_stack: list[str] = []
        self.align = WD_ALIGN_PARAGRAPH.LEFT
        self.skip_tag: str | None = None
        self.table_rows: list[list[dict]] = []
        self.current_row: list[dict] | None = None
        self.current_cell: list[tuple] | None = None
        self.current_cell_is_header = False
        normal = self.document.styles["Normal"]
        normal.font.name = "SimSun"
        normal.font.size = Pt(11)

    def _new_paragraph(self, style: str | None = None) -> None:
        self.paragraph = self.document.add_paragraph(style=style)
        self.paragraph.alignment = self.align
        self.has_content = False

    def _flush(self) -> None:
        if self.has_content:
            self.paragraph = None
            self.has_content = False
        elif self.paragraph is not None:
            self.paragraph._element.getparent().remove(self.paragraph._element)
            self.paragraph = None

    def _ensure_paragraph(self, style: str | None = None) -> None:
        if self.paragraph is None:
            self._new_paragraph(style)

    def _append_text(self, text: str) -> None:
        if self.current_cell is not None:
            self.current_cell.append(("text", text, self.bold, self.italic, self.underline))
            return
        self._ensure_paragraph()
        run = self.paragraph.add_run(text)
        run.bold = bool(self.bold)
        run.italic = bool(self.italic)
        run.underline = bool(self.underline)
        self.has_content = True

    def _append_image(self, src: str, alt: str) -> None:
        image = _fetch_image(src)
        if image is None:
            self._append_text(alt or "[图片]")
            return
        if self.current_cell is not None:
            self.current_cell.append(("image", image))
            return
        self._ensure_paragraph()
        run = self.paragraph.add_run()
        try:
            run.add_picture(BytesIO(image), width=Inches(5.4))
            self.has_content = True
        except Exception:
            self._append_text(alt or "[图片]")

    def _finish_cell(self) -> None:
        if self.current_cell is None:
            return
        if self.current_row is None:
            self.current_row = []
        self.current_row.append(
            {"parts": self.current_cell, "header": self.current_cell_is_header}
        )
        self.current_cell = None
        self.current_cell_is_header = False

    def _finish_row(self) -> None:
        if self.current_cell is not None:
            self._finish_cell()
        if self.current_row is not None:
            self.table_rows.append(self.current_row)
            self.current_row = None

    def _finish_table(self) -> None:
        self._finish_row()
        if not self.table_rows:
            return
        columns = max(len(row) for row in self.table_rows)
        table = self.document.add_table(rows=len(self.table_rows), cols=columns)
        try:
            table.style = "Table Grid"
        except KeyError:
            pass
        table.autofit = True
        for row_index, row in enumerate(self.table_rows):
            for cell_index, cell_data in enumerate(row):
                cell = table.cell(row_index, cell_index)
                paragraph = cell.paragraphs[0]
                for part in cell_data["parts"]:
                    if part[0] == "image":
                        try:
                            picture_run = paragraph.add_run()
                            picture_run.add_picture(BytesIO(part[1]), width=Inches(1.4))
                        except Exception:
                            paragraph.add_run("[图片]")
                        continue
                    _, text, bold, italic, underline = part
                    run = paragraph.add_run(text)
                    run.bold = bool(bold or cell_data["header"])
                    run.italic = bool(italic)
                    run.underline = bool(underline)
        self.table_rows = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attributes = dict(attrs)

        if tag in {"style", "script"}:
            self.skip_tag = tag
            return

        if tag == "table":
            self._flush()
            self.table_rows = []
            self.current_row = None
            self.current_cell = None
            return
        if tag == "tr":
            self.current_row = []
            return
        if tag in {"td", "th"}:
            self.current_cell = []
            self.current_cell_is_header = tag == "th"
            return
        if tag in IGNORE_TAGS:
            return

        if tag in STRONG_TAGS:
            self.bold += 1
            return
        if tag in EM_TAGS:
            self.italic += 1
            return
        if tag in UNDERLINE_TAGS:
            self.underline += 1
            return
        if tag in LIST_TAGS:
            self._flush()
            self.list_stack.append(tag)
            return
        if tag == "br":
            self._append_text("\n")
            return
        if tag == "img":
            self._append_image(attributes.get("src", ""), attributes.get("alt", ""))
            return
        if tag == "li":
            self._flush()
            style = "List Bullet" if self.list_stack and self.list_stack[-1] == "ul" else "List Number"
            self._new_paragraph(style)
            return
        if tag in BLOCK_TAGS:
            if self.current_cell is not None:
                self._append_text("\n")
                return
            self._flush()
            if tag.startswith("h"):
                level = min(int(tag[1]), 4) if tag[1].isdigit() else 1
                self._new_paragraph(f"Heading {level}")
                if tag == "h1":
                    self.paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                self._new_paragraph()
            return
        if tag == "center":
            self._flush()
            self.align = WD_ALIGN_PARAGRAPH.CENTER
            self._new_paragraph()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"style", "script"}:
            self.skip_tag = None
            return
        if tag in {"td", "th"}:
            self._finish_cell()
            return
        if tag == "tr":
            self._finish_row()
            return
        if tag == "table":
            self._finish_table()
            return
        if tag in STRONG_TAGS:
            self.bold = max(0, self.bold - 1)
            return
        if tag in EM_TAGS:
            self.italic = max(0, self.italic - 1)
            return
        if tag in UNDERLINE_TAGS:
            self.underline = max(0, self.underline - 1)
            return
        if tag in LIST_TAGS:
            self._flush()
            if self.list_stack:
                self.list_stack.pop()
            return
        if tag == "center":
            self._flush()
            self.align = WD_ALIGN_PARAGRAPH.LEFT
            return
        if tag in BLOCK_TAGS:
            if self.current_cell is None:
                self._flush()

    def handle_data(self, data: str) -> None:
        if self.skip_tag or not data:
            return
        self._append_text(data)


def html_to_docx_bytes(html_content: str) -> bytes:
    parser = _HTMLToDocxParser()
    parser.feed(html_content)
    parser._flush()
    output = BytesIO()
    parser.document.save(output)
    return output.getvalue()
