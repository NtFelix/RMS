import { ReactNode } from "react"

export interface Tab {
  value: string
  label: string
  icon: React.ElementType
  group?: string
  content?: ReactNode
}

