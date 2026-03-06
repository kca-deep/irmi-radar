#!/bin/bash
# Claude Code 실행 시 VSCode 창 다중 생성 방지 스크립트
# VSCode 환경변수 + PATH에서 VSCode 경로를 모두 제거한 뒤 claude를 실행

# 1. VSCode 환경변수 제거
unset TERM_PROGRAM
unset TERM_PROGRAM_VERSION
unset VSCODE_GIT_ASKPASS_NODE
unset VSCODE_GIT_ASKPASS_MAIN
unset VSCODE_GIT_ASKPASS_EXTRA_ARGS
unset VSCODE_GIT_IPC_HANDLE
unset VSCODE_INJECTION
unset VSCODE_PYTHON_AUTOACTIVATE_GUARD
unset GIT_ASKPASS
unset ELECTRON_RUN_AS_NODE

# 2. PATH에서 VSCode 관련 경로 제거
export PATH=$(echo "$PATH" | tr ':' '\n' | grep -iv "vs code" | tr '\n' ':' | sed 's/:$//')

echo "[claude-clean] VSCode env vars removed"
echo "[claude-clean] PATH cleaned: $(echo $PATH | tr ':' '\n' | grep -ic 'code') VSCode paths remaining"

claude "$@"
