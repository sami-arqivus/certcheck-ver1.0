#!/bin/bash
until [ -f /app/dist/index.html ]; do
  echo "Waiting for dist/index.html to be created..."
  sleep 2
done
echo "dist/index.html found, running npx cap sync $1"
npm run build && npx cap sync "$1"
