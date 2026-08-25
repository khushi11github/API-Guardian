FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY worker/package.json ./worker/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared ./packages/shared
COPY worker ./worker

RUN pnpm --filter @api-guardian/shared build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @api-guardian/worker build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["node", "worker/dist/index.js"]
