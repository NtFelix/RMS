"use client"

import { useState, useRef, useCallback, useEffect } from "react" // Add useCallback and useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { HouseFilters } from "@/components/house-filters"
import { HouseTable, House } from "@/components/house-table" // Import House type
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog" // Removed DialogClose (unused)
import { Input } from "@/components/ui/input" // Import Input
import { Label } from "@/components/ui/label" // Import Label
import { toast } from "@/components/ui/use-toast"


export default function HaeuserPage() {

  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null) // State for editing
  const [formData, setFormData] = useState({ name: "", strasse: "", ort: "" })
  const [loading, setLoading] = useState(false)
  const tableReloadRef = useRef<() => void>(null)

  // Listen for the custom event to open the modal
  useEffect(() => {
    const handler = () => {
      setEditingHouseId(null)
      setFormData({ name: "", strasse: "", ort: "" })
      setDialogOpen(true)
    }
    window.addEventListener("open-add-house-modal", handler)
    return () => window.removeEventListener("open-add-house-modal", handler)
  }, [])

  // Reset form and editing state when dialog closes
  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingHouseId(null)
      setFormData({ name: "", strasse: "", ort: "" })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Function to open dialog for editing
  const handleEdit = useCallback((house: House) => {
    setEditingHouseId(house.id)
    setFormData({ name: house.name, strasse: house.strasse || "", ort: house.ort })
    setDialogOpen(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const url = editingHouseId ? `/api/haeuser?id=${editingHouseId}` : "/api/haeuser"
    const method = editingHouseId ? "PUT" : "POST"
    const successMessage = editingHouseId ? "Das Haus wurde erfolgreich aktualisiert." : "Das Haus wurde erfolgreich hinzugefügt."
    const toastTitle = editingHouseId ? "Haus aktualisiert" : "Haus gespeichert"

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast({ title: toastTitle, description: successMessage })
        handleOpenChange(false) // Close dialog and reset state
        tableReloadRef.current?.() // Reload table data
      } else {
        const errorData = await res.json()
        toast({ title: "Fehler", description: errorData.error || `Das Haus konnte nicht ${editingHouseId ? 'aktualisiert' : 'gespeichert'} werden.`, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Fehler", description: `Netzwerkfehler beim ${editingHouseId ? 'Aktualisieren' : 'Speichern'}.`, variant: "destructive" })
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
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}> {/* Use handleOpenChange */}
          <DialogTrigger asChild>
            <Button className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Haus hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]"> {/* Added class for consistent width */}
            <DialogHeader>
              <DialogTitle>{editingHouseId ? "Haus bearbeiten" : "Haus hinzufügen"}</DialogTitle> {/* Dynamic Title */}
              <DialogDescription>
                {editingHouseId ? "Aktualisiere die Hausinformationen." : "Gib die Hausinformationen ein."} {/* Dynamic Description */}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label> {/* Use Label */}
                <Input // Use Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="strasse">Straße</Label> {/* Use Label */}
                <Input // Use Input
                  type="text"
                  id="strasse"
                  name="strasse"
                  value={formData.strasse}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ort">Ort</Label> {/* Use Label */}
                <Input // Use Input
                  type="text"
                  id="ort"
                  name="ort"
                  value={formData.ort}
                  onChange={handleChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {/* Dynamic Button Text */}
                  {loading ? (editingHouseId ? "Aktualisieren..." : "Speichern...") : (editingHouseId ? "Aktualisieren" : "Speichern")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Hausliste</CardTitle>
          <CardDescription>Hier können Sie Ihre Häuser verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HouseFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          {/* Pass handleEdit down as onEdit prop */}
          <HouseTable
            filter={filter}
            searchQuery={searchQuery}
            reloadRef={tableReloadRef}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>
    </div>
  )
}
