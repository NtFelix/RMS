import { ReactNode } from "react"

export interface Tab {
  value: string
  label: string
  icon: React.ElementType
  content?: ReactNode
}
