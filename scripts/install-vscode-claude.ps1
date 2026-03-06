<#
.SYNOPSIS
    VSCode + Claude Code - Reinstall Script
.DESCRIPTION
    Installs VSCode and Claude Code. Optionally restores backed-up extensions.
#>

param(
    [switch]$RestoreExtensions
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VSCode + Claude Code Install" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Install VSCode ---
Write-Host "[1/4] Installing VSCode..." -ForegroundColor Yellow

$hasWinget = Get-Command winget -ErrorAction SilentlyContinue
if ($hasWinget) {
    winget install Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements
    Write-Host "  -> Installed via winget" -ForegroundColor Green
} else {
    Write-Host "  -> winget not found. Downloading installer..." -ForegroundColor DarkYellow
    $installerUrl = "https://update.code.visualstudio.com/latest/win32-x64-user/stable"
    $installerPath = "$env:TEMP\VSCodeSetup.exe"
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    Start-Process -FilePath $installerPath -ArgumentList "/VERYSILENT /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,addtopath" -Wait
    Remove-Item $installerPath -Force
    Write-Host "  -> Installed via direct download" -ForegroundColor Green
}

# --- Refresh PATH ---
Write-Host "[2/4] Refreshing PATH..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# --- Install Claude Code ---
Write-Host "[3/4] Installing Claude Code..." -ForegroundColor Yellow
npm install -g @anthropic-ai/claude-code
Write-Host "  -> Claude Code installed" -ForegroundColor Green

# --- Restore extensions ---
if ($RestoreExtensions) {
    $backupPath = "$env:USERPROFILE\Desktop\vscode-extensions-backup.txt"
    Write-Host "[4/4] Restoring VSCode extensions..." -ForegroundColor Yellow
    if (Test-Path $backupPath) {
        $extensions = Get-Content $backupPath
        $total = $extensions.Count
        $current = 0
        foreach ($ext in $extensions) {
            $current++
            if ($ext.Trim() -ne "") {
                Write-Host "  -> [$current/$total] $ext" -ForegroundColor DarkGray
                & code --install-extension $ext --force 2>$null
            }
        }
        Write-Host "  -> Extensions restored ($total total)" -ForegroundColor Green
    } else {
        Write-Host "  -> Backup file not found: $backupPath" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "[4/4] Extension restore skipped (use -RestoreExtensions to enable)" -ForegroundColor DarkGray
}

# --- Verify installation ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Verification" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

try {
    $vscodeVer = & code --version 2>$null | Select-Object -First 1
    Write-Host "  VSCode:      $vscodeVer" -ForegroundColor Green
} catch {
    Write-Host "  VSCode:      Restart terminal to verify" -ForegroundColor DarkYellow
}

try {
    $claudeVer = & claude --version 2>$null
    Write-Host "  Claude Code: $claudeVer" -ForegroundColor Green
} catch {
    Write-Host "  Claude Code: Restart terminal to verify" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Installation complete. Please restart your terminal." -ForegroundColor Cyan
