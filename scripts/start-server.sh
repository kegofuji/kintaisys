#!/usr/bin/env bash
set -e
PORT="${PORT:-8080}"
if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "Killing process on port $PORT..."
  kill -9 $(lsof -ti :$PORT) || true
  sleep 1
fi
echo "Starting app on port $PORT"
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=$PORT"
