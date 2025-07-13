@echo off
chcp 65001 >nul
cd /d "D:\VibeCoding_pgm\VibeDocs_MCP"
set SILICONFLOW_API_KEY=your-api-key-here
node dist/src/index.js
pause