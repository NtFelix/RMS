# Stage 1: Dependencies
FROM node:22.22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# Cache npm registry between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Build the source code
FROM node:22.22-slim AS builder
WORKDIR /app

# Required at build time: inlined into client bundles
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_WORKER_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_MIETEVO_MCP_URL

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
ENV NEXT_PUBLIC_MIETEVO_MCP_URL=$NEXT_PUBLIC_MIETEVO_MCP_URL
ENV POSTHOG_PROJECT_ID=$POSTHOG_PROJECT_ID
ENV POSTHOG_HOST=$POSTHOG_HOST
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use a secret mount for the PostHog API key (optional for local builds)
# We rely on the .next/cache copied from the build context for incremental builds
# in CI. GitHub Actions caches the .next folder and restores it before docker build.
# This allows incremental Next.js compilation without Docker's native cache mounts.
RUN --mount=type=secret,id=POSTHOG_PERSONAL_API_KEY \
    POSTHOG_PERSONAL_API_KEY=$(cat /run/secrets/POSTHOG_PERSONAL_API_KEY 2>/dev/null || echo "") \
    npm run build

# Stage 3: Production image
FROM node:22.22-slim AS runner
WORKDIR /app

# Runtime environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Optional: PostHog server-side logging (not required for build)
ARG POSTHOG_HOST
ENV POSTHOG_HOST=$POSTHOG_HOST

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Healthcheck that respects the dynamic PORT environment variable
# Simple Node.js HTTP check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get({hostname:'localhost',port:process.env.PORT||3000,path:'/',timeout:2000},(res)=>{process.exit(res.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
