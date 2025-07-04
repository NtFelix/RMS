"use client";

import React from "react"; // Changed from "import type React"
import { motion } from "framer-motion";
import { NotionPageData } from "../../../lib/notion-service"; // Adjusted path
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

interface DocumentationContentProps {
  pages: NotionPageData[];
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
  // @ts-ignore - Notion API types can be broad, access type-specific data
  const value = block[type];

  switch (type) {
    case "paragraph":
      return (
        <p className="mb-4 text-muted-foreground leading-relaxed">
          <NotionRichText richTextArray={value.rich_text} />
        </p>
      );
    case "heading_1":
      return (
        <h1 className="text-4xl font-bold text-foreground mt-8 mb-6">
          <NotionRichText richTextArray={value.rich_text} />
        </h1>
      );
    case "heading_2":
      return (
        <h2 className="text-3xl font-bold text-foreground mt-6 mb-4">
          <NotionRichText richTextArray={value.rich_text} />
        </h2>
      );
    case "heading_3":
      return (
        <h3 className="text-2xl font-semibold text-foreground mt-4 mb-3">
          <NotionRichText richTextArray={value.rich_text} />
        </h3>
      );
    case "bulleted_list_item":
      return (
        <li className="ml-6 list-disc text-muted-foreground">
          <NotionRichText richTextArray={value.rich_text} />
          {/* Note: Nested lists would require recursive rendering if `value.children` exists and is fetched */}
        </li>
      );
    case "numbered_list_item":
      return (
        <li className="ml-6 list-decimal text-muted-foreground">
          <NotionRichText richTextArray={value.rich_text} />
           {/* Note: Nested lists would require recursive rendering if `value.children` exists and is fetched */}
        </li>
      );
    case "to_do":
      return (
        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={value.checked} readOnly className="form-checkbox rounded text-primary" />
          <span className={value.checked ? "line-through text-muted-foreground" : "text-foreground"}>
            <NotionRichText richTextArray={value.rich_text} />
          </span>
        </div>
      );
    case "code":
      // Basic code block rendering. For syntax highlighting, a library like react-syntax-highlighter would be needed.
      return (
        <pre className="bg-muted border border-border rounded-lg p-4 my-4 overflow-x-auto">
          <code className={`language-${value.language} text-sm text-foreground/90`}>
            <NotionRichText richTextArray={value.rich_text} />
          </code>
        </pre>
      );
    case "image":
      const src = value.type === "external" ? value.external.url : value.file.url;
      const caption = value.caption?.length > 0 ? <NotionRichText richTextArray={value.caption} /> : null;
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


export default function DocumentationContent({ pages }: DocumentationContentProps) {
  if (!pages || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-foreground mb-6">Documentation</h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            No documentation pages found or failed to load content from Notion.
          </p>
          <p className="text-sm text-muted-foreground">
            Please ensure your Notion integration is set up correctly and pages exist in the database.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {pages.map((page, index) => (
        <motion.section
          key={page.id}
          id={`doc-page-${page.id}`} // ID for sidebar navigation
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }} // Stagger animation
          className="scroll-mt-20" // Offset for fixed header when scrolling
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
      ))}
    </div>
  );
}
