@echo off
echo.
echo  OilManager — Starting Server
echo  ─────────────────────────────
echo.

REM Install dependencies if node_modules missing
IF NOT EXIST node_modules (
  echo  Installing dependencies...
  call npm install
  echo.
)

echo  Server running at http://localhost:5600
echo  SMS Dispatch at  http://localhost:5600/sms-dispatch.html
echo.
start http://localhost:5600
node server.js
