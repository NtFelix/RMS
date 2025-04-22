"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Beispieldaten für die Mieter
const tenantData = [
  {
    id: 1,
    apartment: "LSF 2.0G",
    tenant: "Cox casanova",
    size: "41.50 m²",
    rent: "485.00 €",
    pricePerSqm: "11.69 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 2,
    apartment: "VH 3.0G rechts",
    tenant: "Engelsmann & Schröder",
    size: "125.00 m²",
    rent: "1175.00 €",
    pricePerSqm: "9.40 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 3,
    apartment: "VH - frei und erfunden",
    tenant: "Peter Müller neu",
    size: "120.00 m²",
    rent: "1450.00 €",
    pricePerSqm: "12.08 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 4,
    apartment: "VH DG 2.5.0",
    tenant: "Luisa Burkhardt",
    size: "55.00 m²",
    rent: "500.00 €",
    pricePerSqm: "9.09 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 5,
    apartment: "erfunden",
    tenant: "Person ABCD",
    size: "65.00 m²",
    rent: "775.00 €",
    pricePerSqm: "11.92 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 6,
    apartment: "fantasie-groß",
    tenant: "Nicht vermietet",
    size: "150.00 m²",
    rent: "1750.00 €",
    pricePerSqm: "11.67 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 7,
    apartment: "fantasie",
    tenant: "Nicht vermietet",
    size: "45.00 m²",
    rent: "480.00 €",
    pricePerSqm: "10.67 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 8,
    apartment: "Teil-Nebenkosten-Test",
    tenant: "Anteilige Nebenkosten Test Mensch",
    size: "100.00 m²",
    rent: "1250.00 €",
    pricePerSqm: "12.50 €/m²",
    status: "Miete bezahlt",
  },
  {
    id: 9,
    apartment: "RSF 5.0 löschen",
    tenant: "halbes Jahr ab 01.07",
    size: "100.00 m²",
    rent: "4000.00 €",
    pricePerSqm: "40.00 €/m²",
    status: "Miete bezahlt",
  },
]

export function TenantDataTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mieterübersicht</CardTitle>
        <CardDescription>Aktuelle Mietverhältnisse und Wohnungsdaten</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wohnung</TableHead>
              <TableHead>Mieter</TableHead>
              <TableHead>Größe</TableHead>
              <TableHead>Miete</TableHead>
              <TableHead>Preis pro m²</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantData.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.apartment}</TableCell>
                <TableCell>{tenant.tenant}</TableCell>
                <TableCell>{tenant.size}</TableCell>
                <TableCell>{tenant.rent}</TableCell>
                <TableCell>{tenant.pricePerSqm}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                    {tenant.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
