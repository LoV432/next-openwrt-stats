#!/bin/sh
set -e

if [ -f "/app/db/next-openwrt-stats.db" ]; then
	export LEGACY_DATABASE_DETECTED=true
fi

cd /app/drizzle && node db-migrations.js
if [ "$PRESENCE_ENABLED" = "true" ]; then
	cd /app && node presence-cron.js &
fi
cd /app && node server.js