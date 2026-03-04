@echo off
echo Iniciando n8n y el webhook sincronizador...
cd /d "d:\Code\CitaInternet\citalocal-pwa"

echo Iniciando Webhook en segundo plano...
start /B node scripts\webhook-sync.cjs

echo Iniciando n8n (esta ventana debe permanecer abierta)...
npx -y n8n

pause
