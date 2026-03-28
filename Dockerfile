# Stage 1: Build frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY . .

# VITE_* Firebase vars are baked into the bundle at build time
# GEMINI_API_KEY is NOT baked in — it stays server-side only
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Restore tsx (needed to run server.ts at runtime)
RUN npm install tsx

# Copy built frontend and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY server.ts tsconfig.json vite.config.ts ./

EXPOSE 4000

CMD ["npx", "tsx", "server.ts"]
