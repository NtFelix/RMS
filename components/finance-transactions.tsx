"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Beispieldaten für Finanztransaktionen
const transactionData = [
  { id: 1, apartment: "RSF 5.0 löschen", name: "Miete", date: "15.04.2025", amount: "40000.00 €", type: "Einnahme" },
  { id: 2, apartment: "LSF 2. OG", name: "Miete", date: "05.12.2024", amount: "510.00 €", type: "Einnahme" },
  { id: 3, apartment: "VH 3.0G rechts", name: "Miete", date: "05.09.2024", amount: "1175.00 €", type: "Einnahme" },
  { id: 4, apartment: "erfunden", name: "Miete", date: "01.09.2024", amount: "775.00 €", type: "Einnahme" },
  { id: 5, apartment: "fantasie-groß", name: "Miete", date: "01.09.2024", amount: "1750.00 €", type: "Einnahme" },
  { id: 6, apartment: "LSF 2. OG", name: "Miete", date: "01.09.2024", amount: "485.00 €", type: "Einnahme" },
  { id: 7, apartment: "fantasie", name: "Miete", date: "01.09.2024", amount: "480.00 €", type: "Einnahme" },
  {
    id: 8,
    apartment: "VH - frei und erfunden",
    name: "Miete",
    date: "01.09.2024",
    amount: "1450.00 €",
    type: "Einnahme",
  },
  { id: 9, apartment: "VH DG 2.5.0", name: "Miete", date: "01.09.2024", amount: "500.00 €", type: "Einnahme" },
  { id: 10, apartment: "VH DG 2.5.0", name: "miete", date: "31.08.2024", amount: "200.00 €", type: "Einnahme" },
  { id: 11, apartment: "fantasie", name: "Miete", date: "05.08.2024", amount: "475.00 €", type: "Einnahme" },
  {
    id: 12,
    apartment: "VH - frei und erfunden",
    name: "Miete",
    date: "05.08.2024",
    amount: "1450.00 €",
    type: "Einnahme",
  },
  { id: 13, apartment: "VH DG 2.5.0", name: "Miete", date: "05.08.2024", amount: "500.00 €", type: "Einnahme" },
  { id: 14, apartment: "fantasie-groß", name: "Miete", date: "05.08.2024", amount: "1750.00 €", type: "Einnahme" },
  { id: 15, apartment: "LSF 2. OG", name: "Miete", date: "05.08.2024", amount: "485.00 €", type: "Einnahme" },
  { id: 16, apartment: "erfunden", name: "Miete", date: "01.08.2024", amount: "450.00 €", type: "Einnahme" },
  { id: 17, apartment: "fantasie", name: "Handwerker", date: "01.08.2024", amount: "255.00 €", type: "Ausgabe" },
  { id: 18, apartment: "erfunden", name: "test", date: "31.07.2024", amount: "110.00 €", type: "Ausgabe" },
  { id: 19, apartment: "erfunden", name: "Handwerker", date: "28.07.2024", amount: "145.00 €", type: "Ausgabe" },
  { id: 20, apartment: "VH 3.0G rechts", name: "Handwerker", date: "06.07.2024", amount: "340.00 €", type: "Ausgabe" },
  { id: 21, apartment: "fantasie-groß", name: "Miete", date: "30.06.2024", amount: "250.00 €", type: "Einnahme" },
  { id: 22, apartment: "VH 3.0G rechts", name: "miete", date: "06.06.2024", amount: "305.00 €", type: "Einnahme" },
  { id: 23, apartment: "fantasie-groß", name: "mehr geld", date: "31.01.2023", amount: "340.00 €", type: "Einnahme" },
  { id: 24, apartment: "fantasie-groß", name: "Miete", date: "05.01.2022", amount: "120.00 €", type: "Einnahme" },
]

const apartments = [
  "Alle Wohnungen",
  "RSF 5.0 löschen",
  "LSF 2. OG",
  "VH 3.0G rechts",
  "erfunden",
  "fantasie-groß",
  "fantasie",
  "VH - frei und erfunden",
  "VH DG 2.5.0",
]

export function FinanceTransactions() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApartment, setSelectedApartment] = useState("Alle Wohnungen")
  const [selectedYear, setSelectedYear] = useState("Alle Jahre")
  const [selectedType, setSelectedType] = useState("Alle Transaktionen")
  const [filteredData, setFilteredData] = useState(transactionData)

  useEffect(() => {
    let result = transactionData

    // Filter by apartment
    if (selectedApartment !== "Alle Wohnungen") {
      result = result.filter((transaction) => transaction.apartment === selectedApartment)
    }

    // Filter by year
    if (selectedYear !== "Alle Jahre") {
      result = result.filter((transaction) => {
        const transactionYear = transaction.date.split(".")[2]
        return transactionYear === selectedYear
      })
    }

    // Filter by transaction type
    if (selectedType !== "Alle Transaktionen") {
      result = result.filter((transaction) => transaction.type === selectedType)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (transaction) =>
          transaction.apartment.toLowerCase().includes(query) ||
          transaction.name.toLowerCase().includes(query) ||
          transaction.date.includes(query) ||
          transaction.amount.toLowerCase().includes(query) ||
          transaction.type.toLowerCase().includes(query),
      )
    }

    setFilteredData(result)
  }, [searchQuery, selectedApartment, selectedYear, selectedType])

  // Gesamtwert der gefilterten Transaktionen berechnen
  const totalBalance = filteredData.reduce((total, transaction) => {
    const amount = Number.parseFloat(transaction.amount.replace("€", "").replace(",", ".").trim())
    return transaction.type === "Einnahme" ? total + amount : total - amount
  }, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finanzliste</CardTitle>
        <CardDescription>Übersicht aller Einnahmen und Ausgaben</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
              <Select value={selectedApartment} onValueChange={setSelectedApartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Wohnung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apartment) => (
                    <SelectItem key={apartment} value={apartment}>
                      {apartment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Jahr auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle Jahre">Alle Jahre</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Transaktionstyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle Transaktionen">Alle Transaktionen</SelectItem>
                  <SelectItem value="Einnahme">Einnahme</SelectItem>
                  <SelectItem value="Ausgabe">Ausgabe</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative col-span-1 sm:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Transaktion suchen..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Als CSV exportieren
              </Button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Saldo</div>
            <div className="text-xl font-bold">{totalBalance.toFixed(2).replace(".", ",")} €</div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wohnung</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Transaktionstyp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Keine Transaktionen gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.apartment}</TableCell>
                      <TableCell>{transaction.name}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell className="text-right">{transaction.amount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            transaction.type === "Einnahme"
                              ? "bg-green-50 text-green-700 hover:bg-green-50"
                              : "bg-red-50 text-red-700 hover:bg-red-50"
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
