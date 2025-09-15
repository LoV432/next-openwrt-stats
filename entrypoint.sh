#!/bin/sh
set -e
cd /app/drizzle && node db-migrations.js
cd /app && node server.js