Set objShell = CreateObject("WScript.Shell")

' Script para arrancar n8n en una pestaña visible que no se cierra si hay error
objShell.Run "cmd.exe /k cd ""d:\Code\CitaInternet\citalocal-pwa"" && title n8n && npx n8n", 1, False

' Script para arrancar el webhook en una pestaña visible que no se cierra si hay error
objShell.Run "cmd.exe /k cd ""d:\Code\CitaInternet\citalocal-pwa"" && title Sincronizador && node scripts\webhook-sync.cjs", 1, False
