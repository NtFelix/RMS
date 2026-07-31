"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  isResizing: boolean;
  setWidth: React.Dispatch<React.SetStateAction<number>>;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({
  isResizing,
  setWidth,
  onMouseDown,
}: ResizeHandleProps) {
  return (
    <button
      type="button"
      aria-label="Panelgröße anpassen"
      onMouseDown={onMouseDown}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setWidth(prev => Math.max(360, prev - 20));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setWidth(prev => Math.min(window.innerWidth * 0.9, prev + 20));
        }
      }}
      className={cn(
        "absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 select-none group/resize-handle hidden sm:block appearance-none bg-transparent border-none p-0",
        isResizing ? "cursor-ew-resize" : ""
      )}
    >
      <div className={cn(
        "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-all duration-150 ease-in-out",
        isResizing ? "bg-primary" : "bg-transparent group-hover/resize-handle:bg-primary/40"
      )} />
    </button>
  );
}
