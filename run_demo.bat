@echo off
setlocal
cd /d "%~dp0"

set "BASH_EXE="

if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%ProgramFiles%\Git\usr\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\usr\bin\bash.exe"
if not defined BASH_EXE if exist "%LocalAppData%\Programs\Git\bin\bash.exe" set "BASH_EXE=%LocalAppData%\Programs\Git\bin\bash.exe"
if not defined BASH_EXE (
  for /f "delims=" %%B in ('where bash.exe 2^>nul') do (
    echo %%B | findstr /I "\\Git\\" >nul
    if not errorlevel 1 if not defined BASH_EXE set "BASH_EXE=%%B"
  )
)

if not defined BASH_EXE (
  echo Git Bash was not found.
  echo Install Git for Windows, then double-click this file again.
  pause
  exit /b 1
)

"%BASH_EXE%" "%~dp0run_demo.sh"
pause
