"use client"

import React from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Building2, Home, Users, Wallet, CheckSquare, FileSpreadsheet, File as FileIcon } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { AIToolId } from "@/hooks/use-ai-chat-store";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function ChatInput({
  inputValue,
  setInputValue,
  attachment,
  setAttachment,
  isLoading,
  isDark,
  selectedModel,
  setSelectedModel,
  enabledToolIds,
  toggleTool,
  handleFileSelect,
  fileInputRef,
  textareaRef,
  handleKeyDown,
  sendMessage,
}: {
  inputValue: string;
  setInputValue: (val: string) => void;
  attachment: { name: string; type: string; data: string } | null;
  setAttachment: (val: { name: string; type: string; data: string } | null) => void;
  isLoading: boolean;
  isDark: boolean;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  enabledToolIds: string[];
  toggleTool: (id: AIToolId) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  sendMessage: () => Promise<void>;
}) {
  return (
    <div className="p-4 bg-background border-t border-border/50 shadow-sm z-20">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className={`relative border border-border/10 rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-white text-foreground border-border/80'}`}
      >
        <div className="px-4 pt-3">
          {attachment && (
            <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-muted border border-border/40 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                {attachment.type.startsWith('image/') ? (
                  <div className="relative shrink-0 w-8 h-8 overflow-hidden rounded bg-background shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ALLOWED_IMAGE_MIME_TYPES.has(attachment.type) ? `data:${attachment.type};base64,${attachment.data}` : ""} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded bg-background shadow-sm">
                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm truncate text-foreground font-medium">{attachment.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAttachment(null)}
                className="w-7 h-7 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={attachment ? "Frage zum Anhang hinzufügen..." : "Alles mit KI erledigen..."}
            disabled={isLoading}
            rows={1}
            aria-label="Chat-Nachricht eingeben"
            className="w-full bg-transparent border-0 focus:ring-0 resize-none max-h-[150px] text-[15px] placeholder:text-muted-foreground disabled:opacity-50 min-h-[48px] outline-none"
            style={{ overflowY: inputValue.length > 50 ? 'auto' : 'hidden' }}
          />
        </div>
        
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.csv,.txt"
              aria-label="Datei hochladen"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
              title="Datei hochladen"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                  title="KI-Werkzeuge konfigurieren"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="14" y2="14"/><line x1="4" x2="20" y1="7" y2="7"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="8" cy="7" r="1"/></svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={`w-[200px] p-1.5 border-border/10 shadow-xl rounded-xl ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-white'}`}>
                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-2">
                  KI-Werkzeuge
                </DropdownMenuLabel>
                <div className="space-y-0.5">
                  {[
                    { id: 'get_houses', label: 'Häuser', icon: <Building2 className="w-4 h-4" /> },
                    { id: 'get_apartments', label: 'Wohnungen', icon: <Home className="w-4 h-4" /> },
                    { id: 'get_tenants', label: 'Mieter', icon: <Users className="w-4 h-4" /> },
                    { id: 'get_finances', label: 'Finanzen', icon: <Wallet className="w-4 h-4" /> },
                    { id: 'get_tasks', label: 'Aufgaben', icon: <CheckSquare className="w-4 h-4" /> },
                    { id: 'get_nebenkosten', label: 'Betriebskosten', icon: <FileSpreadsheet className="w-4 h-4" /> },
                  ].map((tool) => (
                    <div
                      key={tool.id}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-muted-foreground">
                          {tool.icon}
                        </div>
                        <span className="text-[13px] font-medium">{tool.label}</span>
                      </div>
                      <Switch
                        checked={enabledToolIds.includes(tool.id as AIToolId)}
                        onCheckedChange={() => toggleTool(tool.id as AIToolId)}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger className={`h-9 border-none bg-transparent hover:scale-100 active:scale-100 hover:shadow-none px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors gap-1.5 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${isDark ? 'hover:bg-white/5 data-[state=open]:bg-white/5' : 'hover:bg-black/5 data-[state=open]:bg-black/5'}`}>
                <div className="flex items-center gap-1.5 min-w-[85px]">
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <SelectValue placeholder="Modell wählen" />
                </div>
              </SelectTrigger>
              <SelectContent align="end" className={`w-[160px] border-border/10 shadow-xl rounded-xl p-1 ${isDark ? 'bg-[#1A1A1A]/95 text-white' : 'bg-white text-foreground'}`}>
                <SelectItem
                  value="gemini-3.1-flash-lite-preview"
                  className={`font-medium cursor-pointer ${selectedModel === "gemini-3.1-flash-lite-preview" ? (isDark ? "bg-white/10" : "bg-black/10") : (isDark ? "hover:bg-white/5 focus:bg-white/5" : "hover:bg-black/5 focus:bg-black/5")}`}
                >
                  Flash Lite 3.1
                </SelectItem>
                <SelectItem
                  value="gemini-3-flash-preview"
                  className={`font-medium cursor-pointer ${selectedModel === "gemini-3-flash-preview" ? (isDark ? "bg-white/10" : "bg-black/10") : (isDark ? "hover:bg-white/5 focus:bg-white/5" : "hover:bg-black/5 focus:bg-black/5")}`}
                >
                  Flash 3.0
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="submit"
              size="icon"
              disabled={isLoading || (!inputValue.trim() && !attachment)}
              className={`rounded-full w-9 h-9 shrink-0 shadow-none transition-all active:scale-95 disabled:opacity-30 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white disabled:hover:bg-white/10' : 'bg-black/10 hover:bg-black/20 text-foreground disabled:hover:bg-black/10'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
