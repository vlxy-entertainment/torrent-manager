#!/bin/sh
# Script to rebuild and restart using docker compose when .env changes

set -e

echo "🔄 Rebuilding Docker image with docker compose..."
docker compose build --no-cache

echo "🛑 Stopping existing containers..."
docker compose down

echo "🚀 Starting containers..."
docker compose up -d

echo "✅ Containers restarted successfully!"
echo "📋 View logs with: docker compose logs -f"

