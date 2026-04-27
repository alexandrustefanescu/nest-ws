FROM node:20-alpine

WORKDIR /app

ARG API_URL=http://localhost:3000

RUN npm install -g pnpm@10.30.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN CI=true pnpm install --frozen-lockfile --filter @repo/frontend...

COPY frontend/ ./frontend/
COPY packages/shared-types/ ./packages/shared-types/

RUN sed -i "s|http://localhost:3000|${API_URL}|g" frontend/src/environments/environment.ts

RUN pnpm --filter @repo/shared-types build
RUN pnpm --filter @repo/frontend build

EXPOSE 4200

CMD ["node", "frontend/dist/frontend/server/server.mjs"]