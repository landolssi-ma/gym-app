#!/usr/bin/env bash
# Run Vitest files against a throwaway local Postgres with every migration applied.
# Never reads the app's env file or DATABASE_URL. Pass Vitest filters as arguments, e.g.
#   bash packages/db/tests/pg-test.sh packages/api/tests/session-revocation.pg.test.ts
set -euo pipefail
# No migrations yet is a valid state, not a literal "0*.sql" path.
shopt -s nullglob

unset DATABASE_URL

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$DB_DIR/../.." && pwd)"
CONTAINER="starter-pgtest-$$"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --pull never --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=pgtest \
  -p 127.0.0.1::5432 \
  postgres:16-alpine >/dev/null

ADDRESS="$(docker port "$CONTAINER" 5432/tcp | tail -n1)"
HOST="${ADDRESS%:*}"
PORT="${ADDRESS##*:}"
if [ "$HOST" != "127.0.0.1" ]; then
  echo "ERROR: refusing to target non-local host '$HOST'" >&2
  exit 1
fi
URL="postgres://postgres:pgtest@127.0.0.1:${PORT}/postgres"
if [ "$(node -e "console.log(new URL(process.argv[1]).hostname)" "$URL")" != "127.0.0.1" ]; then
  echo "ERROR: refusing to target non-local URL" >&2
  exit 1
fi

for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null

for f in "$DB_DIR"/drizzle/0*.sql; do
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction -q < "$f"
done

cd "$ROOT_DIR"
env -u DATABASE_URL TEST_PG_URL="$URL" pnpm exec vitest run "$@"
