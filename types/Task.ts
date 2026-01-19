// Shared Task type definition
export interface Task {
  id: string
  name: string
  beschreibung?: string | null
  ist_erledigt: boolean
  erstellungsdatum: string
  aenderungsdatum: string
  user_id?: string
  faelligkeitsdatum?: string | null
}

// For compatibility with existing components that expect different field names
export interface TaskBoardTask extends Task {
  // Legacy compatibility fields
  description?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  dueDate?: string | null
}