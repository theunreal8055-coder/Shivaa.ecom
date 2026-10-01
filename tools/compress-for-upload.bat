@echo off
REM ============================================================
REM  SHIVAA — compress footage for GitHub upload  (double-click)
REM  Put webcam.mp4 and screen.mp4 in THIS folder, then run me.
REM  Output: upload\webcam.mp4  and  upload\screen.mp4
REM ============================================================
setlocal
cd /d "%~dp0"
echo.
echo  SHIVAA footage compressor
echo  =========================
echo.

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo  ffmpeg not found - installing it once via winget...
  winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
  echo.
  echo  ffmpeg installed. CLOSE this window, open it again and double-click me once more.
  pause
  exit /b
)

if not exist "upload" mkdir upload

if exist "webcam.mp4" (
  echo  [1/2] compressing webcam.mp4 ...
  ffmpeg -y -i "webcam.mp4" -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 26 -preset veryfast -c:a aac -b:a 128k "upload\webcam.mp4"
) else (
  echo  [1/2] webcam.mp4 not found in this folder - skipped
)

if exist "screen.mp4" (
  echo  [2/2] compressing screen.mp4 ...
  ffmpeg -y -i "screen.mp4" -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 28 -preset veryfast -an "upload\screen.mp4"
) else (
  echo  [2/2] screen.mp4 not found in this folder - skipped
)

echo.
echo  DONE. Files are in the "upload" folder:
dir /-c "upload\*.mp4" | find ".mp4"
echo.
echo  Next: upload those two files to GitHub
echo    repo -^> Add file -^> Upload files -^> branch arena/01a0d958-shivaa-ecom -^> media/ folder
echo.
pause
