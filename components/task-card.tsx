"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock } from "lucide-react"

interface TaskCardProps {
  task: {
    id: number
    name: string
    description: string
    status: string
    createdAt: string
    updatedAt: string
  }
}

export function TaskCard({ task }: TaskCardProps) {
  const statusColor =
    task.status === "Erledigt"
      ? "bg-green-50 text-green-700 hover:bg-green-50"
      : "bg-yellow-50 text-yellow-700 hover:bg-yellow-50"

  const statusIcon =
    task.status === "Erledigt" ? (
      <CheckCircle className="h-4 w-4 mr-1 text-green-700" />
    ) : (
      <Clock className="h-4 w-4 mr-1 text-yellow-700" />
    )

  return (
    <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{task.name}</CardTitle>
          <Badge variant="outline" className={statusColor}>
            <span className="flex items-center">
              {statusIcon} {task.status}
            </span>
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">Erstellt am {task.createdAt}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{task.description}</p>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <span>Zuletzt geändert: {task.updatedAt}</span>
        </div>
      </CardContent>
    </Card>
  )
}
