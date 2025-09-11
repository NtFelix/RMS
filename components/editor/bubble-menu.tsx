"use client"

import React from 'react'
import { Editor } from '@tiptap/core'

interface BubbleMenuProps {
  editor: Editor
  className?: string
  onVariableInsert?: () => void
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({ 
  editor, 
  className,
  onVariableInsert 
}) => {
  // For now, return null as we'll implement this differently
  // The BubbleMenu functionality will be handled by the editor extension
  // or we'll create a custom implementation later
  return null
}