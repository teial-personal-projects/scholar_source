#!/usr/bin/env bash
# Dump roles, schema, and data for the prod and dev Supabase databases.
#
# Reads SUPABASE_DB_URL from .env.prod and .env.dev in the repo root.
# Requires Docker to be running (supabase db dump runs pg_dump in a container).
#
# Usage: ./scripts/dump_databases.sh [prod|dev|all]   (default: all)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$REPO_ROOT/schema-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DB_URL_KEY="SUPABASE_DB_URL"


# Print the value of KEY from an env file without sourcing the whole file.
read_env_value() {
  local file="$1" key="$2" line value
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 || true)"
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}


dump_env() {
  local env_name="$1"
  local env_file="$REPO_ROOT/.env.$env_name"
  local out_dir="$BACKUP_ROOT/$env_name/$STAMP"
  local db_url

  if [[ ! -f "$env_file" ]]; then
    echo "error: $env_file not found" >&2
    return 1
  fi

  db_url="$(read_env_value "$env_file" "$DB_URL_KEY")"
  if [[ -z "$db_url" ]]; then
    echo "error: $DB_URL_KEY is not set in $env_file" >&2
    return 1
  fi

  mkdir -p "$out_dir"
  echo "==> Dumping $env_name to $out_dir"
  supabase db dump --db-url "$db_url" -f "$out_dir/roles.sql" --role-only
  supabase db dump --db-url "$db_url" -f "$out_dir/schema.sql"
  supabase db dump --db-url "$db_url" -f "$out_dir/data.sql" --use-copy --data-only
}


main() {
  local target="${1:-all}"

  if ! docker info >/dev/null 2>&1; then
    echo "error: Docker is not running (supabase db dump needs it)" >&2
    exit 1
  fi

  case "$target" in
    prod|dev) dump_env "$target" ;;
    all) dump_env prod; dump_env dev ;;
    *) echo "usage: $0 [prod|dev|all]" >&2; exit 2 ;;
  esac

  echo "Done. Backups are in $BACKUP_ROOT"
}


main "$@"
