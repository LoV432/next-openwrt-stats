#!/bin/sh
set -e
cd /app/drizzle && node db-migrations.js
if [ "$PRESENCE_ENABLED" = "true" ]; then
	cd /app && node presence-cron.js &
fi
cd /app && node server.js