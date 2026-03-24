FROM oven/bun:1.3.11-slim AS builder
WORKDIR /app
COPY package*.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2
FROM oven/bun:1.3.11-slim AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["bun", "src/server.ts"]
