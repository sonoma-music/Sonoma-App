#!/bin/sh
# Dev-only: full-resolution screenshot with headless Chrome. Usage: dev/shot.sh <url> <out.png> [w] [h]
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=${5:-1} --window-size=${3:-1200},${4:-780} --virtual-time-budget=4000 --screenshot="$2" "$1" 2>/dev/null
