FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so they
# must be provided as build args (not just runtime env). Pass your production
# HTTPS URLs here (see docker-compose.prod.yml).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
# Build the web app and its internal workspace deps (@autonode/shared).
RUN pnpm --filter "@autonode/web..." build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY --from=builder /app /app

EXPOSE 3000

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
