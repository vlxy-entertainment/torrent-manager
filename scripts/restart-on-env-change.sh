#!/bin/sh
# Script to rebuild and restart Docker container when .env changes
# This ensures NEXT_PUBLIC_* variables are properly rebuilt

set -e

CONTAINER_NAME="torbox-app"
IMAGE_NAME="torbox-app"

echo "🔄 Rebuilding Docker image..."
docker build -t $IMAGE_NAME .

echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "🚀 Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 4000:4000 \
  --env-file .env \
  --restart unless-stopped \
  $IMAGE_NAME

echo "✅ Container restarted successfully!"
echo "📋 View logs with: docker logs -f $CONTAINER_NAME"

