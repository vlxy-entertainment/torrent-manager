# Docker Deployment Guide

This project is containerized using Docker and can be run as a Node.js application on any server.

## Quick Start

```bash
# Start the app
make up
# or
docker compose up -d

# After changing .env file, rebuild and restart
make restart
# or
npm run docker:restart
# or
./scripts/restart-compose.sh

# View logs
make logs
# or
docker compose logs -f
```

## Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (optional, for easier management)

## Building the Docker Image

### Using Docker directly:

```bash
docker build -t torbox-app .
```

### Using Docker Compose:

```bash
docker compose build
```

## Running the Container

### Using Docker directly:

```bash
docker run -d \
  --name torbox-app \
  -p 4000:4000 \
  --env-file .env \
  --restart unless-stopped \
  torbox-app
```

### Using Docker Compose:

```bash
docker compose up -d
```

The application will be available at `http://localhost:4000`

## Environment Variables

Create a `.env` file in the project root with your environment variables:

```env
# Example environment variables
NODE_ENV=production
PORT=4000
# Add your other environment variables here
```

## Stopping the Container

### Using Docker:

```bash
docker stop torbox-app
docker rm torbox-app
```

### Using Docker Compose:

```bash
docker compose down
```

## Viewing Logs

### Using Docker:

```bash
docker logs -f torbox-app
```

### Using Docker Compose:

```bash
docker compose logs -f
```

## Rebuilding After Changes

### Code Changes

If you make changes to the code:

```bash
# Rebuild the image
docker compose build

# Restart the container
docker compose up -d
```

Or with Docker directly:

```bash
docker build -t torbox-app .
docker stop torbox-app && docker rm torbox-app
docker run -d --name torbox-app -p 4000:4000 --env-file .env --restart unless-stopped torbox-app
```

### Environment Variable Changes

**Important:** When you change `.env` file values, you need to rebuild and restart the container.

#### Why?

- **`NEXT_PUBLIC_*` variables** are embedded at **build time** - changing these requires a rebuild
- **Server-side variables** (without `NEXT_PUBLIC_`) are read at **runtime** - but restart is still recommended

#### Quick Restart Scripts

We provide helper scripts to make this easier:

**Using Docker Compose (Recommended):**

```bash
# Make script executable (first time only)
chmod +x scripts/restart-compose.sh

# Rebuild and restart
./scripts/restart-compose.sh
```

**Using Docker directly:**

```bash
# Make script executable (first time only)
chmod +x scripts/restart-on-env-change.sh

# Rebuild and restart
./scripts/restart-on-env-change.sh
```

#### Manual Restart

**With Docker Compose:**

```bash
# Rebuild (no cache to ensure fresh build)
docker compose build --no-cache

# Stop and remove old container
docker compose down

# Start new container
docker compose up -d
```

**With Docker directly:**

```bash
# Rebuild the image
docker build -t torbox-app .

# Stop and remove old container
docker stop torbox-app
docker rm torbox-app

# Start new container with updated .env
docker run -d \
  --name torbox-app \
  -p 4000:4000 \
  --env-file .env \
  --restart unless-stopped \
  torbox-app
```

#### Environment Variables That Require Rebuild

These variables are embedded at build time and **require a rebuild** when changed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- Any other `NEXT_PUBLIC_*` variables

These variables are read at runtime (but restart recommended):
- `SUPABASE_SECRET_KEY`
- `SENTRY_DSN`
- `PORT`
- `NODE_ENV`
- Any other server-side variables

## Automatic Restart on .env Changes (Optional)

For development, you can use a file watcher to automatically restart when `.env` changes:

**Using entr (Linux/macOS):**

```bash
# Install entr: brew install entr (macOS) or apt-get install entr (Linux)
# Watch .env file and restart on change
echo .env | entr -r ./scripts/restart-compose.sh
```

**Using nodemon or similar:**

```bash
# Install nodemon globally: npm install -g nodemon
nodemon --watch .env --exec "./scripts/restart-compose.sh"
```

## Available Commands

### Using Make (Recommended)

```bash
make help          # Show all available commands
make build         # Build Docker image
make up            # Start containers
make down          # Stop containers
make restart       # Rebuild and restart (use after .env changes)
make logs          # View logs
make rebuild       # Force rebuild without cache
```

### Using npm scripts

```bash
npm run docker:build    # Build Docker image
npm run docker:up       # Start containers
npm run docker:down     # Stop containers
npm run docker:restart  # Rebuild and restart (use after .env changes)
npm run docker:logs     # View logs
```

### Using Docker Compose directly

```bash
docker compose build          # Build
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose restart        # Restart (doesn't rebuild)
```

## Production Deployment

For production deployment:

1. Ensure your `.env` file contains all necessary production environment variables
2. Build the image: `docker build -t torbox-app .`
3. Run with proper resource limits and restart policies
4. Consider using a reverse proxy (nginx, Traefik, etc.) in front of the container
5. Set up proper logging and monitoring

Example production run:

```bash
docker run -d \
  --name torbox-app \
  -p 4000:4000 \
  --env-file .env \
  --restart always \
  --memory="512m" \
  --cpus="1.0" \
  torbox-app
```

## Troubleshooting

### Container won't start after .env change

If the container fails to start after changing `.env`:

1. Check for syntax errors in `.env` file (no spaces around `=`)
2. Ensure all required variables are set
3. Rebuild without cache: `make rebuild` or `docker compose build --no-cache`
4. Check logs: `make logs` or `docker compose logs`

### NEXT_PUBLIC_ variables not updating

`NEXT_PUBLIC_*` variables are embedded at build time. You **must** rebuild:

```bash
make restart
# or
./scripts/restart-compose.sh
```

