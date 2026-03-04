Set objShell = CreateObject("WScript.Shell")

' Script para arrancar n8n silenciosamente en el fondo
objShell.Run "cmd.exe /c cd ""d:\Code\CitaInternet\citalocal-pwa"" && npx -y n8n", 0, False

' Script para arrancar el webhook silenciosamente en el fondo
objShell.Run "cmd.exe /c cd ""d:\Code\CitaInternet\citalocal-pwa"" && node scripts\webhook-sync.cjs", 0, False
