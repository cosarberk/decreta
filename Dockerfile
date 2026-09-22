# =============================================================================
# Decreta — tek image (publish) derlemesi.
# Web (React/Vite) statik olarak derlenir, API (Fastify) hem REST hem de bu
# statik dosyaları tek portan servis eder. Sonuç: main/publish için TEK image.
# =============================================================================

# --- 1) Web derleme ---------------------------------------------------------
FROM node:26-alpine AS web-build
WORKDIR /app/apps/web
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web/ ./
# Tek image'da web, API ile aynı origin'den servis edildiği için API_URL boş
# bırakılır (göreli /api yolları kullanılır).
ENV VITE_API_URL=""
RUN npm run build

# --- 2) API derleme ---------------------------------------------------------
FROM node:26-alpine AS api-build
WORKDIR /app
COPY tsconfig.base.json ./
COPY apps/api/package*.json ./apps/api/
RUN cd apps/api && npm install
COPY apps/api/ ./apps/api/
RUN cd apps/api && npm run build

# --- 3) Üretim runtime ------------------------------------------------------
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api

# Yalnızca üretim bağımlılıkları.
COPY apps/api/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Derlenmiş API + migration dosyaları.
COPY --from=api-build /app/apps/api/dist ./dist
COPY apps/api/migrations ./migrations

# Derlenmiş web statikleri — API bunları servis edecek.
COPY --from=web-build /app/apps/web/dist ./public

EXPOSE 4000
CMD ["node", "dist/index.js"]
