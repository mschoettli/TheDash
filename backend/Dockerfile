FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV CHROME_BIN=/usr/bin/chromium-browser
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "dist/index.js"]
