#!/bin/sh
set -e

RESOLVED_API_URL="${API_URL:-$BACKEND_URL}"
if [ -n "$RESOLVED_API_URL" ]; then
  find /app/frontend/dist -type f \( -name "*.js" -o -name "*.mjs" \) \
    -exec sed -i "s|http://localhost:3000|${RESOLVED_API_URL}|g" {} +
fi

exec node /app/frontend/dist/frontend/server/server.mjs
