args = $(foreach a,$($(subst -,_,$1)_args),$(if $(value $a),$a="$($a)"))

populate-db:
	node dist/console db:seed

docker-up:
	@docker compose up -d

docker-down:
	@docker compose down ${@:2}

docker-run:
	@docker compose up ${@:2}

start: docker-up dev

dev:
	pnpm start:dev

install:
	@echo "Installing packages for backend"
	pnpm install
