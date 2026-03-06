#Requires -RunAsAdministrator
<#
.SYNOPSIS
    VSCode + Claude Code - Complete Uninstall Script
.DESCRIPTION
    Completely removes VSCode and Claude Code including settings, cache, and extensions.
    Run with PowerShell as Administrator.
#>

param(
    [switch]$BackupExtensions
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VSCode + Claude Code Uninstall" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Extension backup ---
if ($BackupExtensions) {
    $backupPath = "$env:USERPROFILE\Desktop\vscode-extensions-backup.txt"
    Write-Host "[1/6] Backing up extensions..." -ForegroundColor Yellow
    & code --list-extensions 2>$null | Out-File -FilePath $backupPath -Encoding UTF8
    if (Test-Path $backupPath) {
        Write-Host "  -> Backup saved: $backupPath" -ForegroundColor Green
    } else {
        Write-Host "  -> Skipped (VSCode CLI not found)" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "[1/6] Extension backup skipped (use -BackupExtensions to enable)" -ForegroundColor DarkGray
}

# --- Kill processes ---
Write-Host "[2/6] Stopping running processes..." -ForegroundColor Yellow
$processes = @("Code", "claude")
foreach ($proc in $processes) {
    $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($running) {
        Stop-Process -Name $proc -Force
        Write-Host "  -> $proc stopped" -ForegroundColor Green
    }
}

# --- Run VSCode uninstaller ---
Write-Host "[3/6] Running VSCode uninstaller..." -ForegroundColor Yellow
$uninstallers = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\unins000.exe",
    "$env:ProgramFiles\Microsoft VS Code\unins000.exe"
)
$found = $false
foreach ($uninstaller in $uninstallers) {
    if (Test-Path $uninstaller) {
        Write-Host "  -> Found: $uninstaller"
        Start-Process -FilePath $uninstaller -ArgumentList "/SILENT" -Wait
        $found = $true
        Write-Host "  -> Uninstall complete" -ForegroundColor Green
        break
    }
}
if (-not $found) {
    Write-Host "  -> Uninstaller not found (folders will be deleted below)" -ForegroundColor DarkYellow
}

# --- Delete VSCode folders ---
Write-Host "[4/6] Deleting VSCode settings/cache/extensions..." -ForegroundColor Yellow
$vscodePaths = @(
    "$env:APPDATA\Code",
    "$env:USERPROFILE\.vscode",
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code",
    "$env:ProgramFiles\Microsoft VS Code",
    "$env:LOCALAPPDATA\Microsoft\vscode-cpptools"
)
foreach ($path in $vscodePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "  -> Deleted: $path" -ForegroundColor Green
    }
}

# --- Remove Claude Code ---
Write-Host "[5/6] Removing Claude Code..." -ForegroundColor Yellow
$npmResult = & npm uninstall -g @anthropic-ai/claude-code 2>&1
Write-Host "  -> npm uninstall done"

$claudePaths = @(
    "$env:USERPROFILE\.claude",
    "$env:LOCALAPPDATA\claude-code",
    "$env:APPDATA\claude-code",
    "$env:LOCALAPPDATA\claude",
    "$env:APPDATA\claude"
)
foreach ($path in $claudePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "  -> Deleted: $path" -ForegroundColor Green
    }
}

# --- Registry cleanup ---
Write-Host "[6/6] Cleaning registry..." -ForegroundColor Yellow
$regPaths = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{771FD6B0-FA20-440A-A002-3B3BAC16DC50}_is1",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{D628A17A-9713-46BF-8D57-E671B46A741E}_is1"
)
foreach ($reg in $regPaths) {
    if (Test-Path $reg) {
        Remove-Item -Path $reg -Recurse -Force
        Write-Host "  -> Registry removed: $reg" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Uninstall complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Run install-vscode-claude.ps1 to reinstall." -ForegroundColor Cyan
