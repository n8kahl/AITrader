FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Install all deps (incl. dev) to build TypeScript
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only copy the minimal runtime artifacts
COPY --from=build /app/package*.json ./
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Respect Railway's PORT env; app binds to process.env.PORT in code
EXPOSE 8080
CMD ["node", "dist/server.js"]
