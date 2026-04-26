# Monorepo Turborepo Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the project into a pnpm + Turborepo monorepo with `backend/`, `frontend/`, and `packages/shared-types/`.

**Architecture:** The NestJS API moves from the root into `backend/`. A new `packages/shared-types` package holds socket event types and wire-format interfaces shared between both apps. The workspace root becomes a thin orchestration layer with no app code.

**Tech Stack:** pnpm workspaces, Turborepo, NestJS, Angular, TypeScript

---

## Task 1: Create `packages/shared-types`

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`

**Step 1: Create the package directory and `package.json`**

Create `packages/shared-types/package.json`:
```json
{
  "name": "@repo/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

**Step 2: Create `packages/shared-types/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create `packages/shared-types/src/index.ts`**

```ts
export interface Message {
  id: number;
  content: string;
  createdAt: string;
  sender: string;
  roomId: number;
}

export interface Room {
  id: number;
  name: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  messageId: number;
}

export const SocketEvents = {
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
  SEND_MESSAGE: 'message:send',
  RECEIVE_MESSAGE: 'message:receive',
  REACTION_TOGGLE: 'reaction:toggle',
  REACTIONS_SNAPSHOT: 'reactions:snapshot',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
```

**Step 4: Commit**

```bash
git add packages/shared-types
git commit -m "feat: add @repo/shared-types package"
```

---

## Task 2: Move NestJS source into `backend/`

**Files:**
- Move: `src/` → `backend/src/`
- Move: `test/` → `backend/test/`
- Move: `nest-cli.json` → `backend/nest-cli.json`
- Move: `tsconfig.json` → `backend/tsconfig.json`
- Move: `tsconfig.build.json` → `backend/tsconfig.build.json`
- Move: `eslint.config.mjs` → `backend/eslint.config.mjs`
- Move: `.prettierrc` → `backend/.prettierrc`

**Step 1: Move source directories and config files**

```bash
mv src backend/src
mv test backend/test
mv nest-cli.json backend/nest-cli.json
mv tsconfig.json backend/tsconfig.json
mv tsconfig.build.json backend/tsconfig.build.json
mv eslint.config.mjs backend/eslint.config.mjs
mv .prettierrc backend/.prettierrc
```

**Step 2: Fix the `tsconfigRootDir` in `backend/eslint.config.mjs`**

The eslint config uses `import.meta.dirname` which resolves to the file's own directory — no change needed. Verify the file still reads:

```js
parserOptions: {
  projectService: true,
  tsconfigRootDir: import.meta.dirname,
},
```

This is correct as-is since `import.meta.dirname` is always the file's own directory.

**Step 3: Commit**

```bash
git add backend/
git commit -m "refactor: move NestJS source into backend/"
```

---

## Task 3: Create `backend/package.json`

**Files:**
- Move+modify: `package.json` → `backend/package.json`

**Step 1: Move root `package.json` to `backend/`**

```bash
mv package.json backend/package.json
```

**Step 2: Edit `backend/package.json`**

Change the `name` field and add `@repo/shared-types` as a dependency. The full file should be:

```json
{
  "name": "@repo/backend",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "seed": "ts-node src/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/platform-fastify": "^11.1.19",
    "@nestjs/platform-socket.io": "^11.1.19",
    "@nestjs/swagger": "^11.4.1",
    "@nestjs/typeorm": "^11.0.1",
    "@nestjs/websockets": "^11.1.19",
    "@scalar/fastify-api-reference": "^1.52.6",
    "@repo/shared-types": "workspace:*",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "socket.io": "^4.8.3",
    "sqlite3": "^6.0.1",
    "typeorm": "^0.3.28"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@swc/cli": "^0.8.1",
    "@swc/core": "^1.15.30",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "@types/supertest": "^7.0.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^17.0.0",
    "jest": "^30.0.0",
    "prettier": "^3.4.2",
    "socket.io-client": "^4.8.3",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**Step 3: Commit**

```bash
git add backend/package.json
git commit -m "refactor: set backend package.json name to @repo/backend"
```

---

## Task 4: Create workspace root `package.json` and `turbo.json`

**Files:**
- Create: `package.json` (new workspace root)
- Create: `turbo.json`

**Step 1: Create root `package.json`**

```json
{
  "name": "@repo/root",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.5.3"
  }
}
```

**Step 2: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

**Step 3: Commit**

```bash
git add package.json turbo.json
git commit -m "feat: add turborepo workspace root and turbo.json pipeline"
```

---

## Task 5: Update `pnpm-workspace.yaml` and `frontend/package.json`

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `frontend/package.json`
- Modify: `frontend/package.json` — add `@repo/shared-types` dep

**Step 1: Replace `pnpm-workspace.yaml`**

```yaml
packages:
  - "backend"
  - "frontend"
  - "packages/*"
```

**Step 2: Update `frontend/package.json`**

Change the `name` field to `@repo/frontend` and add `@repo/shared-types` to dependencies:

```json
"name": "@repo/frontend",
```

Add to `dependencies`:
```json
"@repo/shared-types": "workspace:*",
```

**Step 3: Commit**

```bash
git add pnpm-workspace.yaml frontend/package.json
git commit -m "refactor: update workspace config and rename frontend package"
```

---

## Task 6: Update `.npmrc` for monorepo

**Files:**
- Modify: `.npmrc`

**Step 1: Update `.npmrc`**

The root `.npmrc` already has `public-hoist-pattern` entries for NestJS/typeorm. Keep those and add the `onlyBuiltDependencies` list which was previously in `pnpm-workspace.yaml`. Replace `.npmrc` with:

```
public-hoist-pattern[]=*typeorm*
public-hoist-pattern[]=sqlite3
```

The `onlyBuiltDependencies` key belongs in `package.json` or `pnpm-workspace.yaml` — move it there. Update `pnpm-workspace.yaml`:

```yaml
packages:
  - "backend"
  - "frontend"
  - "packages/*"

onlyBuiltDependencies:
  - "@nestjs/core"
  - "@swc/core"
  - sqlite3
  - unrs-resolver
```

**Step 2: Commit**

```bash
git add .npmrc pnpm-workspace.yaml
git commit -m "refactor: update .npmrc and pnpm-workspace for monorepo"
```

---

## Task 7: Update `Dockerfile` for new structure

**Files:**
- Modify: `Dockerfile`

**Step 1: Rewrite `Dockerfile`**

The Dockerfile needs to copy from `backend/` and use pnpm workspaces:

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy package manifests for all workspaces
COPY backend/package.json ./backend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN CI=true pnpm install --frozen-lockfile --filter @repo/backend...

# Copy source
COPY backend/ ./backend/
COPY packages/shared-types/ ./packages/shared-types/

RUN pnpm --filter @repo/shared-types build
RUN pnpm --filter @repo/backend build

EXPOSE 3000

CMD ["node", "backend/dist/main"]
```

**Step 2: Commit**

```bash
git add Dockerfile
git commit -m "refactor: update Dockerfile for monorepo structure"
```

---

## Task 8: Install dependencies and verify

**Step 1: Delete old lockfile and node_modules, reinstall**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

Expected: pnpm resolves all workspaces, creates a new `pnpm-lock.yaml`, symlinks `@repo/shared-types` into backend and frontend `node_modules`.

**Step 2: Build shared-types**

```bash
pnpm --filter @repo/shared-types build
```

Expected: `packages/shared-types/dist/` is created with `index.js` and `index.d.ts`.

**Step 3: Build backend**

```bash
pnpm --filter @repo/backend build
```

Expected: `backend/dist/` is created with no TypeScript errors.

**Step 4: Run backend tests**

```bash
pnpm --filter @repo/backend test
```

Expected: All existing NestJS tests pass.

**Step 5: Build via turbo (full pipeline)**

```bash
pnpm build
```

Expected: Turbo builds shared-types first, then backend and frontend in parallel with no errors.

**Step 6: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: regenerate pnpm-lock.yaml for monorepo"
```

---

## Task 9: Verify `pnpm dev`

**Step 1: Start dev servers**

```bash
pnpm dev
```

Expected: Turbo starts both `backend` (`nest start --watch`) and `frontend` (`ng serve`) in parallel, prefixing output with their package names.

**Step 2: Confirm backend is reachable**

```bash
curl http://localhost:3000/health
```

Expected: `200 OK` (or whatever the health endpoint returns).

**Step 3: Confirm frontend is reachable**

Open `http://localhost:4200` in a browser — Angular app should load and connect to backend over WebSocket.

**Step 4: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix: monorepo dev setup tweaks"
```
