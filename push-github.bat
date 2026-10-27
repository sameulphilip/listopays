@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install it from https://git-scm.com/download/win then run this again.
  pause
  exit /b 1
)
if not exist .git (
  git init -b main
  git remote add origin https://github.com/sameulphilip/listopays.git
)
git add -A
git reset -q -- .env.local data/store.json 2>nul
git -c user.name="sameulphilip" -c user.email="cowdlly.ds@gmail.com" commit -m "Show failed payment status in red and sync failed payments from gateway"
git branch -M main
git pull --rebase --allow-unrelated-histories origin main 2>nul
git push -u origin main
echo.
pause
