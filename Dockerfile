FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml .npmrc ./

RUN CI=true pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig*.json nest-cli.json ./

RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/main"]
