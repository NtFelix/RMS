#!/bin/bash

# Setup script for AI Agent Skills
# This script installs all necessary skills for the project.
# Run this after cloning the repo to ensure all AI best practices and tools are available.

echo "🚀 Installing AI Agent Skills..."

# Install all skills non-interactively using the --all flag
# This ensures all relevant best practices and tools are available to your AI agent.

# 1. Supabase Skills (Postgres Best Practices, Schema Design, etc.)
npx -y skills add supabase/agent-skills --all

# 2. Vercel & React Best Practices
npx -y skills add vercel-labs/agent-skills --all

# 3. Cloudflare Official Skills (Workers, Pages, Durable Objects, etc.)
npx -y skills add https://github.com/cloudflare/skills --all

# 4. Git Commit Formatter & General Utility Skills
npx -y skills add rominirani/antigravity-skills --all

# 5. PostHog Analytics Skills (instrumentation, debugging, surveys, etc.)
npx -y skills add posthog/posthog --all

# 6. PostHog Dedicated Skills (audit, debugger, survey creator, team health, etc.)
npx -y skills add posthog/skills --all

# 7. React Doctor (Million.js performance and health checks)
npx -y skills add millionco/react-doctor --all

echo "✅ All skills installed successfully!"
echo "The skills are managed via skills-lock.json and located in the .agents/skills directory."
