"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { OperatingCostsFilters } from "@/components/operating-costs-filters"
import { OperatingCostsTable } from "@/components/operating-costs-table"

export default function BetriebskostenPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Betriebskosten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Betriebskosten und Abrechnungen</p>
        </div>
        <Button className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Betriebskostenabrechnung erstellen
        </Button>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Betriebskostenübersicht</CardTitle>
          <CardDescription>Hier können Sie Ihre Betriebskosten verwalten und abrechnen</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OperatingCostsFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <OperatingCostsTable filter={filter} searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  )
}
