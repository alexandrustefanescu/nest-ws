#!/bin/sh
set -e

if [ -n "$API_URL" ]; then
  find /app/frontend/dist -type f \( -name "*.js" -o -name "*.mjs" \) \
    -exec sed -i "s|http://localhost:3000|${API_URL}|g" {} +
fi

exec node /app/frontend/dist/frontend/server/server.mjs
