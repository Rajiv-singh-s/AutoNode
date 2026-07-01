# ─── Stage 1: deps ────────────────────────────────────────────────
FROM node:20-slim AS deps

# Install OpenSSL (required by Prisma engine) and pnpm
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

WORKDIR /app

# Copy manifests only first (cache-friendly layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json            ./apps/api/
COPY packages/ai/package.json         ./packages/ai/
COPY packages/database/package.json   ./packages/database/
COPY packages/shared/package.json     ./packages/shared/

# Install all deps (including devDeps needed to build)
RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

# Copy full source
COPY . .

# Generate Prisma client for the correct Linux target, then build API
RUN pnpm --filter @autonode/database generate
RUN pnpm turbo run build --filter=@autonode/api...

# ─── Stage 3: runner ──────────────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

WORKDIR /app

# Copy the full workspace (node_modules + built dist)
COPY --from=builder /app .

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
