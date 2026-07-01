"use client"

import React from "react";
import { File as FileIcon } from "lucide-react";
import type { Message } from "./ai-chat-types";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function UserMessageBubble({ message }: { message: Message }) {
  return (
    <div className="flex flex-col items-end max-w-[85%]">
      <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-[20px] rounded-tr-[4px] shadow-sm border border-primary/10 relative overflow-hidden group/message">
        {message.attachment && (
          <div className="flex flex-col gap-2 mb-3 p-0 rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 group/attachment relative z-10">
            {message.attachment.type.startsWith('image/') ? (
              <div className="relative aspect-auto max-h-[220px] w-full overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ALLOWED_IMAGE_MIME_TYPES.has(message.attachment.type) ? `data:${message.attachment.type};base64,${message.attachment.data}` : ""} alt={message.attachment.name} className="object-contain w-full h-full transform transition-transform duration-700 group-hover/attachment:scale-105" />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/10 uppercase tracking-widest shadow-lg">
                  Bild
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-white/5">
                <div className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 group-hover/attachment:bg-white/20 transition-colors duration-300">
                  <FileIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] truncate font-bold text-white leading-tight">{message.attachment.name}</span>
                  <span className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5 font-medium">Dokument</span>
                </div>
              </div>
            )}
          </div>
        )}
        <p className="whitespace-pre-wrap relative z-10 font-medium">{message.content}</p>
      </div>
    </div>
  );
}
