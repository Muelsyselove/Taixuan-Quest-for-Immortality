@echo off
rem 太玄问道 · 一键启动（Windows）
cd /d "%~dp0"
if not exist node_modules (
  echo [太玄问道] 首次运行，正在安装依赖……
  call npm install
  if errorlevel 1 (
    echo [太玄问道] 依赖安装失败，请检查 Node.js 与网络后重试。
    pause
    exit /b 1
  )
)
npm start
