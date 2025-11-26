# syntax=docker/dockerfile:1

# ========================================
# Stage 1: Install dependencies
# ========================================
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy only dependency files for better caching
COPY package.json bun.lock* ./

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile

# ========================================
# Stage 2: Build the application
# ========================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files needed for build
COPY package.json bun.lock* ./
COPY tsconfig.json tailwind.config.ts ./
COPY config ./config
COPY src ./src

# Build the application (Tailwind CSS + client bundles)
RUN bun run build

# ========================================
# Stage 3: Production image
# ========================================
FROM oven/bun:1-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN adduser --system --uid 1001 app

# Copy only production dependencies
COPY --chown=app package.json bun.lock* ./
RUN bun install --frozen-lockfile --production && \
    rm -rf ~/.bun/install/cache

# Copy built assets
COPY --chown=app --from=builder /app/dist ./dist

# Copy server source (Bun runs TypeScript directly)
COPY --chown=app src ./src

# Copy public assets
COPY --chown=app public ./public

USER app

EXPOSE 3001

CMD ["bun", "run", "src/server.ts"]
