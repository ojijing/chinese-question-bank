from __future__ import annotations

from pathlib import Path
from threading import Lock
from typing import Any

from openpyxl import Workbook, load_workbook

from ..config import CONFIG_XLSX_PATH

_lock = Lock()
_cache: dict[str, Any] | None = None
_cache_mtime: float | None = None


def _cell_text(value: object) -> str:
    return "" if value is None else str(value).strip()


def _parse_id(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        item_id = int(value)
    except (TypeError, ValueError):
        return None
    return item_id if item_id > 0 else None


def _find_child(parent: dict[str, Any], name: str) -> dict[str, Any] | None:
    return next((child for child in parent["children"] if child["name"] == name), None)


def _add_leaf(
    parent: dict[str, Any],
    *,
    name: str,
    item_id: int,
    level: int,
    seen_keys: set[str],
) -> None:
    key = f"{parent['key']}/k{item_id}"
    if key in seen_keys:
        return
    seen_keys.add(key)
    parent["children"].append(
        {
            "key": key,
            "name": name,
            "level": level,
            "knowledge_id": item_id,
            "knowledge_ids": [item_id],
            "children": [],
        }
    )


def _parse_knowledge_sheet(sheet: Any) -> list[dict[str, Any]]:
    tree: list[dict[str, Any]] = []
    current_l1: dict[str, Any] | None = None
    current_l2: dict[str, Any] | None = None
    seen_keys: set[str] = set()

    for row in sheet.iter_rows(min_row=2, values_only=True):
        values = [_cell_text(value) for value in list(row)[:4]] + [""] * 4
        col_a, col_b, col_c, col_d = values[:4]

        if col_a:
            current_l1 = {
                "key": f"l1-{len(tree)}",
                "name": col_a,
                "level": 1,
                "knowledge_id": None,
                "knowledge_ids": [],
                "children": [],
            }
            tree.append(current_l1)
            current_l2 = None

        if current_l1 is None:
            continue

        # 三级写法：一级 | 二级 | 知识点 | 编号
        if col_b and col_c and _parse_id(col_d) is not None:
            current_l2 = _find_child(current_l1, col_b)
            if current_l2 is None:
                current_l2 = {
                    "key": f"{current_l1['key']}/l2-{len(current_l1['children'])}",
                    "name": col_b,
                    "level": 2,
                    "knowledge_id": None,
                    "knowledge_ids": [],
                    "children": [],
                }
                current_l1["children"].append(current_l2)
            _add_leaf(
                current_l2,
                name=col_c,
                item_id=_parse_id(col_d) or 0,
                level=3,
                seen_keys=seen_keys,
            )
            continue

        # 二级分组行：一级 | 二级 | 空 | 空
        if col_b and not col_c and not col_d:
            current_l2 = _find_child(current_l1, col_b)
            if current_l2 is None:
                current_l2 = {
                    "key": f"{current_l1['key']}/l2-{len(current_l1['children'])}",
                    "name": col_b,
                    "level": 2,
                    "knowledge_id": None,
                    "knowledge_ids": [],
                    "children": [],
                }
                current_l1["children"].append(current_l2)
            continue

        # 三级知识点简写：二级分组下，知识点写在第三列、编号写在第四列。
        if current_l2 is not None and col_c and _parse_id(col_d) is not None:
            _add_leaf(
                current_l2,
                name=col_c,
                item_id=_parse_id(col_d) or 0,
                level=3,
                seen_keys=seen_keys,
            )
            continue

        # 兼容原参数表：一级 | 知识点 | 编号，或 空 | 知识点 | 编号
        legacy_id = _parse_id(col_c) or _parse_id(col_d)
        if col_b and legacy_id is not None:
            _add_leaf(
                current_l2 or current_l1,
                name=col_b,
                item_id=legacy_id,
                level=3 if current_l2 else 2,
                seen_keys=seen_keys,
            )
            continue

        # 在二级分组下，用两列写法补充三级知识点。
        nested_id = _parse_id(col_b)
        if current_l2 is not None and col_c and nested_id is not None:
            _add_leaf(
                current_l2,
                name=col_c,
                item_id=nested_id,
                level=3,
                seen_keys=seen_keys,
            )

    return tree


def _rollup(node: dict[str, Any]) -> list[int]:
    ids: list[int] = []
    if node.get("knowledge_id"):
        ids.append(int(node["knowledge_id"]))
    for child in node["children"]:
        ids.extend(_rollup(child))
    node["knowledge_ids"] = list(dict.fromkeys(ids))
    return node["knowledge_ids"]


def _read_workbook(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "knowledge_tree": [],
            "qtypes": [],
            "difficulties": [],
            "source_file": str(path),
            "available": False,
        }

    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        difficulties: list[dict[str, Any]] = []
        if "难度" in workbook.sheetnames:
            for row in workbook["难度"].iter_rows(min_row=2, values_only=True):
                name = _cell_text(row[0] if row else None)
                item_id = _parse_id(row[1] if len(row) > 1 else None)
                if name and item_id:
                    difficulties.append({"id": item_id, "name": name})

        qtypes: list[dict[str, Any]] = []
        if "题型" in workbook.sheetnames:
            for row in workbook["题型"].iter_rows(min_row=2, values_only=True):
                name = _cell_text(row[0] if row else None)
                item_id = _parse_id(row[1] if len(row) > 1 else None)
                if name and item_id:
                    qtypes.append({"id": item_id, "name": name})

        knowledge_tree: list[dict[str, Any]] = []
        if "知识点" in workbook.sheetnames:
            knowledge_tree = _parse_knowledge_sheet(workbook["知识点"])
        for node in knowledge_tree:
            _rollup(node)

        return {
            "knowledge_tree": knowledge_tree,
            "qtypes": qtypes,
            "difficulties": difficulties,
            "source_file": str(path),
            "available": True,
        }
    finally:
        workbook.close()


def load_config(force: bool = False) -> dict[str, Any]:
    global _cache, _cache_mtime
    try:
        mtime = CONFIG_XLSX_PATH.stat().st_mtime
    except FileNotFoundError:
        mtime = -1.0
    with _lock:
        if force or _cache is None or _cache_mtime != mtime:
            _cache = _read_workbook(CONFIG_XLSX_PATH)
            _cache_mtime = mtime
        return _cache


def export_config_workbook() -> bytes:
    from io import BytesIO

    config = load_config(force=True)
    workbook = Workbook()
    workbook.remove(workbook.active)

    sheet = workbook.create_sheet("难度")
    sheet.append(["难度", "ID"])
    for item in config["difficulties"]:
        sheet.append([item["name"], item["id"]])

    sheet = workbook.create_sheet("题型")
    sheet.append(["题型", "ID"])
    for item in config["qtypes"]:
        sheet.append([item["name"], item["id"]])

    sheet = workbook.create_sheet("知识点")
    sheet.append(["一级分类", "二级分类", "知识点", "ID"])

    def write_node(node: dict[str, Any], l1: str, l2: str) -> None:
        level = int(node.get("level") or 1)
        if node.get("knowledge_id"):
            if level >= 3:
                sheet.append([l1, l2, node["name"], node["knowledge_id"]])
            else:
                sheet.append([l1, node["name"], "", node["knowledge_id"]])
            return
        next_l1 = node["name"] if level == 1 else l1
        next_l2 = node["name"] if level == 2 else l2
        if level == 1:
            sheet.append([node["name"], "", "", ""])
        elif level == 2:
            sheet.append(["", node["name"], "", ""])
        for child in node["children"]:
            write_node(child, next_l1, next_l2)

    for root in config["knowledge_tree"]:
        write_node(root, "", "")

    output = BytesIO()
    workbook.save(output)
    return output.getvalue()
