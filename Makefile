rebuild:
	corepack pnpm --filter @quark/example-sqlite-app build
	corepack pnpm --filter @quark/example-mysql-app build
	corepack pnpm --filter @quark/example-postgresql-app build
	corepack pnpm --filter @quark/example-sqlite-app smoke