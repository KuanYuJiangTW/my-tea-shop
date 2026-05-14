# ── Stage 1: 安裝依賴 ──
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: 開發環境 ──
FROM node:24-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["npm", "run", "dev"]

# ── Stage 3: 建置 ──
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 4: 正式環境 ──
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
