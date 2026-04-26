# Monorepo Restructure with Turborepo

## Overview

Restructure the project into a pnpm + Turborepo monorepo with three packages: `backend` (NestJS), `frontend` (Angular), and `packages/shared-types` (socket event types shared between both apps).

## Workspace Structure

```
nest-ws/
├── backend/                  # NestJS — moved from root
│   ├── src/
│   ├── test/
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── package.json          # name: "@repo/backend"
├── frontend/                 # Angular — already here
│   └── package.json          # name: "@repo/frontend"
├── packages/
│   └── shared-types/         # new
│       ├── src/
│       │   └── index.ts
│       └── package.json      # name: "@repo/shared-types"
├── turbo.json
├── pnpm-workspace.yaml
└── package.json              # workspace root — no app code
```

Root files that stay at root: `.gitignore`, `.env`, `.env.example`, `docker-compose.yml`, `Dockerfile`, `.prettierrc`, `eslint.config.mjs`.

## Turborepo Pipeline

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":   { "persistent": true, "cache": false },
    "test":  { "dependsOn": ["^build"] },
    "lint":  {}
  }
}
```

- `build`: shared-types compiles first (via `^build`), then backend and frontend in parallel
- `dev`: backend (`nest start --watch`) and frontend (`ng serve`) run in parallel, no caching
- `test` and `lint`: all packages run in parallel

## shared-types Package

TypeScript-only package compiled with `tsc`. Consumed by both apps via pnpm workspace symlink.

```ts
// packages/shared-types/src/index.ts

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
```

Only wire-format types that cross the socket boundary live here. Backend entity types and DTOs stay in `backend/`.

## Decisions

- **pnpm workspaces** — already in use, natural fit
- **Turborepo** — task orchestration with caching; no Nx or Lerna overhead
- **No shared tooling configs** — each app keeps its own tsconfig/eslint to avoid cross-tool conflicts (Angular vs NestJS tsconfig targets differ significantly)
- **No runtime validation in shared-types** — Zod schemas can be added as a second package later if needed
