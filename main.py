#!/usr/bin/env python3
from __future__ import annotations

import os

import uvicorn

from backend.app.main import app


if __name__ == "__main__":
    reload_enabled = os.getenv("RELOAD", "").lower() in {"1", "true", "yes"}
    uvicorn.run(
        "main:app" if reload_enabled else app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=reload_enabled,
    )
