"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Message } from "./ai-chat-types"
import type { LLMStep } from "@/types/llm-steps"
import { EmptyState } from "./ai-chat-empty-state"
import { UserMessageBubble } from "./ai-chat-user-message"
import { AIMessageCard } from "./ai-chat-ai-message"
import { IntelligenceInsight } from "./ai-chat-intelligence-insight"

export function MessagesList({
  messages,
  isLoading,
  activeId,
  llmSteps,
  scrollRef,
  regenerateMessage,
  switchVersion,
}: {
  messages: Message[]
  isLoading: boolean
  activeId: string | null
  llmSteps: LLMStep[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  regenerateMessage: (id: string) => Promise<void>
  switchVersion: (messageId: string, versionIndex: number) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6" ref={scrollRef}>
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex w-full flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {m.role === "user" ? (
                <UserMessageBubble message={m} />
              ) : (
                <AIMessageCard
                  content={m.content}
                  traceId={m.traceId}
                  currentVersionIndex={m.currentVersionIndex}
                  totalVersions={m.versions?.length}
                  steps={m.steps}
                  toolCalls={m.toolCalls}
                  isActive={m.id === activeId}
                  isLoading={isLoading}
                  liveSteps={llmSteps}
                  onRegenerate={() => regenerateMessage(m.id)}
                  onVersionChange={(idx) => switchVersion(m.id, idx)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
      {isLoading && activeId === null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <IntelligenceInsight steps={llmSteps} isLoading={true} />
        </motion.div>
      )}
    </div>
  )
}
