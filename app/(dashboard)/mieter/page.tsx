"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { TenantFilters } from "@/components/tenant-filters"
import { TenantTable } from "@/components/tenant-table"

export default function MieterPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mieter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mieter und Mietverhältnisse</p>
        </div>
        <Button className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Mieter hinzufügen
        </Button>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Mieterverwaltung</CardTitle>
          <CardDescription>Hier können Sie Ihre Mieter verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <TenantTable filter={filter} searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  )
}
