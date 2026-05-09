param(
  [string]$ApiUrl = $env:VITE_API_URL
)

$ErrorActionPreference = "Stop"

if (-not $ApiUrl) {
  throw "VITE_API_URL is required. Example: .\scripts\package-windows-program.ps1 -ApiUrl https://api.example.com"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$appDir = Join-Path $root "apps\windows"
$desktopAppDir = Join-Path $appDir "app"
$downloadDir = Join-Path $root "public\downloads"

Push-Location $root
try {
  $env:VITE_APP_RUNTIME = "desktop"
  $env:VITE_BASE_PATH = "./"
  $env:VITE_API_URL = $ApiUrl
  npm run build

  if (Test-Path $desktopAppDir) {
    Remove-Item -LiteralPath $desktopAppDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $desktopAppDir | Out-Null
  Copy-Item -Path (Join-Path $root "dist\public\*") -Destination $desktopAppDir -Recurse -Force
  $bundledDownloads = Join-Path $desktopAppDir "downloads"
  if (Test-Path $bundledDownloads) {
    Remove-Item -LiteralPath $bundledDownloads -Recurse -Force
  }

  Push-Location $appDir
  try {
    if (-not (Test-Path "node_modules")) {
      npm install
    }
    npm run package:win
  }
  finally {
    Pop-Location
  }

  New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
  $installer = Get-ChildItem -Path (Join-Path $appDir "release") -Filter "OCNE-Windows-Program-Setup-*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $installer) {
    throw "The Windows program installer was not created."
  }

  Copy-Item -LiteralPath $installer.FullName -Destination (Join-Path $downloadDir "OCNE-Windows-Program-Setup.exe") -Force
  Write-Host "Created public\downloads\OCNE-Windows-Program-Setup.exe"
}
finally {
  Pop-Location
}
