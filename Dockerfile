FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install openssl for Prisma and ca-certificates
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Build shared-types, generate prisma client, and build api
RUN pnpm --filter @allobook/shared-types build
RUN pnpm --filter @allobook/api prisma generate
RUN pnpm --filter @allobook/api build

# Create non-root user (Hugging Face Spaces UID 1000 requirement)
RUN useradd -m -u 1000 user && chown -R user:user /app
USER user

# Hugging Face Spaces standard port is 7860
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

CMD ["sh", "-c", "pnpm --filter @allobook/api prisma migrate deploy && pnpm --filter @allobook/api run db:seed && pnpm --filter @allobook/api start"]
