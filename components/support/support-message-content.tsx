"use client"

import React, { useState, useMemo, memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ExternalLink, Eye, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const REMARK_PLUGINS = [remarkGfm]

interface SupportMessageContentProps {
  content: string
  isCustomer: boolean
  onOpenImage?: (data: { src: string; alt?: string }) => void
}

const SupportImageElement = memo(function SupportImageElement({
  src,
  alt,
  onOpenImage,
}: {
  src?: string
  alt?: string
  onOpenImage?: (data: { src: string; alt?: string }) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  if (!src) return null

  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 my-1.5 px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs max-w-full">
        <AlertCircle className="size-3.5 shrink-0" />
        <span className="truncate">Bild konnte nicht geladen werden {alt ? `(${alt})` : ''}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline font-semibold ml-1 shrink-0"
        >
          Link öffnen
        </a>
      </span>
    )
  }

  return (
    <span className="block my-2 max-w-full group/img relative">
      <button
        type="button"
        onClick={() => onOpenImage?.({ src, alt })}
        className="relative block max-w-full rounded-xl overflow-hidden border border-border/70 bg-muted/40 shadow-xs hover:border-primary/50 transition-all cursor-zoom-in text-left group"
      >
        {loading && (
          <span className="flex items-center justify-center gap-2 p-6 bg-muted/30 text-muted-foreground text-xs min-h-[100px] min-w-[160px]">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Lade Bild...</span>
          </span>
        )}
        
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Support Image"}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError(true)
          }}
          className={cn(
            "max-w-full max-h-80 w-auto h-auto object-contain rounded-xl block transition-all duration-300 group-hover:scale-[1.01]",
            loading ? "hidden" : "block",
          )}
        />

        {!loading && !error && (
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 text-white text-[11px] font-medium shadow-lg">
              <Eye className="size-3.5" />
              <span>Vergrößern</span>
            </span>
          </span>
        )}
      </button>

      {alt && alt !== 'image' && !loading && !error && (
        <span className="block text-[10px] text-muted-foreground/80 mt-1 italic px-0.5 truncate max-w-full">
          {alt}
        </span>
      )}
    </span>
  )
})

export const SupportMessageContent = memo(function SupportMessageContent({
  content,
  isCustomer,
  onOpenImage,
}: SupportMessageContentProps) {
  const components = useMemo(() => ({
    img: ({ src, alt }: { src?: any; alt?: string }) => (
      <SupportImageElement
        src={typeof src === "string" ? src : undefined}
        alt={alt}
        onOpenImage={onOpenImage}
      />
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-opacity hover:opacity-80 break-all",
          isCustomer
            ? "text-primary-foreground decoration-primary-foreground/60"
            : "text-primary decoration-primary/60",
        )}
        {...props}
      >
        <span>{children}</span>
        <ExternalLink className="size-2.5 inline-block shrink-0 opacity-75" />
      </a>
    ),
    p: ({ children }: any) => (
      <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-4 mb-2 space-y-1 last:mb-0">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-4 mb-2 space-y-1 last:mb-0">{children}</ol>
    ),
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    code: ({ children, className }: any) => {
      const isBlock = className?.includes("language-")
      if (isBlock) {
        return (
          <div className="my-2 p-2.5 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
            <code>{children}</code>
          </div>
        )
      }
      return (
        <code
          className={cn(
            "font-mono text-[11px] px-1.5 py-0.5 rounded-md",
            isCustomer
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-foreground border border-border/60",
          )}
        >
          {children}
        </code>
      )
    },
    blockquote: ({ children }: any) => (
      <blockquote
        className={cn(
          "border-l-2 pl-3 py-1 my-2 italic text-[11px]",
          isCustomer ? "border-primary-foreground/50 opacity-90" : "border-primary/60 text-muted-foreground",
        )}
      >
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-2 rounded-lg border border-border/60">
        <table className="min-w-full text-left text-[11px] border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border-b border-border/60 p-1.5 font-bold bg-muted/40">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="border-b border-border/40 p-1.5">{children}</td>
    ),
  }), [isCustomer, onOpenImage])

  return (
    <div
      className={cn(
        "text-xs leading-relaxed break-words support-message-content",
        isCustomer ? "text-primary-foreground" : "text-card-foreground",
      )}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
