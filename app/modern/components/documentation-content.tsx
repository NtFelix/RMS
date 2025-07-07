"use client";

import React from "react";
import { motion } from "framer-motion";
import { NotionPageData, NotionFileData } from "../../../lib/notion-service"; // Adjusted path, added NotionFileData
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // For styling carousel items
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button"; // For download button
import { Download, FileText as FileTextIcon, ImageIcon } from "lucide-react"; // Icons for files
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

interface DocumentationContentProps {
  isLoading: boolean;
  pageContent: BlockObjectResponse[] | null;
  pageFiles: NotionFileData[] | null;
  pages: NotionPageData[]; // Retained for potential fallback messages or if needed by NotionBlock for context
  error?: string | null; // Added error prop
}

// Helper function to render Notion rich text arrays
// (This function remains unchanged)
const NotionRichText = ({ richTextArray }: { richTextArray: any[] }) => {
  if (!richTextArray) return null;
  return (
    <>
      {richTextArray.map((textSegment, index) => {
        const { annotations, plain_text, href } = textSegment;
        let element = <>{plain_text}</>;

        if (annotations.bold) element = <strong>{element}</strong>;
        if (annotations.italic) element = <em>{element}</em>;
        if (annotations.strikethrough) element = <s>{element}</s>;
        if (annotations.underline) element = <u>{element}</u>;
        if (annotations.code) element = <code className="text-sm bg-muted p-1 rounded">{element}</code>;
        // Note: color annotations would require more complex mapping to Tailwind/CSS classes

        if (href) element = <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{element}</a>;

        return <React.Fragment key={index}>{element}</React.Fragment>;
      })}
    </>
  );
};

// Component to render a single Notion block
const NotionBlock = ({ block }: { block: BlockObjectResponse }) => {
  const { type } = block;

  switch (type) {
    case "paragraph":
      const paragraph = block.paragraph;
      return (
        <p className="mb-4 text-muted-foreground leading-relaxed">
          <NotionRichText richTextArray={paragraph.rich_text} />
        </p>
      );
    case "heading_1":
      const heading1 = block.heading_1;
      return (
        <h1 className="text-4xl font-bold text-foreground mt-8 mb-6">
          <NotionRichText richTextArray={heading1.rich_text} />
        </h1>
      );
    case "heading_2":
      const heading2 = block.heading_2;
      return (
        <h2 className="text-3xl font-bold text-foreground mt-6 mb-4">
          <NotionRichText richTextArray={heading2.rich_text} />
        </h2>
      );
    case "heading_3":
      const heading3 = block.heading_3;
      return (
        <h3 className="text-2xl font-semibold text-foreground mt-4 mb-3">
          <NotionRichText richTextArray={heading3.rich_text} />
        </h3>
      );
    case "bulleted_list_item":
      const bulletedListItem = block.bulleted_list_item;
      return (
        <li className="ml-6 list-disc text-muted-foreground">
          <NotionRichText richTextArray={bulletedListItem.rich_text} />
          {/* Note: Nested lists would require recursive rendering if `value.children` exists and is fetched */}
        </li>
      );
    case "numbered_list_item":
      const numberedListItem = block.numbered_list_item;
      return (
        <li className="ml-6 list-decimal text-muted-foreground">
          <NotionRichText richTextArray={numberedListItem.rich_text} />
           {/* Note: Nested lists would require recursive rendering if `value.children` exists and is fetched */}
        </li>
      );
    case "to_do":
      const toDo = block.to_do;
      return (
        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={toDo.checked} readOnly className="form-checkbox rounded text-primary" />
          <span className={toDo.checked ? "line-through text-muted-foreground" : "text-foreground"}>
            <NotionRichText richTextArray={toDo.rich_text} />
          </span>
        </div>
      );
    case "code":
      const code = block.code;
      // Basic code block rendering. For syntax highlighting, a library like react-syntax-highlighter would be needed.
      return (
        <pre className="bg-muted border border-border rounded-lg p-4 my-4 overflow-x-auto">
          <code className={`language-${code.language} text-sm text-foreground/90`}>
            <NotionRichText richTextArray={code.rich_text} />
          </code>
        </pre>
      );
    case "image":
      const image = block.image;
      const src = image.type === "external" ? image.external.url : image.file.url;
      const caption = image.caption?.length > 0 ? <NotionRichText richTextArray={image.caption} /> : null;
      return (
        <figure className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption ? "image with caption" : "image"} className="max-w-full h-auto rounded-lg border border-border" />
          {caption && <figcaption className="text-sm text-center text-muted-foreground mt-2">{caption}</figcaption>}
        </figure>
      );
    case "callout":
      const callout = block.callout;
      const calloutIcon = callout.icon;
      let iconElement = null;
      if (calloutIcon) {
        if (calloutIcon.type === "emoji") {
          iconElement = <span className="mr-2">{calloutIcon.emoji}</span>;
        } else if (calloutIcon.type === "external") {
          // eslint-disable-next-line @next/next/no-img-element
          iconElement = <img src={calloutIcon.external.url} alt="callout icon" className="w-6 h-6 mr-2 inline-block" />;
        } else if (calloutIcon.type === "file") {
           // eslint-disable-next-line @next/next/no-img-element
          iconElement = <img src={calloutIcon.file.url} alt="callout icon" className="w-6 h-6 mr-2 inline-block" />;
        }
      }
      // Basic styling for callout. Notion colors (e.g., "gray_background") would need mapping to Tailwind.
      return (
        <div className="my-4 p-4 bg-muted/70 border border-border rounded-lg flex items-start">
          {iconElement}
          <div className="text-muted-foreground">
            <NotionRichText richTextArray={callout.rich_text} />
          </div>
        </div>
      );
    case "table":
      // const table = block.table; // table specific data like table_width, has_column_header
      // For now, the 'table' block type itself won't render a <table> tag directly
      // because its children (table_row) are processed as separate blocks by NotionBlock.
      // Instead, we can render a wrapper or a title for the table.
      // A true table structure would require DocumentationContent to handle nesting
      // or for block data to be pre-processed with children.
      // This approach avoids invalid HTML (<table> followed by sibling <tr>).
      // We'll use ARIA roles for accessibility if using divs for table structure.
      // Updated to render actual table structure now that children are fetched.
      const tableData = block as any; // Cast to any to access potential 'children' property
      const tableBlockInfo = block.table; // Contains table_width, has_column_header, has_row_header

      return (
        <div className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse border border-border shadow-sm rounded-lg">
            {/* Optionally render <thead> based on tableBlockInfo.has_column_header */}
            {tableBlockInfo.has_column_header && tableData.children && tableData.children.length > 0 && (
              <thead className="bg-muted/50">
                {/* Render the first child (row) as header */}
                <NotionBlock key={tableData.children[0].id} block={tableData.children[0]} />
              </thead>
            )}
            <tbody>
              {(tableData.children && tableData.children.length > 0) ? (
                // If has_column_header, skip the first child as it's rendered in thead
                tableData.children.slice(tableBlockInfo.has_column_header ? 1 : 0).map((childBlock: BlockObjectResponse) => (
                  <NotionBlock key={childBlock.id} block={childBlock} />
                ))
              ) : (
                <tr>
                  <td colSpan={tableBlockInfo.table_width || 1} className="p-3 text-center text-muted-foreground">
                    This table is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    case "table_row":
      const tableRow = block.table_row;
      // Now renders as a proper <tr> since it will be a child of <table>
      return (
        <tr className="border-b border-border last:border-b-0 hover:bg-muted/60 transition-colors duration-150">
          {tableRow.cells.map((cellContent, cellIndex) => (
            <td
              key={cellIndex}
              className="p-3 border-r border-border last:border-r-0 text-foreground/90"
              // TODO: Apply has_row_header styling to first cell if applicable
            >
              <NotionRichText richTextArray={cellContent} />
            </td>
          ))}
        </tr>
      );
    // Add more cases for other block types as needed (e.g., quote, divider, etc.)
    // For unsupported blocks, you might want to log a warning or render a placeholder
    default:
      console.warn(`Unsupported block type: ${type}`, block);
      return <p className="text-red-500 my-2">[Unsupported block type: {type}]</p>;
  }
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
);

export default function DocumentationContent({ isLoading, pageContent, pageFiles, pages, error }: DocumentationContentProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-destructive/10 border border-destructive text-destructive rounded-xl p-8 shadow-lg max-w-md"
        >
          <FileTextIcon className="h-16 w-16 mx-auto mb-6" /> {/* Consider an error icon here */}
          <h2 className="text-2xl font-semibold mb-3">Error Loading Documentation</h2>
          <p className="leading-relaxed">
            Sorry, we encountered an error while trying to load the documentation content.
          </p>
          <p className="text-sm mt-2">
            Details: {error}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Please try again later or contact support if the issue persists.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!pageContent) {
    // This case handles when a page might not be selected yet (and no error has occurred yet).
    const noPagesAvailable = !pages || pages.length === 0;
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-card border border-border rounded-xl p-8 shadow-lg max-w-md"
        >
          <FileTextIcon className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            {noPagesAvailable ? "No Documentation Available" : "Select a Page"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {noPagesAvailable
              ? "It seems there are no documentation pages available at the moment. Please check back later or contact support if you believe this is an error."
              : "Please select a page from the sidebar to view its content."}
          </p>
          {noPagesAvailable && (
             <p className="text-xs text-muted-foreground mt-4">
                Ensure Notion integration is correctly set up and pages exist in the database.
             </p>
          )}
        </motion.div>
      </div>
    );
  }

  // pageContent is guaranteed to be an array here (even if empty) if not loading and not null
  // The parent DocumentationPage component sets selectedPageId to the first page by default if pages exist.

  return (
    <motion.section
      key={pageContent[0]?.id || "content-section"} // Use a key to ensure re-render on page change
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="scroll-mt-20" // Offset for fixed header when scrolling (if ever needed again)
    >
      {pageContent.length > 0 ? (
        pageContent.map((block) => (
          <NotionBlock key={block.id} block={block} />
        ))
      ) : (
        <div className="text-center py-10">
            <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">This page has no content.</p>
            <p className="text-sm text-muted-foreground">The selected documentation page is currently empty.</p>
        </div>
      )}

      {pageFiles && pageFiles.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-2xl font-semibold text-foreground mb-6">Dateien und Medien</h3>
          <Carousel
            opts={{
              align: "start",
              loop: pageFiles.length > 3, // Loop only if more than 3 items, for example
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {pageFiles.map((file, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base font-medium truncate flex items-center">
                          {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(file.fileTypeFromNotion.toLowerCase()) ?
                           <ImageIcon className="w-5 h-5 mr-2 text-primary flex-shrink-0" /> :
                           <FileTextIcon className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                          }
                          <span className="truncate" title={file.name}>{file.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 flex-grow flex items-center justify-center bg-muted/30 min-h-[120px]">
                        {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(file.fileTypeFromNotion.toLowerCase()) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.url} alt={file.name} className="max-h-36 max-w-full object-contain rounded" />
                        ) : (
                          <div className="text-center">
                            <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">.{file.fileTypeFromNotion || "file"}</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 bg-transparent border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(file.url, "_blank")}
                          title={`Download ${file.name}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download / View
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {pageFiles.length > 1 && ( // Show nav only if multiple items
              <>
                <CarouselPrevious className="absolute left-[-15px] top-1/2 -translate-y-1/2 text-foreground bg-background/80 hover:bg-background border-border shadow-md disabled:opacity-30" />
                <CarouselNext className="absolute right-[-15px] top-1/2 -translate-y-1/2 text-foreground bg-background/80 hover:bg-background border-border shadow-md disabled:opacity-30" />
              </>
            )}
          </Carousel>
        </div>
      )}
    </motion.section>
  );
}
