#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${ENDLESSGROK_PORT:-4173}"
PID_FILE="$PROJECT_DIR/.endlessgrok-server.pid"
LOG_FILE="$PROJECT_DIR/.endlessgrok-server.log"
URL="http://127.0.0.1:${PORT}"

export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"
if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.nvm/nvm.sh"
fi

cd "$PROJECT_DIR"

find_npm() {
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi
  osascript -e 'display alert "Endless Grok" message "Node.js/npm not found. Install Node.js from https://nodejs.org and try again." as critical'
  exit 1
}

server_listening() {
  curl -sf --max-time 1 "$URL" >/dev/null 2>&1
}

pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

is_server_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if pid_running "$pid" && server_listening; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi

  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && server_listening; then
    return 0
  fi

  return 1
}

open_game() {
  open "$URL"
}

wait_for_server() {
  local attempt
  for attempt in $(seq 1 40); do
    if server_listening; then
      return 0
    fi
    sleep 0.25
  done
  return 1
}

start_server() {
  find_npm

  if [[ ! -d node_modules ]]; then
    npm install >>"$LOG_FILE" 2>&1
  fi

  if [[ ! -f dist/index.html ]] || [[ dist/index.html -ot package.json ]]; then
    npm run build >>"$LOG_FILE" 2>&1
  fi

  nohup npm run preview -- --port "$PORT" --strictPort --host 127.0.0.1 >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  if ! wait_for_server; then
    osascript -e "display alert \"Endless Grok\" message \"Server failed to start on port ${PORT}. Check ${LOG_FILE}.\" as critical"
    exit 1
  fi
}

if is_server_running; then
  open_game
else
  start_server
  open_game
fi