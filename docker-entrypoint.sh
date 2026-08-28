#!/bin/sh
# MConnect container entrypoint.
#
# Applies outstanding database migrations, then starts the server. Migrations
# run with `migrate deploy`, which only ever applies committed migration files —
# it never resets a database and never generates a migration from a schema
# drift. If a migration fails the container exits rather than serving traffic
# against a schema the application does not expect.
set -eu

if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
  echo "[mconnect] SKIP_MIGRATIONS=true — not applying migrations."
else
  echo "[mconnect] Applying database migrations…"
  node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
  echo "[mconnect] Migrations up to date."
fi

echo "[mconnect] Starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec "$@"
