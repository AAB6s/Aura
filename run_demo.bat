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

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo ffmpeg not found. Attempting to install with winget...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo winget not found. Install ffmpeg manually and re-run this file.
  ) else (
    winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
  )
)

for /f "delims=" %%F in ('where ffmpeg 2^>nul') do (
  set "FFMPEG_PATH=%%F"
  goto :ffmpeg_found
)

if not defined FFMPEG_PATH if exist "C:\ffmpeg\bin\ffmpeg.exe" set "FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe"
if not defined FFMPEG_PATH if exist "%LocalAppData%\Microsoft\WinGet\Packages" (
  for /f "delims=" %%F in ('dir /b /s "%LocalAppData%\Microsoft\WinGet\Packages\*ffmpeg*\ffmpeg.exe" 2^>nul') do (
    set "FFMPEG_PATH=%%F"
    goto :ffmpeg_found
  )
)

:ffmpeg_found
if defined FFMPEG_PATH (
  for %%D in ("%FFMPEG_PATH%") do set "FFMPEG_DIR=%%~dpD"
  if defined FFMPEG_DIR set "PATH=%FFMPEG_DIR%;%PATH%"
  set "FFMPEG_BIN=%FFMPEG_PATH%"
 ) else (
  echo ffmpeg introuvable. Verifiez l'installation ou ajoutez-le au PATH.
)

"%BASH_EXE%" "%~dp0run_demo.sh"
pause
