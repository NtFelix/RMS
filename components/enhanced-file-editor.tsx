"use client"

import { TiptapTemplateEditor } from "@/components/tiptap-template-editor"
import { type PlaceholderDefinition } from "@/lib/template-system/placeholder-engine"

interface EnhancedFileEditorProps {
  isOpen: boolean
  onClose: () => void
  filePath?: string
  fileName?: string
  initialContent?: string
  isNewFile?: boolean
  onSave?: (content: string) => void
  enableAutocomplete?: boolean
  placeholderDefinitions?: PlaceholderDefinition[]
}

export function EnhancedFileEditor({
  isOpen,
  onClose,
  filePath,
  fileName,
  initialContent = "",
  isNewFile = false,
  onSave,
  enableAutocomplete = false,
  placeholderDefinitions
}: EnhancedFileEditorProps) {
  // Simply wrap the TiptapTemplateEditor to maintain backward compatibility
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
      placeholderDefinitions={placeholderDefinitions}
    />
  )
}