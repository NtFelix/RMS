"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  isResizing: boolean;
  setWidth: React.Dispatch<React.SetStateAction<number>>;
  onMouseDown: (e: React.MouseEvent) => void;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  onCommit?: (width: number) => void;
  ariaLabel?: string;
}

export function ResizeHandle({
  isResizing,
  setWidth,
  onMouseDown,
  width,
  minWidth = 360,
  maxWidth,
  onCommit,
  ariaLabel = "Panelbreite anpassen",
}: ResizeHandleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentMaxWidth =
      maxWidth ??
      (typeof window !== "undefined" ? window.innerWidth * 0.9 : 1200);

    if (e.key === "ArrowLeft") {
      // Sheet is docked on the right; moving handle to the left EXPANDS the sheet width
      e.preventDefault();
      setWidth((prev) => {
        const next = Math.min(currentMaxWidth, prev + 20);
        onCommit?.(next);
        return next;
      });
    } else if (e.key === "ArrowRight") {
      // Sheet is docked on the right; moving handle to the right SHRINKS the sheet width
      e.preventDefault();
      setWidth((prev) => {
        const next = Math.max(minWidth, prev - 20);
        onCommit?.(next);
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setWidth(() => {
        onCommit?.(minWidth);
        return minWidth;
      });
    } else if (e.key === "End") {
      e.preventDefault();
      setWidth(() => {
        onCommit?.(currentMaxWidth);
        return currentMaxWidth;
      });
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={typeof width === "number" ? Math.round(width) : undefined}
      aria-valuemin={minWidth}
      aria-valuemax={typeof maxWidth === "number" ? Math.round(maxWidth) : undefined}
      onMouseDown={onMouseDown}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 select-none group/resize-handle hidden sm:block appearance-none bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-xs",
        isResizing ? "cursor-ew-resize" : ""
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-all duration-150 ease-in-out",
          isResizing
            ? "bg-primary"
            : "bg-transparent group-hover/resize-handle:bg-primary/40 group-focus-visible/resize-handle:bg-primary"
        )}
      />
    </div>
  );
}
