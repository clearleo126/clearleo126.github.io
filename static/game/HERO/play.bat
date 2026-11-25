@echo off
cd /d "%~dp0"
echo Starting H.E.R.O. at http://127.0.0.1:8765/
start "" http://127.0.0.1:8765/
python -m http.server 8765
