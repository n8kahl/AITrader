FROM node:20-alpine AS build
WORKDIR /app

# Copy only the gateway app for faster caching
COPY apps/gateway/package*.json ./
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; else npm install; fi
COPY apps/gateway ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 8080
CMD ["node", "dist/server.js"]
