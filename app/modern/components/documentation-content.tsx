"use client";

import React from "react";
import { motion } from "framer-motion";
import { NotionPageData } from "../../../lib/notion-service";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// Define a type for the page that includes content, matching the one in page.tsx
interface PageWithContent extends NotionPageData {
  content: BlockObjectResponse[];
}

interface DocumentationContentProps {
  page: PageWithContent | null; // Expects a single page object or null
}

// Helper function to render Notion rich text arrays
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
    // Add more cases for other block types as needed (e.g., quote, callout, divider, table, etc.)
    // For unsupported blocks, you might want to log a warning or render a placeholder
    default:
      console.warn(`Unsupported block type: ${type}`, block);
      return <p className="text-red-500 my-2">[Unsupported block type: {type}]</p>;
  }
};

export default function DocumentationContent({ page }: DocumentationContentProps) {
  // Case: No page is selected or passed (e.g. initial state before first page loads, or error)
  // The parent component (DocumentationPage) already handles loading and error messages.
  // This component now just needs to render the passed 'page' or a "select a page" message if null.
  if (!page) {
    // This message might not be shown if parent handles loading/error states comprehensively.
    // Or it could be a fallback if parent logic allows page to be null without an active error/loading state.
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold text-foreground mb-4">Select a Document</h2>
          <p className="text-muted-foreground">
            Choose a document from the sidebar to view its content.
          </p>
        </motion.div>
      </div>
    );
  }

  // Case: A page is provided, render its content
  return (
    // Use a key on the motion.section to ensure remount and animation when the page.id changes
    <motion.section
      key={page.id}
      id={`doc-page-content-${page.id}`} // Unique ID for the content area if needed, though scrolling is handled by window now
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} // Slightly faster transition for content swapping
      className="scroll-mt-20" // Offset for fixed header if any part of this component itself becomes scrollable (less likely now)
    >
      <h1 className="text-4xl font-bold text-foreground mb-6 border-b pb-4">
        {page.title || "Untitled Page"}
      </h1>

      {page.content && page.content.length > 0 ? (
        page.content.map((block) => (
          <NotionBlock key={block.id} block={block} />
        ))
      ) : (
        <p className="text-muted-foreground">This page has no content.</p>
      )}
    </motion.section>
  );
}
