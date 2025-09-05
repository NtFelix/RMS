# Documentation System

This directory contains the modern documentation system that integrates with Notion to provide dynamic documentation pages.

## Features

- **Server-Side Rendering**: Documentation content is fetched server-side for better SEO and performance
- **Notion Integration**: Content is sourced from a Notion database with filtering for "Version 2.0"
- **Caching**: In-memory caching for both page metadata (5 min) and content (2 min) to reduce API calls
- **Dynamic Metadata**: SEO-optimized metadata generation based on selected page
- **Responsive Design**: Mobile-friendly layout with collapsible sidebar
- **Search Functionality**: Client-side search through documentation pages
- **File Support**: Display and download files attached to Notion pages

## Architecture

### Components

- `page.tsx` - Main documentation page with server-side data fetching
- `loading.tsx` - Loading skeleton that matches the final layout
- `components/documentation-content.tsx` - Renders Notion blocks with full formatting support
- `components/documentation-sidebar.tsx` - Searchable sidebar with categorized navigation

### Data Flow

1. **Page Load**: Server fetches all pages from Notion database (cached for 5 minutes)
2. **Content Loading**: Selected page content is fetched (cached for 2 minutes)
3. **Client Navigation**: URL search params update to change selected page
4. **Search**: Client-side filtering of cached page metadata

### Notion Integration

The system expects a Notion database with the following properties:
- **Name** (Title): Page title
- **Kategorie** (Select): Category for grouping pages
- **Version** (Select): Must be "Version 2.0" to be included
- **Dateien und Medien** (Files): Attachments displayed in carousel

### Performance Optimizations

- **Caching**: Reduces Notion API calls with configurable cache durations
- **React.memo**: Prevents unnecessary re-renders of content components
- **Parallel Fetching**: Content and metadata fetched simultaneously
- **Loading States**: Skeleton components improve perceived performance

## Environment Variables

```bash
NOTION_API_KEY=your-notion-integration-token
NOTION_DATABASE_ID=your-notion-database-id
```

## Cache Management

The system includes utility functions for cache management:

```typescript
import { clearNotionCaches, getCacheStats } from '@/lib/notion-service';

// Clear all caches (useful for development)
clearNotionCaches();

// Get cache statistics
const stats = getCacheStats();
console.log(stats); // { pagesCache: boolean, contentCacheSize: number }
```

## Supported Notion Blocks

- Paragraphs with rich text formatting
- Headings (H1, H2, H3)
- Lists (bulleted, numbered)
- To-do items with checkboxes
- Code blocks with language support
- Images with captions
- Callouts with icons
- Tables with headers and formatting

## Future Enhancements

- [ ] Add syntax highlighting for code blocks
- [ ] Implement full-text search across page content
- [ ] Add breadcrumb navigation
- [ ] Support for nested pages/hierarchical structure
- [ ] Add print-friendly styles
- [ ] Implement page analytics tracking