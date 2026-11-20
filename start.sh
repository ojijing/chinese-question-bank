#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q --break-system-packages -r requirements.txt
exec python3 main.py
