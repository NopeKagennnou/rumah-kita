<#
.SYNOPSIS
  Rumah Kita — Safe Local Windows Directory Sync & Anti-Leak Publisher
.DESCRIPTION
  Safely syncs source files from your local Windows installation directory
  (e.g., "$env:LOCALAPPDATA\Programs\Rumah Kita") into this Git repository
  while strictly excluding binaries (.exe, .dll), local SQLite/JSON databases,
  .env secrets, logs, and personal AppData paths.
#>

param(
  [string]$SourcePath = "$env:LOCALAPPDATA\Programs\Rumah Kita"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Rumah Kita — Safe Local Windows Sync & Privacy Guard" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if (-not (Test-Path -Path $SourcePath)) {
  Write-Warning "Local folder not found at: $SourcePath"
  exit 1
}

$ExcludedExtensions = @(
  ".exe", ".dll", ".pdb", ".pak", ".bin", ".dat", ".asar",
  ".db", ".sqlite", ".sqlite3", ".log", ".pem", ".key", ".pfx"
)

$ExcludedDirs = @(
  "node_modules", ".git", "data", "userData", "AppData", "logs", "locales", "swiftshader"
)

Write-Host "[1/3] Scanning $SourcePath for safe source files (excluding binaries & personal data)..." -ForegroundColor Yellow

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$SyncedCount = 0

Get-ChildItem -Path $SourcePath -Recurse -File | ForEach-Object {
  $File = $_
  $RelPath = $File.FullName.Substring($SourcePath.Length).TrimStart('\', '/')
  $TopDir = ($RelPath -split '[\\/]' | Select-Object -First 1)

  if ($ExcludedDirs -contains $TopDir) { return }
  if ($ExcludedExtensions -contains $File.Extension.ToLower()) { return }
  if ($File.Name -like ".env*" -and $File.Name -ne ".env.example") { return }

  $DestFile = Join-Path $RepoRoot $RelPath
  $DestDir = Split-Path $DestFile -Parent
  if (-not (Test-Path $DestDir)) {
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
  }

  # Read and redact any accidental hardcoded Windows user paths before copying
  $RawContent = Get-Content -Path $File.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -ne $RawContent) {
    $Sanitized = $RawContent -replace '[A-Za-z]:\\Users\\[^\\\s"'']+', '<REDACTED_USER_PATH>'
    Set-Content -Path $DestFile -Value $Sanitized -Encoding UTF8
    $SyncedCount++
  }
}

Write-Host "[2/3] Synced and sanitized $SyncedCount source file(s)." -ForegroundColor Green
Write-Host "[3/3] Running Privacy Guard & Test Suite..." -ForegroundColor Yellow
node "$RepoRoot\scripts\lint-and-audit.js"
node --test "$RepoRoot\tests\*.test.js"

Write-Host "Done! You can now run: git status && git commit -am 'Update' && git push" -ForegroundColor Green
