.PHONY: help build up down restart logs restart-env

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker image
	docker compose build

up: ## Start containers
	docker compose up -d

down: ## Stop containers
	docker compose down

restart: ## Rebuild and restart containers (use after .env changes)
	./scripts/restart-compose.sh

restart-env: restart ## Alias for restart (use after .env changes)

logs: ## View container logs
	docker compose logs -f

rebuild: ## Force rebuild without cache and restart
	docker compose build --no-cache
	docker compose down
	docker compose up -d

