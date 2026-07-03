# ---- Stage 1: build the React client ----
FROM node:22-bookworm-slim AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci || npm install
COPY client/ ./
RUN npm run build

# ---- Stage 2: install server dependencies ----
FROM node:22-bookworm-slim AS server-deps
WORKDIR /build/server
COPY server/package*.json ./
# better-sqlite3 ships prebuilt binaries for this platform; fall back to a
# source build (python3 + build tools) only if the prebuilt download fails.
RUN npm ci --omit=dev || (apt-get update && apt-get install -y python3 build-essential && npm ci --omit=dev)

# ---- Stage 3: runtime image ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    CLIENT_DIST=/app/client/dist
WORKDIR /app/server

COPY --from=server-deps /build/server/node_modules ./node_modules
COPY server/ ./
COPY --from=client-build /build/client/dist /app/client/dist

RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME /data
EXPOSE 8080

CMD ["node", "src/index.js"]
