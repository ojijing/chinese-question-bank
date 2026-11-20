from __future__ import annotations

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, APP_VERSION, STATIC_DIR
from .routers import config, databases, exports, meta, papers, questions

BUILD_DIR = STATIC_DIR / "app"

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="初中语文题库重建版：组卷、试题篮、试卷浏览、编辑与 DOCX 导出。",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(papers.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(databases.router, prefix="/api")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if (BUILD_DIR / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=BUILD_DIR / "assets"),
        name="frontend-assets",
    )


def _frontend_index() -> FileResponse | HTMLResponse:
    index = BUILD_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse(
        """
        <!doctype html><html lang="zh-CN"><meta charset="utf-8">
        <title>初中语文智能题库</title>
        <body style="font-family:sans-serif;padding:48px;background:#f7f3eb;color:#17221d">
          <h1>后端已启动</h1>
          <p>前端尚未构建。请运行 <code>cd frontend && npm install && npm run build</code>。</p>
        </body></html>
        """
    )


@app.get("/", include_in_schema=False)
def home() -> Response:
    return _frontend_index()


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str) -> Response:
    if full_path.startswith("api/"):
        return HTMLResponse("Not Found", status_code=404)
    requested = (BUILD_DIR / full_path).resolve()
    try:
        requested.relative_to(BUILD_DIR.resolve())
    except ValueError:
        return HTMLResponse("Forbidden", status_code=403)
    if requested.is_file():
        return FileResponse(requested)
    return _frontend_index()
