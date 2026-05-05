$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $PSScriptRoot "OCNE.Desktop.csproj"
$publishDir = Join-Path $PSScriptRoot "publish\win-x64"
$downloadsDir = Join-Path $projectRoot "public\downloads"
$zipPath = Join-Path $downloadsDir "OCNE-Desktop-App-Windows.zip"

dotnet publish $projectPath -c Release -r win-x64 --self-contained false -o $publishDir

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null
Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath -Force

Write-Host "Created $zipPath"
