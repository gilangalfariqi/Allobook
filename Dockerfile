FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9 --no-fund --no-audit

# Install openssl for Prisma and ca-certificates
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy shared configs, shared types, and api source
COPY packages/config ./packages/config
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Build shared-types, generate prisma client, and compile api
RUN pnpm --filter @allobook/shared-types build
RUN pnpm --filter @allobook/api prisma generate
RUN pnpm --filter @allobook/api build

ENV PORT=3001
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=192"
EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @allobook/api prisma migrate deploy && pnpm --filter @allobook/api run db:seed && pnpm --filter @allobook/api start"]
