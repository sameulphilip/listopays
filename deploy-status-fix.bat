@echo off
setlocal
cd /d "%~dp0"
set HOST=147.93.40.224
set APP=/var/www/listopays-console

echo Packing changed files...
if exist status-fix.tar del status-fix.tar
tar -cf status-fix.tar src/middleware.ts src/components/shell.tsx src/app/payments/page.tsx src/app/api/refund/route.ts src/lib/payment-status.ts src/components/checkout-frame.tsx src/components/ui.tsx public/brand/checkout.js deploy/listopays-locations.conf deploy/apply_checkout_fix.sh
if errorlevel 1 goto fail

echo.
echo Uploading and deploying (enter the VPS password when asked)...
ssh -o StrictHostKeyChecking=accept-new root@%HOST% "cd %APP% && tar -xf - && sed -i 's/\r$//' deploy/apply_checkout_fix.sh && bash deploy/apply_checkout_fix.sh && echo && echo LISTOPAYS UPDATE DEPLOYED" < status-fix.tar
if errorlevel 1 goto fail

del status-fix.tar
echo.
echo Done.
pause
exit /b 0

:fail
echo.
echo Something went wrong - send a screenshot of this window.
pause
exit /b 1
