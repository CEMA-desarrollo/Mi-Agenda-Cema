Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")

' Buscar procesos de Node.exe que contengan n8n
Set colN8n = objWMIService.ExecQuery("Select * From Win32_Process Where CommandLine Like '%n8n%' AND Name = 'node.exe'")
isN8nRunning = False
If colN8n.Count > 0 Then
    isN8nRunning = True
End If

' Buscar procesos de Node.exe que contengan webhook-sync
Set colWebhook = objWMIService.ExecQuery("Select * From Win32_Process Where CommandLine Like '%webhook-sync%' AND Name = 'node.exe'")
isWebhookRunning = False
If colWebhook.Count > 0 Then
    isWebhookRunning = True
End If

msg = ""
If isN8nRunning Then
    msg = msg & "[ OK ] n8n esta CORRIENDO." & vbCrLf
Else
    msg = msg & "[ ERROR ] n8n NO esta corriendo." & vbCrLf
End If

msg = msg & vbCrLf

If isWebhookRunning Then
    msg = msg & "[ OK ] Sincronizador esta CORRIENDO." & vbCrLf
Else
    msg = msg & "[ ERROR ] Sincronizador NO esta corriendo." & vbCrLf
End If

MsgBox msg, 64, "Estado de Servicios CitaLocal"
