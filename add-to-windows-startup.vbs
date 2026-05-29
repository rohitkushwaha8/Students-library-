' ═══════════════════════════════════════════════════════
'   A.R. Library — Windows Startup Me Add Karta Hai
'   Double click karo — ek baar kaam ho jayega
' ═══════════════════════════════════════════════════════

Dim WshShell, startupFolder, scriptDir, batPath, shortcutPath, oShortcut

WshShell = CreateObject("WScript.Shell")

' Current folder (jahan ye script hai)
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' Windows Startup folder path
startupFolder = WshShell.SpecialFolders("Startup")

' Shortcut path
shortcutPath = startupFolder & "\AR-Library-Server.lnk"

' start-server.bat ka path
batPath = scriptDir & "start-server.bat"

' Shortcut banana
Set oShortcut = WshShell.CreateShortcut(shortcutPath)
oShortcut.TargetPath = batPath
oShortcut.WorkingDirectory = scriptDir
oShortcut.WindowStyle = 7  ' Minimized window
oShortcut.Description = "A.R. Library Server Auto Start"
oShortcut.Save

MsgBox "✅ A.R. Library server Windows Startup mein add ho gaya!" & vbCrLf & vbCrLf & _
       "Ab har baar PC start hone pe server automatically chalu ho jayega." & vbCrLf & vbCrLf & _
       "App: http://localhost:5000", vbInformation, "A.R. Library Setup"
