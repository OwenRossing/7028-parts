# ─────────────────────────────────────────────────────────────────────────────
# 7028 Parts Tracker — unified dev management
# ─────────────────────────────────────────────────────────────────────────────
SHELL         := bash
.SHELLFLAGS   := -eu -o pipefail -c
.DEFAULT_GOAL := help
.PHONY: help setup dev dev-fresh build db-reset logs clean \
        _db-up _db-wait _db-push _db-seed

DC   := docker compose
CYAN := \033[36m
BOLD := \033[1m
DIM  := \033[2m
RST  := \033[0m

# ── Help ─────────────────────────────────────────────────────────────────────
help:
	@printf "\n$(BOLD)7028 Parts Tracker$(RST)  $(DIM)v$$(node -p "require('./package.json').version" 2>/dev/null || echo '?')$(RST)\n\n"
	@printf "  $(CYAN)make setup$(RST)       First-time: install deps, generate Prisma, copy .env\n"
	@printf "  $(CYAN)make dev$(RST)         DB → wait for health → schema sync → Next.js dev\n"
	@printf "  $(CYAN)make dev-fresh$(RST)   Same as dev but also re-seeds demo data first\n"
	@printf "  $(CYAN)make build$(RST)       Production build  (next build)\n"
	@printf "  $(CYAN)make db-reset$(RST)    Wipe DB and reseed\n"
	@printf "  $(CYAN)make logs$(RST)        Tail the database container logs\n"
	@printf "  $(CYAN)make clean$(RST)       Stop containers and delete volumes\n"
	@printf "\n"

# ── First-time setup ─────────────────────────────────────────────────────────
setup:
	@printf "$(CYAN)›$(RST) Checking .env\n"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		printf "  $(BOLD)Created .env from .env.example$(RST) — fill in secrets before continuing.\n"; \
	else \
		printf "  .env already exists, skipping.\n"; \
	fi
	@printf "$(CYAN)›$(RST) npm install\n"
	@npm install
	@printf "$(CYAN)›$(RST) prisma generate\n"
	@npx prisma generate
	@printf "\n$(BOLD)✓ Setup complete.$(RST)  Run $(CYAN)make dev$(RST) to start.\n\n"

# ── Dev (normal restart — no reseed) ─────────────────────────────────────────
dev: _db-up _db-wait _db-push
	@printf "$(CYAN)›$(RST) Starting Next.js dev server\n\n"
	npm run dev

# ── Dev (fresh — wipe seed on start) ─────────────────────────────────────────
dev-fresh: _db-up _db-wait _db-push _db-seed
	@printf "$(CYAN)›$(RST) Starting Next.js dev server\n\n"
	npm run dev

# ── Production build ─────────────────────────────────────────────────────────
build:
	@printf "$(CYAN)›$(RST) Building for production\n"
	npm run build

# ── DB: wipe and reseed ──────────────────────────────────────────────────────
db-reset: _db-up _db-wait
	@printf "$(CYAN)›$(RST) Resetting database\n"
	@npx prisma migrate reset --force
	@$(MAKE) --no-print-directory _db-seed
	@printf "$(BOLD)✓ Database reset and reseeded.$(RST)\n"

# ── Logs ─────────────────────────────────────────────────────────────────────
logs:
	$(DC) logs -f db

# ── Clean ────────────────────────────────────────────────────────────────────
clean:
	@printf "$(CYAN)›$(RST) Stopping containers and removing volumes\n"
	$(DC) down -v
	@printf "$(BOLD)✓ Clean.$(RST)\n"

# ── Internal steps ───────────────────────────────────────────────────────────

_db-up:
	@printf "$(CYAN)›$(RST) Starting database container\n"
	@$(DC) up -d db

_db-wait:
	@printf "$(CYAN)›$(RST) Waiting for Postgres"
	@until $(DC) exec -T db pg_isready -U postgres -d frc_parts_v2 -q 2>/dev/null; do \
		printf '.'; sleep 1; \
	done
	@printf " $(BOLD)ready$(RST)\n"

_db-push:
	@printf "$(CYAN)›$(RST) Syncing schema\n"
	@npx prisma db push --skip-generate 2>&1 | grep -v "^$$" | sed 's/^/  /'

_db-seed:
	@printf "$(CYAN)›$(RST) Seeding demo data\n"
	@npx prisma db seed 2>&1 | grep -v "^$$" | sed 's/^/  /'
