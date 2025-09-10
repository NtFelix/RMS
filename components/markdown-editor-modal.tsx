"use client"

import { TiptapTemplateEditor } from "@/components/tiptap-template-editor"

interface MarkdownEditorModalProps {
  isOpen: boolean
  onClose: () => void
  filePath?: string
  fileName?: string
  initialContent?: string
  isNewFile?: boolean
  onSave?: (content: string) => void
  enableAutocomplete?: boolean
}

export function MarkdownEditorModal({
  isOpen,
  onClose,
  filePath,
  fileName,
  initialContent = "",
  isNewFile = false,
  onSave,
  enableAutocomplete = false
}: MarkdownEditorModalProps) {
  return (
    <TiptapTemplateEditor
      isOpen={isOpen}
      onClose={onClose}
      filePath={filePath}
      fileName={fileName}
      initialContent={initialContent}
      isNewFile={isNewFile}
      onSave={onSave}
      enableAutocomplete={enableAutocomplete}
    />
  )
}