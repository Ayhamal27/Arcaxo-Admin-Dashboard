# ---- deps ----
  FROM node:20-alpine AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci

  # ---- builder ----
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .

  # Variables de build (pasadas como ARG desde el workflow)
  ARG NEXT_PUBLIC_SUPABASE_URL
  ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
  ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  ARG NEXT_PUBLIC_APP_URL
  ARG NEXT_PUBLIC_APP_ENV
  ARG NEXT_PUBLIC_APP_VERSION

  ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
  ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
  ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
  ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
  ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

  RUN npm run build

  # ---- runner ----
  FROM node:20-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  ENV PORT=8080

  RUN addgroup --system --gid 1001 nodejs
  RUN adduser --system --uid 1001 nextjs

  COPY --from=builder /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

  USER nextjs
  EXPOSE 8080

  CMD ["node", "server.js"]