# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# Cache npm registry between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Build the source code
FROM node:22-alpine AS builder
WORKDIR /app

# Required at build time: inlined into client bundles
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_WORKER_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_APP_URL=https://mietevo.de
ARG NEXT_PUBLIC_MIETEVO_MCP_URL
ARG ROBOTS_INDEXING=true

# Optional at build time: PostHog sourcemap upload (build succeeds without these)
ARG POSTHOG_PROJECT_ID
ARG POSTHOG_HOST

# Build-time environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_WORKER_URL=$NEXT_PUBLIC_WORKER_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_MIETEVO_MCP_URL=$NEXT_PUBLIC_MIETEVO_MCP_URL
ENV ROBOTS_INDEXING=$ROBOTS_INDEXING
ENV POSTHOG_PROJECT_ID=$POSTHOG_PROJECT_ID
ENV POSTHOG_HOST=$POSTHOG_HOST
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=secret,id=POSTHOG_PERSONAL_API_KEY \
    POSTHOG_PERSONAL_API_KEY=$(cat /run/secrets/POSTHOG_PERSONAL_API_KEY 2>/dev/null || echo "") \
    npm run build

# Stage 3: Production image
FROM node:22-alpine AS runner
RUN apk upgrade --no-cache
WORKDIR /app

# Runtime environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ARG POSTHOG_HOST
ENV POSTHOG_HOST=$POSTHOG_HOST
ARG ROBOTS_INDEXING=true
ENV ROBOTS_INDEXING=$ROBOTS_INDEXING
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get({hostname:'localhost',port:process.env.PORT||3000,path:'/',timeout:2000},(res)=>{process.exit(res.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
