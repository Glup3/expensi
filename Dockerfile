# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the static PWA bundle
# ---------------------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies first so this layer is cached unless the lockfile moves.
COPY package.json package-lock.json ./
RUN npm ci

# Source needed for the build (tsc -b + vite build + PWA asset generation).
COPY tsconfig*.json vite.config.ts pwa-assets.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — serve with nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Drop the stock config; ours adds SPA fallback + service-worker-safe caching.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
