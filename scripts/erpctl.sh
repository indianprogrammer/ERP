#!/usr/bin/env bash
# X3M ERP service control — start / stop / restart / status for the API (+ MCP) and MariaDB.
#
#   ./scripts/erpctl.sh start      Boot MariaDB (if needed) + API server (incl. HTTP MCP at /api/mcp)
#   ./scripts/erpctl.sh stop       Stop the API server (add --db to also stop MariaDB)
#   ./scripts/erpctl.sh restart    Stop + start
#   ./scripts/erpctl.sh status     DB, API process, HTTP health, MCP endpoint
#   ./scripts/erpctl.sh logs       Tail the API server log (Ctrl-C to exit)
#   ./scripts/erpctl.sh mcp        Run the stdio MCP server in the foreground (for agent debugging)
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN="$ROOT/.run"
LOG_DIR="$ROOT/logs"
SERVER_LOG="$LOG_DIR/server.log"
PID_FILE="$RUN/erp-server.pid"
SOCK="/tmp/erp-mysql.sock"

mkdir -p "$RUN" "$LOG_DIR"

# --- config: ERP_HOST/ERP_PORT > shell HOST/PORT > .env > default ---
env_kv() { grep -E "^$1=" "$ROOT/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d ' "'; }
HOST="${HOST:-$(env_kv HOST)}"; HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-$(env_kv PORT)}"; PORT="${PORT:-3000}"
[ -n "${ERP_HOST:-}" ] && HOST="$ERP_HOST"
[ -n "${ERP_PORT:-}" ] && PORT="$ERP_PORT"
# bind-all addresses can't be dialled back — health checks go to loopback
case "$HOST" in 0.0.0.0|::|'') DIAL=127.0.0.1 ;; *) DIAL=$HOST ;; esac
BASE="http://$DIAL:$PORT"

c_ok()   { printf '\033[32m%s\033[0m\n' "$*"; }
c_bad()  { printf '\033[31m%s\033[0m\n' "$*"; }
c_warn() { printf '\033[33m%s\033[0m\n' "$*"; }
c_info() { printf '\033[36m%s\033[0m\n' "$*"; }

# PID of the API server — pid file first, then whatever holds the port/process
port_pid() {
  local pid="" p cwd
  pid=$(ss -ltnpH "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)
  [ -z "$pid" ] && pid=$(fuser "$PORT/tcp" 2>/dev/null | awk '{print $1}')
  if [ -z "$pid" ]; then
    # ss/fuser can miss detached processes — scan /proc for a node binary
    # running server.js with cwd=$ROOT (pgrep -x node: exact name only, never our own shell)
    for p in $(pgrep -x node 2>/dev/null); do
      [ -d "/proc/$p" ] || continue
      case "$(tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null)" in *server.js*)
        cwd=$(readlink -f "/proc/$p/cwd" 2>/dev/null)
        [ "$cwd" = "$ROOT" ] && { pid=$p; break; }
      esac
    done
  fi
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && echo "$pid" && return 0
  return 1
}

# Managed PID (pid file), falling back to whatever holds the port
server_pid() {
  if [ -f "$PID_FILE" ]; then
    local pid; pid=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then echo "$pid"; return 0; fi
  fi
  port_pid
}

kill_pid() {
  local pid=$1 i p
  kill "$pid" 2>/dev/null
  for i in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.3; done
  kill -9 "$pid" 2>/dev/null || true
  # sweep any leftover instance of our server.js (e.g. pid-file drift)
  for _ in 1 2 3; do
    p=$(port_pid) || break
    [ "$p" = "$pid" ] && break
    kill "$p" 2>/dev/null; sleep 0.3; kill -9 "$p" 2>/dev/null || true
  done
  return 0
}

db_up() { [ -S "$SOCK" ] || ss -ltn 2>/dev/null | grep -q '127.0.0.1:3307'; }

# A node server.js holding the port that we can't manage (e.g. running as root)
foreign_msg() {
  local fp
  fp=$(ps -eo uid,pid,args | awk '$1 != "'$(id -u)'" && $0 ~ /node server\.js/ && $0 !~ /awk/ {print $2; exit}')
  if [ -n "$fp" ]; then
    echo " (foreign pid $fp — stop it with: sudo kill $fp)"
  fi
}

wait_http() {
  for _ in $(seq 1 30); do
    curl -sf -o /dev/null --max-time 2 "$BASE/docs" && return 0
    sleep 0.5
  done
  return 1
}

cmd_start() {
  # 1) MariaDB
  if db_up; then
    c_ok "MariaDB already running (127.0.0.1:3307)"
  else
    c_info "Starting MariaDB…"
    bash "$ROOT/scripts/init-db.sh" >/dev/null 2>&1 || true
    if db_up; then c_ok "MariaDB started (127.0.0.1:3307)"; else c_warn "MariaDB did not come up — check $LOG_DIR/mysql.log"; fi
  fi

  # 2) API server (also serves the streamable-HTTP MCP endpoint at POST /api/mcp)
  if pid=$(server_pid); then
    if [ ! -f "$PID_FILE" ] || [ "$(cat "$PID_FILE" 2>/dev/null)" != "$pid" ]; then
      echo "$pid" > "$PID_FILE"
      c_ok "Adopted running server (pid $pid) into $PID_FILE"
    fi
    c_ok "API server already running (pid $pid, $BASE)"
  elif curl -sf -o /dev/null --max-time 1 "$BASE/docs" 2>/dev/null; then
    c_bad "Port $PORT is serving something that is not manageable by this script$(foreign_msg)"
    exit 1
  else
    c_info "Starting API server (API + MCP + web) on $HOST:$PORT…"
    # HOST/PORT on the child env override .env (dotenv never overwrites existing vars).
    # setsid detaches into its own session so the server survives the caller's
    # process group being torn down (cron, CI runners, terminal session exit).
    # The subshell execs setsid, so $! is the node pid unless setsid had to fork;
    # the pid file is refreshed from the actual listener below either way.
    (
      cd "$ROOT" || exit 1
      HOST="$HOST" PORT="$PORT" exec setsid nohup node server.js >>"$SERVER_LOG" 2>&1 </dev/null
    ) &
    echo $! > "$PID_FILE"
    sleep 0.5
  fi

  if pid=$(server_pid); then
    if wait_http; then
      # setsid may have forked — trust the actual listener over $!
      real=$(port_pid) && [ -n "$real" ] && echo "$real" > "$PID_FILE" && pid="$real"
      c_ok "API server running (pid $pid)"
      c_ok "  Web / docs : $BASE/docs"
      mcp_state
    else
      c_bad "Server running but $BASE is not responding — check $SERVER_LOG"
      exit 1
    fi
  else
    c_bad "Failed to start API server — check $SERVER_LOG"
    exit 1
  fi
}

cmd_stop() {
  if pid=$(server_pid); then
    c_info "Stopping API server (pid $pid)…"
    kill_pid "$pid"
    rm -f "$PID_FILE"
    c_ok "API server stopped"
  else
    c_warn "API server is not running$(foreign_msg)"
    rm -f "$PID_FILE"
  fi

  if [ "${1:-}" = "--db" ]; then
    if db_up; then
      c_info "Stopping MariaDB…"
      [ -f "$LOG_DIR/mysql.pid" ] && kill "$(cat "$LOG_DIR/mysql.pid")" 2>/dev/null
      sleep 1
      if db_up; then c_warn "MariaDB still up — check $LOG_DIR/mysql.pid"; else c_ok "MariaDB stopped"; fi
    else
      c_warn "MariaDB is not running"
    fi
  fi
}

cmd_restart() { cmd_stop; sleep 0.5; cmd_start; }

mcp_state() {
  # HTTP MCP endpoint is alive if it rejects an unauthenticated call with 401
  local code
  code=$(curl -s -o /dev/null --max-time 3 -w '%{http_code}' -X POST "$BASE/api/mcp" \
    -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' 2>/dev/null)
  case "$code" in
    401) c_ok "  MCP (HTTP): $BASE/api/mcp — up (auth required)" ;;
    200) c_warn "  MCP (HTTP): $BASE/api/mcp — up (responded without auth?)" ;;
    *)   c_bad  "  MCP (HTTP): $BASE/api/mcp — not responding (HTTP $code)" ;;
  esac
}

cmd_status() {
  echo "X3M ERP — status"
  echo "─────────────────"
  if db_up; then c_ok "MariaDB : running (127.0.0.1:3307, socket $SOCK)"; else c_bad "MariaDB : stopped"; fi
  local managed=""
  if [ -f "$PID_FILE" ] && pid=$(server_pid) && [ "$(cat "$PID_FILE" 2>/dev/null)" = "$pid" ]; then
    managed=""
  elif pid=$(server_pid); then
    managed=" (unmanaged — 'start' will adopt it)"
  fi
  if [ -n "${pid:-}" ]; then
    local etime; etime=$(ps -o etime= -p "$pid" 2>/dev/null | xargs)
    c_ok "API     : running (pid $pid, up $etime)${managed}"
  elif curl -sf -o /dev/null --max-time 2 "$BASE/docs" 2>/dev/null; then
    c_warn "API     : responding on :$PORT but not manageable by this user$(foreign_msg)"
  else
    c_bad "API     : stopped"
  fi
  if curl -sf -o /dev/null --max-time 2 "$BASE/docs"; then
    c_ok "HTTP    : $BASE responding (web + docs OK)"
  else
    c_bad "HTTP    : $BASE not responding"
  fi
  mcp_state
  if [ -f "$ROOT/mcp/stdio.js" ]; then
    c_ok "MCP (stdio): available — './scripts/erpctl.sh mcp' or 'npm run mcp'"
  else
    c_bad "MCP (stdio): mcp/stdio.js missing"
  fi
  echo "Log     : $SERVER_LOG"
}

cmd_logs() { tail -f "$SERVER_LOG"; }

cmd_mcp() { cd "$ROOT" && node mcp/stdio.js; }

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop "${2:-}" ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  mcp)     cmd_mcp ;;
  *)
    sed -n '2,9p' "$0" | sed 's/^# \?//'
    exit 1
    ;;
esac
