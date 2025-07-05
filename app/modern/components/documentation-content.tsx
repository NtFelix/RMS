"use client";

import React from "react";
import { motion } from "framer-motion";
import { NotionPageData } from "../../../lib/notion-service";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

interface DocumentationContentProps {
  page: NotionPageData | null; // Changed from pages: NotionPageData[] to page: NotionPageData | null
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
        </li>
      );
    case "numbered_list_item":
      const numberedListItem = block.numbered_list_item;
      return (
        <li className="ml-6 list-decimal text-muted-foreground">
          <NotionRichText richTextArray={numberedListItem.rich_text} />
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
      return (
        <pre className="bg-muted border border-border rounded-lg p-4 my-4 overflow-x-auto">
          <code className={`language-${code.language} text-sm text-foreground/90`}>
            <NotionRichText richTextArray={code.rich_text} />
          </code>
        </pre>
      );
    case "image":
      const imageBlock = block.image; // Renamed to avoid conflict with HTMLImageElement
      const src = imageBlock.type === "external" ? imageBlock.external.url : imageBlock.file.url;
      const caption = imageBlock.caption?.length > 0 ? <NotionRichText richTextArray={imageBlock.caption} /> : null;
      return (
        <figure className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption ? "image with caption" : "image"} className="max-w-full h-auto rounded-lg border border-border" />
          {caption && <figcaption className="text-sm text-center text-muted-foreground mt-2">{caption}</figcaption>}
        </figure>
      );
    default:
      console.warn(`Unsupported block type: ${type}`, block);
      return <p className="text-red-500 my-2">[Unsupported block type: {type}]</p>;
  }
};


export default function DocumentationContent({ page }: DocumentationContentProps) {
  // The parent component (DocumentationPage) now handles loading states and
  // will only pass a valid 'page' object when it's ready to be displayed.
  // So, we might not need the extensive loading/empty state here as before,
  // but a check for 'page' is still good practice.
  if (!page) {
    // This case should ideally be handled by the parent,
    // e.g. by showing a "Select a page" message or loading indicator.
    // If it still reaches here, it means something unexpected happened or no page is active.
    return (
        <div className="flex flex-col items-center justify-center h-full text-center py-10">
            {/* This message might not be seen if parent handles it, but good fallback */}
        </div>
    );
  }

  return (
    // Removed outer space-y-12 and map, now rendering a single page
    <motion.section
      key={page.id} // Use page.id as key for motion component if page can change
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }} // Adjusted duration
      className="scroll-mt-20" // Still useful if there's an internal scroll anchor
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
