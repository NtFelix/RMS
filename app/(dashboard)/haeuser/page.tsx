"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { HouseFilters } from "@/components/house-filters"
import { HouseTable } from "@/components/house-table"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

export default function HaeuserPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", strasse: "", ort: "" })
  const [loading, setLoading] = useState(false)
  const tableReloadRef = useRef<() => void>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/haeuser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast({ title: "Haus gespeichert", description: "Das Haus wurde erfolgreich hinzugefügt." })
        setDialogOpen(false)
        setFormData({ name: "", strasse: "", ort: "" })
        tableReloadRef.current?.()
      } else {
        const errorData = await res.json()
        toast({ title: "Fehler", description: errorData.error || "Das Haus konnte nicht gespeichert werden.", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Fehler", description: "Netzwerkfehler beim Speichern.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Häuser</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Häuser und Immobilien</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Haus hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Haus hinzufügen</DialogTitle>
              <DialogDescription>Gib die Hausinformationen ein.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium leading-none">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="strasse" className="text-sm font-medium leading-none">Straße</label>
                <input
                  type="text"
                  id="strasse"
                  name="strasse"
                  value={formData.strasse}
                  onChange={handleChange}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="ort" className="text-sm font-medium leading-none">Ort</label>
                <input
                  type="text"
                  id="ort"
                  name="ort"
                  value={formData.ort}
                  onChange={handleChange}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Speichern..." : "Speichern"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Wohnungsliste</CardTitle>
          <CardDescription>Hier können Sie Ihre Wohnungen verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HouseFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <HouseTable filter={filter} searchQuery={searchQuery} reloadRef={tableReloadRef} />
        </CardContent>
      </Card>
    </div>
  )
}
