from __future__ import annotations

import html
from collections import OrderedDict
from typing import Any, Literal

ExportMode = Literal["none", "inline", "end"]
HEADINGS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五"]


def _safe_html(value: object) -> str:
    text = str(value or "").strip()
    return text or "<p>（无内容）</p>"


def _group_questions(questions: list[dict[str, Any]]) -> list[tuple[str, list[dict[str, Any]]]]:
    grouped: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
    for question in questions:
        qtype = str((question.get("qtype") or {}).get("name") or "未分类")
        grouped.setdefault(qtype, []).append(question)
    return list(grouped.items())


def _analysis_block(question: dict[str, Any]) -> str:
    analysis = _safe_html(question.get("analysis"))
    return (
        '<div class="analysis">'
        '<p class="analysis-title"><strong>解析：</strong></p>'
        f"{analysis}"
        "</div>"
    )


def build_export_html(
    *,
    title: str,
    questions: list[dict[str, Any]],
    mode: ExportMode = "none",
    subtitle: str = "",
) -> str:
    grouped = _group_questions(questions)
    ordered = [question for _, items in grouped for question in items]
    total = len(ordered)
    safe_title = html.escape(title or "试题")
    safe_subtitle = html.escape(subtitle or "")
    body: list[str] = [
        '<div class="document">',
        f'<h1 class="paper-title">{safe_title}</h1>',
    ]
    if safe_subtitle:
        body.append(f'<p class="paper-subtitle">{safe_subtitle}</p>')
    body.append(f'<p class="paper-meta">共 {total} 题</p>')

    number = 0
    for group_index, (qtype_name, items) in enumerate(grouped):
        heading = HEADINGS[group_index] if group_index < len(HEADINGS) else str(group_index + 1)
        body.append(f'<h2 class="section-title">{heading}、{html.escape(qtype_name)}</h2>')
        for question in items:
            number += 1
            body.append('<div class="question">')
            body.append(
                f'<div class="question-content"><span class="question-number">{number}.</span>'
                f'{_safe_html(question.get("content"))}</div>'
            )
            if mode == "inline":
                body.append(_analysis_block(question))
            body.append("</div>")

    if mode == "end":
        body.append('<div class="answer-section">')
        body.append('<h2 class="answer-heading">参考答案</h2>')
        for index, question in enumerate(ordered, start=1):
            body.append(
                f'<div class="answer-item"><p><strong>{index}.</strong></p>'
                f'{_safe_html(question.get("analysis"))}</div>'
            )
        body.append("</div>")

    body.append("</div>")
    styles = """
    @page { size: A4; margin: 2.2cm 2cm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2933;
      font-family: "SimSun", "Songti SC", "Noto Serif CJK SC", serif;
      font-size: 11pt;
      line-height: 1.85;
    }
    .document { width: 100%; }
    .paper-title {
      margin: 0 0 8pt;
      text-align: center;
      font-family: "SimHei", "Heiti SC", sans-serif;
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 1pt;
    }
    .paper-subtitle, .paper-meta {
      margin: 0 0 6pt;
      text-align: center;
      color: #5f6b76;
      font-size: 10pt;
    }
    .section-title {
      margin: 18pt 0 8pt;
      font-family: "SimHei", "Heiti SC", sans-serif;
      font-size: 14pt;
      font-weight: 700;
      page-break-after: avoid;
    }
    .question { margin: 0 0 14pt; page-break-inside: auto; }
    .question-content p { margin: 0 0 5pt; }
    .question-number { font-weight: 700; margin-right: 4pt; }
    .analysis {
      margin: 6pt 0 0;
      padding: 7pt 10pt;
      border-left: 3pt solid #b5462f;
      background: #fbf4ef;
      color: #573229;
    }
    .analysis-title { margin: 0 0 2pt; color: #9f2d1b; }
    .analysis p { margin: 0 0 4pt; }
    .answer-section { page-break-before: always; }
    .answer-heading {
      margin: 0 0 12pt;
      text-align: center;
      font-family: "SimHei", "Heiti SC", sans-serif;
      font-size: 16pt;
    }
    .answer-item { margin: 0 0 9pt; }
    .answer-item p { margin: 0 0 3pt; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #99a3ad; padding: 4pt 6pt; }
    """
    return (
        "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
        f"<title>{safe_title}</title><style>{styles}</style></head>"
        f"<body>{''.join(body)}</body></html>"
    )
