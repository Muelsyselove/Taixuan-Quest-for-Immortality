#!/usr/bin/env bash
# 太玄问道 · 一键启动（Linux / macOS）
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "[太玄问道] 首次运行，正在安装依赖……"
  npm install
fi
exec npm start
