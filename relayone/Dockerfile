FROM node:22.23.2-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.23.2-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=6060 \
    FRONTEND_DIST=/app/dist \
    RELAY_ASSET_DIRECTORY=/var/lib/relay-node/assets \
    RELAY_IDENTITY_DIRECTORY=/var/lib/relay-node/identity \
    RELAY_DATA_SOURCE=projection

WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/migrations ./migrations

RUN mkdir -p /var/lib/relay-node/assets /var/lib/relay-node/identity \
    && chown -R node:node /var/lib/relay-node /app

USER node
EXPOSE 6060
VOLUME ["/var/lib/relay-node/assets", "/var/lib/relay-node/identity"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e 'fetch("http://127.0.0.1:6060/api/health/ready").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'

CMD ["sh", "-c", "node dist-server/server/runMigrations.js && exec node dist-server/server/server.js"]
