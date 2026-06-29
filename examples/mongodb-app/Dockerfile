FROM node:24-bookworm-slim

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/package.json
COPY examples/mongodb-app/package.json examples/mongodb-app/package.json

RUN corepack pnpm install --filter @quark/example-mongodb-app... --frozen-lockfile

COPY packages/core/nest-cli.json packages/core/nest-cli.json
COPY packages/core/tsconfig.json packages/core/tsconfig.json
COPY packages/core/tsconfig.build.json packages/core/tsconfig.build.json
COPY packages/core/src packages/core/src

COPY examples/mongodb-app/tsconfig.json examples/mongodb-app/tsconfig.json
COPY examples/mongodb-app/src examples/mongodb-app/src

RUN corepack pnpm --filter @quark/core build \
  && corepack pnpm --filter @quark/example-mongodb-app build

EXPOSE 3000

CMD ["corepack", "pnpm", "--filter", "@quark/example-mongodb-app", "start"]
