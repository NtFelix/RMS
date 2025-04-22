"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { ApartmentFilters } from "@/components/apartment-filters"
import { ApartmentTable } from "@/components/apartment-table"

export default function WohnungenPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wohnungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Wohnungen und Apartments</p>
        </div>
        <Button className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Wohnung hinzufügen
        </Button>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Wohnungsverwaltung</CardTitle>
          <CardDescription>Hier können Sie Ihre Wohnungen verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ApartmentFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <ApartmentTable filter={filter} searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  )
}
