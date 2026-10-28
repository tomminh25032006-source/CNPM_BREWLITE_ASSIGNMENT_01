FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 4000
# Áp migration + seed (idempotent) rồi chạy API
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main"]
