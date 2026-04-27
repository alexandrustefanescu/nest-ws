FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.30.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN CI=true pnpm install --frozen-lockfile --filter @repo/frontend...

COPY frontend/ ./frontend/
COPY packages/shared-types/ ./packages/shared-types/

RUN pnpm --filter @repo/shared-types build
RUN pnpm --filter @repo/frontend build

RUN chmod +x /app/frontend/docker-entrypoint.sh

EXPOSE 4200

ENTRYPOINT ["/app/frontend/docker-entrypoint.sh"]
