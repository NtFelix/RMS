# PDF.js Worker Setup

## Overview

The custom PDF viewer uses PDF.js for rendering PDF documents. To avoid issues with external CDNs and ensure reliable operation, the PDF.js worker is served locally.

## Automatic Setup

The PDF.js worker is automatically copied to the public directory during the `postinstall` script:

```bash
npm install  # Automatically copies the worker file
```

## Manual Setup

If you need to manually copy the worker file:

```bash
mkdir -p public/js
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/js/pdf.worker.min.js
```

## File Location

- **Source**: `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
- **Destination**: `public/js/pdf.worker.min.js`
- **URL**: `/js/pdf.worker.min.js` (served by Next.js from public directory)

## Why Local Worker?

1. **Reliability**: No dependency on external CDNs
2. **Performance**: Faster loading from same domain
3. **Security**: No external requests for worker code
4. **Offline Support**: Works without internet connection

## Troubleshooting

If PDF viewing fails:

1. Check that `public/js/pdf.worker.min.js` exists
2. Run `npm run postinstall` to copy the worker file
3. Restart the development server
4. The system will automatically fallback to browser PDF viewer if needed

## Fallback Behavior

If PDF.js fails to load or work properly, the system automatically falls back to the browser's built-in PDF viewer using an iframe. This ensures users can always view PDF files, even if there are issues with the custom viewer.