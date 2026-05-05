$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $PSScriptRoot "OCNE.Desktop.csproj"
$downloadsDir = Join-Path $projectRoot "public\downloads"

$targets = @(
  @{ Rid = "osx-arm64"; Zip = "OCNE-Desktop-App-macOS-Apple-Silicon.zip" },
  @{ Rid = "osx-x64"; Zip = "OCNE-Desktop-App-macOS-Intel.zip" }
)

New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null

foreach ($target in $targets) {
  $publishDir = Join-Path $PSScriptRoot ("publish\" + $target.Rid)
  $zipPath = Join-Path $downloadsDir $target.Zip

  dotnet publish $projectPath -c Release -r $target.Rid --self-contained false -o $publishDir

  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath -Force
  Write-Host "Created $zipPath"
}
