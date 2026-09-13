# Multi-stage Node image for Campus Connect API
ARG NODE_VERSION=22-slim
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY src ./src
COPY package.json ./
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "src/server.js"]
