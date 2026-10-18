#!/usr/bin/env bash
# Initialize & start the app's dedicated MariaDB instance (port 3307, no root needed)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data/mariadb"
SOCK="/tmp/erp-mysql.sock"
LOG="$ROOT/logs/mysql.log"

if [ ! -d "$DATA/mysql" ]; then
  mysql_install_db --datadir="$DATA" --auth-root-authentication-method=normal --skip-test-db --user="$USER" >/dev/null
fi

if ! [ -S "$SOCK" ]; then
  nohup mariadbd --datadir="$DATA" --port=3307 --bind-address=127.0.0.1 \
    --socket="$SOCK" --pid-file="$ROOT/logs/mysql.pid" --user="$USER" \
    --skip-name-resolve >>"$LOG" 2>&1 &
  for i in $(seq 1 30); do [ -S "$SOCK" ] && break; sleep 0.5; done
fi

mysql --socket="$SOCK" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'erp'@'127.0.0.1' IDENTIFIED BY 'erp_pass_2026';
GRANT ALL PRIVILEGES ON erp.* TO 'erp'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

echo "MariaDB ready on 127.0.0.1:3307 (socket: $SOCK)"
