FROM oven/bun:1.3.11-slim AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.11-slim AS runner
WORKDIR /app

# copy deps from builder
COPY --from=builder /app/node_modules ./node_modules

# copy only app code
COPY src ./src
COPY package.json bun.lock ./

CMD ["bun", "src/server.ts"]