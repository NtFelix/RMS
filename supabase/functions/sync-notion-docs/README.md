# Notion Documentation Sync Edge Function

This Supabase Edge Function automatically syncs documentation content from a Notion database to the Supabase `Dokumentation` table.

## Features

- **Automated Sync**: Fetches pages from Notion database and syncs to Supabase
- **Incremental Updates**: Only processes changed pages to optimize performance
- **Content Extraction**: Converts Notion blocks to markdown format
- **Property Mapping**: Maps Notion properties to Supabase fields
- **Batch Processing**: Handles large datasets efficiently with rate limiting
- **Error Handling**: Comprehensive error logging and recovery
- **Monitoring**: Built-in sync monitoring and alerting system
- **Health Checks**: Endpoint for monitoring system health

## Setup

### 1. Environment Variables

Configure the following environment variables in your Supabase project:

```bash
# Required for sync operations
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_notion_database_id
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional for alerts
SYNC_ALERT_WEBHOOK_URL=your_webhook_url_for_alerts
SYNC_ALERT_SLACK_CHANNEL=your_slack_channel_for_alerts
```

### 2. Notion Integration Setup

1. Create a new integration in Notion:
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name and select your workspace
   - Copy the "Internal Integration Token"

2. Share your database with the integration:
   - Open your Notion database
   - Click "Share" → "Invite"
   - Search for your integration name and invite it

3. Get your database ID:
   - Open your database in Notion
   - Copy the ID from the URL: `https://notion.so/[workspace]/[database_id]?v=...`

### 3. Database Setup

Run the migration files to set up the required tables:

```sql
-- Run these migrations in your Supabase SQL editor
-- 1. Create Dokumentation table
-- 2. Set up sync logging and cron jobs
```

### 4. Deploy the Edge Function

```bash
# Deploy to Supabase
supabase functions deploy sync-notion-docs

# Set environment variables
supabase secrets set NOTION_TOKEN=your_token
supabase secrets set NOTION_DATABASE_ID=your_database_id
```

## Usage

### Manual Sync

Trigger a manual sync via HTTP request:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/sync-notion-docs \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"syncType": "manual"}'
```

### Scheduled Sync

The function is automatically called every 6 hours via cron job (configured in migration).

### Health Check

Check system health:

```bash
curl https://your-project.supabase.co/functions/v1/sync-notion-docs/health
```

### Sync History

View recent sync operations:

```bash
curl https://your-project.supabase.co/functions/v1/sync-notion-docs/history
```

### Sync Statistics

Get sync performance statistics:

```bash
curl https://your-project.supabase.co/functions/v1/sync-notion-docs/stats
```

## Data Mapping

The function maps Notion properties to Supabase fields as follows:

| Notion Property | Supabase Field | Description |
|----------------|----------------|-------------|
| Name (title) | `titel` | Article title |
| Kategorie (select) | `kategorie` | Article category |
| Page content | `seiteninhalt` | Markdown content extracted from blocks |
| All other properties | `meta` (JSONB) | Additional metadata including timestamps |

## Supported Notion Block Types

The function converts the following Notion block types to markdown:

- **Headings**: `# ## ###`
- **Paragraphs**: Plain text with formatting
- **Lists**: Bulleted and numbered lists
- **Code blocks**: With language syntax highlighting
- **Quotes**: Block quotes
- **Rich text**: Bold, italic, code, strikethrough, links

## Monitoring and Alerts

### Sync Logging

All sync operations are logged in the `NotionSyncLog` table with:
- Sync type (manual/scheduled)
- Start and completion timestamps
- Success status
- Pages processed count
- Error messages
- Performance metrics

### Alert Conditions

Alerts are triggered when:
- Sync fails completely
- Sync has errors processing pages
- Sync takes longer than 5 minutes
- No successful sync in 24 hours (health check)

### Alert Channels

Configure alerts via environment variables:
- **Webhook**: Generic HTTP webhook for custom integrations
- **Slack**: Direct Slack channel notifications (requires setup)

## Testing

Run the test suite:

```bash
deno test --allow-all test.ts
```

Tests cover:
- Property extraction and transformation
- Content block conversion
- Error handling scenarios
- Batch processing logic
- Integration with Supabase

## Performance Considerations

- **Batch Size**: Processes 10 pages per batch with 1-second delays
- **Rate Limiting**: Respects Notion API rate limits
- **Incremental Sync**: Only processes changed pages
- **Content Caching**: Avoids re-processing unchanged content
- **Database Indexing**: Optimized queries with proper indexes

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all required variables are set in Supabase secrets
   - Check variable names match exactly

2. **Notion API Errors**
   - Verify integration token is valid
   - Ensure database is shared with integration
   - Check database ID is correct

3. **Supabase Connection Issues**
   - Verify service role key has proper permissions
   - Check RLS policies allow function access

4. **Sync Failures**
   - Check sync logs in `NotionSyncLog` table
   - Review Edge Function logs in Supabase dashboard
   - Verify Notion database structure matches expectations

### Debug Mode

Enable detailed logging by setting log level:

```bash
supabase secrets set LOG_LEVEL=debug
```

## Security

- Uses Supabase service role key for database operations
- Notion token stored securely in Supabase secrets
- RLS policies protect data access
- Input validation and sanitization
- Error messages don't expose sensitive information

## Limitations

- Maximum 100 pages per sync operation (Notion API limit)
- Text content only (images and files not synced)
- Requires manual Notion integration setup
- Cron jobs depend on Supabase infrastructure

## Contributing

1. Make changes to the Edge Function code
2. Run tests: `deno test --allow-all test.ts`
3. Test locally: `deno run --allow-all --watch index.ts`
4. Deploy: `supabase functions deploy sync-notion-docs`

## License

This Edge Function is part of the RMS (Rent Management System) project.