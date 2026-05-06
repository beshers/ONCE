$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $PSScriptRoot "OCNE.Desktop.csproj"
$publishDir = Join-Path $PSScriptRoot "publish\win-x64"
$litePublishDir = Join-Path $PSScriptRoot "publish\win-x64-lite"
$downloadsDir = Join-Path $projectRoot "public\downloads"
$zipPath = Join-Path $downloadsDir "OCNE-Desktop-App-Windows.zip"
$liteZipPath = Join-Path $downloadsDir "OCNE-Desktop-App-Windows-Lite.zip"

dotnet publish $projectPath -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -o $publishDir
dotnet publish $projectPath -c Release -r win-x64 --self-contained false -p:PublishSingleFile=false -o $litePublishDir

function Add-WindowsLaunchFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetDir,
    [Parameter(Mandatory = $true)]
    [string]$PackageName,
    [Parameter(Mandatory = $true)]
    [bool]$RequiresDotNet
  )

  $launcherPath = Join-Path $TargetDir "Start-OCNE-Desktop-Windows.cmd"
  $readmePath = Join-Path $TargetDir "README-START-HERE.txt"
  $runtimeText = if ($RequiresDotNet) {
    "This Lite package requires the Microsoft .NET 8 Desktop Runtime."
  } else {
    "This Standalone package includes the .NET 8 runtime."
  }

  @"
@echo off
setlocal
cd /d "%~dp0"
echo Starting OCNE Desktop...
echo.
if not exist "OCNE.Desktop.exe" (
  echo OCNE.Desktop.exe was not found.
  echo Please extract the whole ZIP into one folder, then run this file again.
  pause
  exit /b 1
)
start "" "%~dp0OCNE.Desktop.exe"
if errorlevel 1 (
  echo.
  echo Windows could not start OCNE Desktop.
  echo Fixes to try:
  echo 1. Right-click the ZIP and choose Extract All before running the app.
  echo 2. If Windows shows SmartScreen, choose More info, then Run anyway.
  echo 3. Install Microsoft Edge WebView2 Runtime from Microsoft.
  if "$RequiresDotNet"=="True" echo 4. Install Microsoft .NET 8 Desktop Runtime.
  pause
  exit /b 1
)
endlocal
"@ | Set-Content -LiteralPath $launcherPath -Encoding ASCII

  @"
OCNE Desktop for Windows
Package: $PackageName

How to open:
1. Right-click the downloaded ZIP and choose Extract All.
2. Open the extracted folder.
3. Double-click Start-OCNE-Desktop-Windows.cmd.

Do not run OCNE.Desktop.exe directly from inside the ZIP preview.
Windows must be able to see all DLL files in this folder.

$runtimeText

If Windows blocks the app:
- Click More info, then Run anyway.
- Or use the Windows Lite download if antivirus blocks the Standalone package.
- Install Microsoft Edge WebView2 Runtime if the window opens blank or closes.

The app opens:
https://ocne.onrender.com/
"@ | Set-Content -LiteralPath $readmePath -Encoding ASCII
}

Add-WindowsLaunchFiles -TargetDir $publishDir -PackageName "OCNE Desktop App for Windows Standalone" -RequiresDotNet $false
Add-WindowsLaunchFiles -TargetDir $litePublishDir -PackageName "OCNE Desktop App for Windows Lite" -RequiresDotNet $true

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

if (Test-Path -LiteralPath $liteZipPath) {
  Remove-Item -LiteralPath $liteZipPath -Force
}

New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null
Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath -Force
Compress-Archive -Path (Join-Path $litePublishDir "*") -DestinationPath $liteZipPath -Force

Write-Host "Created $zipPath"
Write-Host "Created $liteZipPath"
