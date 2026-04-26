FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests first (for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json ./backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install only backend and its workspace dependencies
RUN CI=true pnpm install --frozen-lockfile --filter @repo/backend...

# Copy source
COPY backend/ ./backend/
COPY packages/shared-types/ ./packages/shared-types/

# Build shared-types first, then backend
RUN pnpm --filter @repo/shared-types build
RUN pnpm --filter @repo/backend build

EXPOSE 3000

CMD ["node", "backend/dist/main"]
