# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/vite.config.ts ./vite.config.ts

EXPOSE 4175

CMD ["npm", "run", "preview"]
