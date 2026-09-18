#!/bin/sh
set -e

# Apply any pending database migrations before the app boots.
# `migrate deploy` is idempotent and safe to run on every startup.
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting server..."
exec "$@"
