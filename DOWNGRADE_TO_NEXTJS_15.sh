#!/bin/bash

# Downgrade to Next.js 15 for Cloudflare Pages compatibility
# Run this script to quickly fix the deployment issue

echo "🔄 Downgrading to Next.js 15 for Cloudflare Pages compatibility..."

# 1. Downgrade Next.js
echo "📦 Installing Next.js 15.0.3..."
npm install next@15.0.3

# 2. Rename proxy back to middleware
echo "📝 Renaming proxy.ts to middleware.ts..."
if [ -f "proxy.ts" ]; then
    mv proxy.ts middleware.ts
    echo "✅ Renamed proxy.ts to middleware.ts"
else
    echo "⚠️  proxy.ts not found, skipping rename"
fi

# 3. Update function name in middleware.ts
echo "📝 Updating function name from proxy to middleware..."
if [ -f "middleware.ts" ]; then
    sed -i '' 's/export async function proxy(/export async function middleware(/g' middleware.ts 2>/dev/null || \
    sed -i 's/export async function proxy(/export async function middleware(/g' middleware.ts
    echo "✅ Updated function name"
else
    echo "⚠️  middleware.ts not found"
fi

# 4. Update package.json scripts
echo "📝 Updating package.json scripts..."
sed -i '' 's/"dev": "next dev"/"dev": "next dev --turbo"/g' package.json 2>/dev/null || \
sed -i 's/"dev": "next dev"/"dev": "next dev --turbo"/g' package.json

sed -i '' 's/"build": "next build --turbopack"/"build": "next build"/g' package.json 2>/dev/null || \
sed -i 's/"build": "next build --turbopack"/"build": "next build"/g' package.json

echo "✅ Updated package.json"

echo ""
echo "✅ Downgrade complete!"
echo ""
echo "Next steps:"
echo "1. Test locally: npm run dev"
echo "2. Test build: npm run build"
echo "3. Commit: git add . && git commit -m 'fix: downgrade to Next.js 15 for Cloudflare'"
echo "4. Push: git push"
echo ""
echo "Your Cloudflare deployment should now work! 🚀"
