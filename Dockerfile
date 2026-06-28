# ---- deps: instala dependencias ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compila Next.js (standalone) ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Las NEXT_PUBLIC_* se inlinean en el bundle del navegador → deben existir en build.
# Son valores públicos (URL + anon key de Supabase). Se pasan como build args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Live-Dev (widget de feedback §16): también NEXT_PUBLIC_* → se inlinea en build.
# El widget token es público por diseño; no es un secreto.
ARG NEXT_PUBLIC_LIVEDEV_APP_ID
ARG NEXT_PUBLIC_LIVEDEV_TOKEN
ARG NEXT_PUBLIC_LIVEDEV_ENABLED
ENV NEXT_PUBLIC_LIVEDEV_APP_ID=$NEXT_PUBLIC_LIVEDEV_APP_ID
ENV NEXT_PUBLIC_LIVEDEV_TOKEN=$NEXT_PUBLIC_LIVEDEV_TOKEN
ENV NEXT_PUBLIC_LIVEDEV_ENABLED=$NEXT_PUBLIC_LIVEDEV_ENABLED

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- runner: imagen mínima de ejecución ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Salida standalone: server.js + node_modules mínimos, estáticos y public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
