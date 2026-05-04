FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN npm ci
RUN npm run prisma:generate
RUN npm run build:worker

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/index.js"]
