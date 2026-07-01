FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
# Build the API *and its internal workspace deps* (@autonode/shared, ai,
# database) so their dist/ exists at runtime. The "..." suffix includes deps,
# and the database build runs `prisma generate` itself.
RUN pnpm --filter "@autonode/api..." build
# NOTE: we intentionally keep dev deps so the Prisma CLI is available in the
# container for `prisma db push` / `migrate deploy` during deployment.

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]

