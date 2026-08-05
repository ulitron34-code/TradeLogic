#!/usr/bin/env sh
set -eu
for f in package.json pnpm-workspace.yaml docker-compose.yml packages/db/prisma/schema.prisma openapi/openapi.yaml; do
  test -f "$f" || { echo "Missing $f"; exit 1; }
done
echo "Starter package structure OK"
