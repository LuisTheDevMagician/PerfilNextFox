# --- deps ---
FROM oven/bun:1-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# --- builder ---
FROM oven/bun:1-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ARG NEXT_PUBLIC_INVITE_PORT
ENV NEXT_PUBLIC_INVITE_PORT=${NEXT_PUBLIC_INVITE_PORT}
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# --- runner ---
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["bun", "server.js"]
