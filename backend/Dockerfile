FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

RUN mkdir -p data

EXPOSE 3001
CMD ["bun", "run", "start"]
