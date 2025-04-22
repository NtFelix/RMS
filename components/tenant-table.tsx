"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Beispieldaten für die Mieter
const tenantData = [
  {
    id: 1,
    name: "Person ABC",
    email: "dafr.jhz@hzu",
    phone: "4624797664",
    apartment: "Keine Wohnung",
    additionalCosts: "25 €",
    status: "current",
  },
  {
    id: 2,
    name: "Engelsmann & Schröder",
    email: "paula.engelsmann@gmail.com",
    phone: "-",
    apartment: "VH 3.0G rechts",
    additionalCosts: "35 €",
    status: "current",
  },
  {
    id: 3,
    name: "Luisa Burkhardt",
    email: "-",
    phone: "-",
    apartment: "VH DG 2.5.0",
    additionalCosts: "15 €",
    status: "current",
  },
  {
    id: 4,
    name: "Person ABCD",
    email: "abcd@gmail.com",
    phone: "-",
    apartment: "erfunden",
    additionalCosts: "25 €",
    status: "current",
  },
  {
    id: 5,
    name: "Person ausgezogen",
    email: "ausgezogen@web.de",
    phone: "-",
    apartment: "fantasie",
    additionalCosts: "10 €, 15 €, 20 €",
    status: "previous",
  },
  {
    id: 6,
    name: "Peter Müller",
    email: "peterl@mueller.de",
    phone: "-",
    apartment: "Keine Wohnung",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 7,
    name: "Peter Müller neu",
    email: "peterl@mueller.de",
    phone: "-",
    apartment: "VH - frei und erfunden",
    additionalCosts: "10 €, 15€",
    status: "current",
  },
  {
    id: 8,
    name: "Cox casanova",
    email: "victoriacoxcasanova@gmail.com",
    phone: "-",
    apartment: "LSF 2. OG",
    additionalCosts: "15 €",
    status: "current",
  },
  {
    id: 9,
    name: "obdachlos",
    email: "-",
    phone: "-",
    apartment: "Keine Wohnung",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 10,
    name: "Andere Person in Fantasie bis 2. Hälfte 24",
    email: "fantasie.2haelfte@web.de",
    phone: "-",
    apartment: "fantasie",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 11,
    name: "Mieter-Fantasie-3/4",
    email: "123232895794",
    phone: "-",
    apartment: "fantasie",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 12,
    name: "FANTASIE",
    email: "Spaß",
    phone: "-",
    apartment: "fantasie",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 13,
    name: "Anteilige Nebenkosten Test Mensch",
    email: "248279",
    phone: "-",
    apartment: "Teil-Nebenkosten-Test",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 14,
    name: "Fantasie-Wohnung-Mieter",
    email: "-",
    phone: "-",
    apartment: "fantasie",
    additionalCosts: "-",
    status: "current",
  },
  {
    id: 15,
    name: "halbes Jahr ab 01.07",
    email: "-",
    phone: "-",
    apartment: "RSF 5.0 löschen",
    additionalCosts: "-",
    status: "current",
  },
]

interface TenantTableProps {
  filter: string
  searchQuery: string
}

export function TenantTable({ filter, searchQuery }: TenantTableProps) {
  const [filteredData, setFilteredData] = useState(tenantData)

  useEffect(() => {
    let result = tenantData

    // Filter by status
    if (filter === "current") {
      result = result.filter((tenant) => tenant.status === "current")
    } else if (filter === "previous") {
      result = result.filter((tenant) => tenant.status === "previous")
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(query) ||
          tenant.email.toLowerCase().includes(query) ||
          tenant.phone.toLowerCase().includes(query) ||
          tenant.apartment.toLowerCase().includes(query) ||
          tenant.additionalCosts.toLowerCase().includes(query),
      )
    }

    setFilteredData(result)
  }, [filter, searchQuery])

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Wohnung</TableHead>
            <TableHead>Nebenkosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Keine Mieter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>{tenant.email}</TableCell>
                <TableCell>{tenant.phone}</TableCell>
                <TableCell>
                  {tenant.apartment === "Keine Wohnung" ? (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
                      {tenant.apartment}
                    </Badge>
                  ) : (
                    tenant.apartment
                  )}
                </TableCell>
                <TableCell>{tenant.additionalCosts}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
