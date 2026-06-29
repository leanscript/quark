FROM node:24-bookworm-slim

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/package.json
COPY examples/postgresql-app/package.json examples/postgresql-app/package.json

RUN corepack pnpm install --filter @quark/example-postgresql-app... --frozen-lockfile

COPY packages/core/nest-cli.json packages/core/nest-cli.json
COPY packages/core/tsconfig.json packages/core/tsconfig.json
COPY packages/core/tsconfig.build.json packages/core/tsconfig.build.json
COPY packages/core/src packages/core/src

COPY examples/postgresql-app/tsconfig.json examples/postgresql-app/tsconfig.json
COPY examples/postgresql-app/src examples/postgresql-app/src

RUN corepack pnpm --filter @quark/core build \
  && corepack pnpm --filter @quark/example-postgresql-app build

EXPOSE 3000

CMD ["corepack", "pnpm", "--filter", "@quark/example-postgresql-app", "start"]
