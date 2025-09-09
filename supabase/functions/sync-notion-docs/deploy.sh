#!/bin/bash

# Notion Documentation Sync - Deployment Script
# This script deploys the Edge Function and sets up the required configuration

set -e

echo "🚀 Deploying Notion Documentation Sync Edge Function..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy the Edge Function
echo "📦 Deploying Edge Function..."
supabase functions deploy sync-notion-docs

echo "✅ Edge Function deployed successfully!"

# Prompt for environment variables if not set
echo ""
echo "🔧 Setting up environment variables..."

# Check if secrets are already set
echo "Please set the following secrets in your Supabase dashboard or using the CLI:"
echo ""
echo "Required secrets:"
echo "  NOTION_TOKEN=your_notion_integration_token"
echo "  NOTION_DATABASE_ID=your_notion_database_id"
echo "  SUPABASE_URL=your_supabase_project_url"
echo "  SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key"
echo ""
echo "Optional secrets (for alerts):"
echo "  SYNC_ALERT_WEBHOOK_URL=your_webhook_url"
echo "  SYNC_ALERT_SLACK_CHANNEL=your_slack_channel"
echo ""

read -p "Do you want to set these secrets now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting secrets..."
    
    read -p "Enter NOTION_TOKEN: " NOTION_TOKEN
    if [ ! -z "$NOTION_TOKEN" ]; then
        supabase secrets set NOTION_TOKEN="$NOTION_TOKEN"
    fi
    
    read -p "Enter NOTION_DATABASE_ID: " NOTION_DATABASE_ID
    if [ ! -z "$NOTION_DATABASE_ID" ]; then
        supabase secrets set NOTION_DATABASE_ID="$NOTION_DATABASE_ID"
    fi
    
    read -p "Enter SYNC_ALERT_WEBHOOK_URL (optional): " WEBHOOK_URL
    if [ ! -z "$WEBHOOK_URL" ]; then
        supabase secrets set SYNC_ALERT_WEBHOOK_URL="$WEBHOOK_URL"
    fi
    
    echo "✅ Secrets configured!"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run the database migrations to create required tables"
echo "2. Test the sync function:"
echo "   curl -X POST https://your-project.supabase.co/functions/v1/sync-notion-docs"
echo "3. Check health status:"
echo "   curl https://your-project.supabase.co/functions/v1/sync-notion-docs/health"
echo ""
echo "📚 See README.md for detailed setup instructions"