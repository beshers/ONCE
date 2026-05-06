OCNE Desktop App for Windows

This ZIP contains the Avalonia/C# desktop app for OCNE.

How to use on Windows:
1. If antivirus blocks the standalone app, download OCNE-Desktop-App-Windows-Lite.zip.
2. Install the Microsoft .NET 8 Desktop Runtime if you use the Lite ZIP.
3. Extract the ZIP folder.
4. Run Start-OCNE-Desktop-Windows.cmd.
5. Sign in to OCNE and use the website inside the desktop program.

Windows package choices:
- OCNE-Desktop-App-Windows-Lite.zip: smaller, recommended when antivirus blocks the app, requires .NET 8 Desktop Runtime.
- OCNE-Desktop-App-Windows.zip: standalone, no .NET install, larger unsigned package.

Important:
Do not run OCNE.Desktop.exe directly from inside the ZIP preview.
Right-click the ZIP, choose Extract All, open the extracted folder, then run Start-OCNE-Desktop-Windows.cmd.
Windows must be able to see all DLL files in the extracted folder.

If Windows blocks the app:
1. Right-click Start-OCNE-Desktop-Windows.cmd or OCNE.Desktop.exe.
2. Open Properties.
3. Check Unblock if Windows shows it.
4. Click Apply, then run the app again.

If Microsoft Defender SmartScreen appears, choose More info, then Run anyway only if the file came from your OCNE Downloads page.

Important:
The OCNE Desktop App is currently unsigned. Some antivirus tools block unsigned apps because they are new or uncommon. The long-term fix is to sign the Windows app with a trusted code-signing certificate.

How to use on macOS:
1. Download OCNE-Desktop-App-macOS-Apple-Silicon.zip for M1/M2/M3/M4 Macs, or OCNE-Desktop-App-macOS-Intel.zip for Intel Macs.
2. Install the .NET 10 runtime if it is not already installed.
3. Extract the ZIP folder.
4. In Terminal, run: chmod +x ./OCNE.Desktop
5. Run: ./OCNE.Desktop
6. If macOS blocks it, open System Settings > Privacy & Security and allow the app.

This app opens:
https://ocne.onrender.com/

The desktop app is different from the OCNE Desktop Agent:
- OCNE Desktop App: opens the website as a native desktop program.
- OCNE Desktop Agent: connects terminal/local computer features to OCNE.
