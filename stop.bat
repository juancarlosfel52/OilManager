@echo off
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5600"') do taskkill /F /PID %%a
echo Port 5600 stopped.
