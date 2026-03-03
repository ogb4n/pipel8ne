# ─── Stage 1 : Build du frontend React/Vite ──────────────────────────────────
FROM node:20-alpine AS webapp-builder

WORKDIR /app/webapp

COPY webapp/package.json webapp/package-lock.json* ./
RUN npm install

COPY webapp/ ./
RUN npm run build

# ─── Stage 2 : Build du backend Fastify ──────────────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install

COPY backend/ ./
RUN npm run build

# ─── Stage 3 : Image de production finale ────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# Copie le build compilé depuis le stage backend-builder
COPY --from=backend-builder /app/backend/dist ./dist

# Copie le build du frontend depuis le stage webapp-builder
COPY --from=webapp-builder /app/webapp/dist /app/webapp/dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
