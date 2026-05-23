FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY package*.json ./

RUN npm ci --omit=dev

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "build/index.js"]
