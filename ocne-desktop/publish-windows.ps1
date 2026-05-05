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
