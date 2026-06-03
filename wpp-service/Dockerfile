FROM node:20-slim AS base
WORKDIR /app
COPY package*.json ./
# Prevent Puppeteer from downloading Chromium (we install it via apt)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-slim AS runner
WORKDIR /app

# Install Chromium and required system libraries for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    fonts-liberation \
    fonts-noto-color-emoji \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3001
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV TOKENS_DIR=/tmp/wpp-tokens

CMD ["node", "dist/server.js"]
