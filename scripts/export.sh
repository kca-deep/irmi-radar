#!/bin/bash
# ============================================================
# IRMI Radar - 제출용 소스코드 패키징 스크립트
# 컴파일 산출물 및 민감정보를 제외하고 zip 파일로 압축
# 사용법: bash scripts/export.sh
# ============================================================

set -e

# 프로젝트 루트 디렉토리 (스크립트 위치 기준)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="irmi-radar"
EXPORT_DIR="$PROJECT_ROOT/export"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_FILENAME="${PROJECT_NAME}_${TIMESTAMP}.zip"

# Windows 경로 변환 (Git Bash /c/... -> C:\...)
WIN_PROJECT_ROOT=$(cd "$PROJECT_ROOT" && pwd -W 2>/dev/null || echo "$PROJECT_ROOT")
WIN_EXPORT_DIR="$WIN_PROJECT_ROOT\\export"
WIN_ZIP_PATH="$WIN_EXPORT_DIR\\$ZIP_FILENAME"

echo "============================================"
echo "  IRMI Radar - 제출용 소스코드 패키징"
echo "============================================"
echo ""
echo "프로젝트 경로: $PROJECT_ROOT"
echo "출력 파일: export/$ZIP_FILENAME"
echo ""

# 1. export 디렉토리 생성
mkdir -p "$EXPORT_DIR"

# 2. PowerShell을 사용하여 제외 목록 기반 zip 생성
echo "[1/3] 소스코드 압축 중..."

powershell -NoProfile -Command "
  \$ErrorActionPreference = 'Stop'

  \$projectRoot = '$WIN_PROJECT_ROOT'
  \$zipPath = '$WIN_ZIP_PATH'
  \$projectName = '$PROJECT_NAME'

  # 제외할 디렉토리 목록
  \$excludeDirs = @(
    'node_modules',
    '.next',
    '.git',
    '.claude',
    '.vscode',
    '.idea',
    '.vercel',
    '.playwright-mcp',
    'data',
    'export',
    'out',
    'build',
    'coverage',
    '.turbo',
    'ui design'
  )

  # 제외할 파일 패턴 목록
  \$excludeFilePatterns = @(
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '.mcp.json',
    '*.pem',
    '*.db',
    '*.db-shm',
    '*.db-wal',
    '*.tsbuildinfo',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '.pnpm-debug.log*',
    '.DS_Store',
    'next-env.d.ts',
    'snapshot.md'
  )

  # 임시 디렉토리 생성
  \$tempDir = Join-Path \$env:TEMP \"irmi-export-\$((Get-Date).ToString('yyyyMMdd_HHmmss'))\"
  \$tempProject = Join-Path \$tempDir \$projectName
  New-Item -ItemType Directory -Path \$tempProject -Force | Out-Null

  Write-Host '  파일 복사 중...'

  # 모든 파일/폴더 가져오기
  \$items = Get-ChildItem -Path \$projectRoot -Force

  foreach (\$item in \$items) {
    \$name = \$item.Name

    # 디렉토리 제외 체크
    if (\$item.PSIsContainer -and \$excludeDirs -contains \$name) {
      continue
    }

    # 파일 제외 체크
    if (-not \$item.PSIsContainer) {
      \$skip = \$false
      foreach (\$pattern in \$excludeFilePatterns) {
        if (\$name -like \$pattern) {
          \$skip = \$true
          break
        }
      }
      if (\$skip) { continue }
    }

    # 복사
    \$dest = Join-Path \$tempProject \$name
    if (\$item.PSIsContainer) {
      Copy-Item -Path \$item.FullName -Destination \$dest -Recurse -Force
    } else {
      Copy-Item -Path \$item.FullName -Destination \$dest -Force
    }
  }

  # 복사된 디렉토리 내부의 제외 대상 제거 (중첩된 node_modules 등)
  Get-ChildItem -Path \$tempProject -Recurse -Directory -Force -ErrorAction SilentlyContinue |
    Where-Object { \$excludeDirs -contains \$_.Name } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

  # 복사된 디렉토리 내부의 제외 파일 제거
  foreach (\$pattern in \$excludeFilePatterns) {
    Get-ChildItem -Path \$tempProject -Recurse -File -Force -Filter \$pattern -ErrorAction SilentlyContinue |
      Remove-Item -Force -ErrorAction SilentlyContinue
  }

  Write-Host '  zip 압축 중...'

  # 기존 zip 파일 제거
  if (Test-Path \$zipPath) {
    Remove-Item \$zipPath -Force
  }

  # zip 생성
  Compress-Archive -Path \$tempProject -DestinationPath \$zipPath -CompressionLevel Optimal

  # 임시 디렉토리 정리
  Remove-Item -Path \$tempDir -Recurse -Force

  Write-Host '  완료'
"

# 3. 검증
echo ""
echo "[2/3] 검증 중..."

ZIP_PATH="$EXPORT_DIR/$ZIP_FILENAME"
if [ -f "$ZIP_PATH" ]; then
  FILE_SIZE=$(du -h "$ZIP_PATH" | cut -f1)

  # 민감정보 포함 여부 검증
  HAS_ISSUE=false

  CONTENTS=$(powershell -NoProfile -Command "
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    \$zip = [System.IO.Compression.ZipFile]::OpenRead('$WIN_ZIP_PATH')
    \$zip.Entries | ForEach-Object { \$_.FullName }
    \$zip.Dispose()
  " 2>/dev/null || echo "")

  for pattern in ".env.local" ".env.development" ".env.production" ".env.test" "node_modules/" ".next/" ".git/" ".mcp.json"; do
    if echo "$CONTENTS" | grep -qi "$pattern"; then
      echo "  [!!] 민감 파일 포함 감지: $pattern"
      HAS_ISSUE=true
    fi
  done

  if [ "$HAS_ISSUE" = false ]; then
    echo "  민감정보 미포함 확인 완료"
  else
    echo ""
    echo "  [!!] 민감정보가 포함되어 있습니다. 확인 후 재패키징하세요."
    exit 1
  fi

  echo ""
  echo "[3/3] 패키징 완료"
  echo ""
  echo "============================================"
  echo "  파일: export/$ZIP_FILENAME"
  echo "  크기: $FILE_SIZE"
  echo ""
  echo "  구글 드라이브에 업로드하세요."
  echo "============================================"
else
  echo "[ERROR] zip 파일 생성 실패"
  exit 1
fi
