"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Edit, Trash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"

// Interface for finance transactions
interface Finanz {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { name: string }
}

interface FinanceTransactionsProps {
  finances: Finanz[]
  reloadRef?: any
  onEdit?: (finance: Finanz) => void
  loadFinances?: () => Promise<void>
}

export function FinanceTransactions({ finances, reloadRef, onEdit, loadFinances }: FinanceTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApartment, setSelectedApartment] = useState("Alle Wohnungen")
  const [selectedYear, setSelectedYear] = useState("Alle Jahre")
  const [selectedType, setSelectedType] = useState("Alle Transaktionen")
  const [filteredData, setFilteredData] = useState<Finanz[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [financeToDelete, setFinanceToDelete] = useState<Finanz | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get unique apartment list from finances data
  const apartments = ["Alle Wohnungen", ...new Set(finances
    .filter(f => f.Wohnungen?.name)
    .map(f => f.Wohnungen?.name || ""))]

  useEffect(() => {
    let result = finances

    // Filter by wohnung
    if (selectedApartment !== "Alle Wohnungen") {
      result = result.filter(f => f.Wohnungen?.name === selectedApartment)
    }

    // Filter by year
    if (selectedYear !== "Alle Jahre") {
      result = result.filter(f => {
        if (!f.datum) return false
        return f.datum.includes(selectedYear)
      })
    }

    // Filter by transaction type
    if (selectedType !== "Alle Transaktionen") {
      const isEinnahme = selectedType === "Einnahme"
      result = result.filter(f => f.ist_einnahmen === isEinnahme)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(f => 
        f.name.toLowerCase().includes(query) ||
        (f.Wohnungen?.name || "").toLowerCase().includes(query) ||
        (f.datum || "").includes(query) ||
        (f.notiz || "").toLowerCase().includes(query)
      )
    }

    setFilteredData(result)
  }, [finances, searchQuery, selectedApartment, selectedYear, selectedType])

  // Calculate totals for filtered data
  const totalBalance = filteredData.reduce((total, transaction) => {
    const amount = Number(transaction.betrag)
    return transaction.ist_einnahmen ? total + amount : total - amount
  }, 0)

  // Add CSV export function
  const handleExportCsv = () => {
    const header = ['Bezeichnung','Wohnung','Datum','Betrag','Typ','Notiz'];
    const rows = filteredData.map(f => [
      f.name,
      f.Wohnungen?.name||'',
      f.datum||'',
      f.betrag.toString(),
      f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
      f.notiz||''
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finanzen.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Delete finance
  const handleDeleteConfirm = async () => {
    if (!financeToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/finanzen?id=${financeToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Gelöscht', description: 'Transaktion wurde entfernt.' })
        loadFinances && loadFinances()
        reloadRef?.current && reloadRef.current()
      } else {
        const err = await res.json()
        toast({ title: 'Fehler', description: err.error || 'Löschen fehlgeschlagen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Netzwerkfehler', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setFinanceToDelete(null)
    }
  };

  return (
    <>
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
                <Button variant="outline" size="sm" onClick={handleExportCsv}>
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
                    <TableHead style={{ width: '25%' }}>Bezeichnung</TableHead>
                    <TableHead style={{ width: '20%' }}>Wohnung</TableHead>
                    <TableHead style={{ width: '15%' }}>Datum</TableHead>
                    <TableHead style={{ width: '15%' }} className="text-right">Betrag</TableHead>
                    <TableHead style={{ width: '15%' }}>Typ</TableHead>
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
                    filteredData.map((finance) => (
                      <ContextMenu key={finance.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit && onEdit(finance)}>
                            <TableCell>{finance.name}</TableCell>
                            <TableCell>{finance.Wohnungen?.name || '-'}</TableCell>
                            <TableCell>{finance.datum || '-'}</TableCell>
                            <TableCell className="text-right">
                              <span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>
                                {finance.betrag.toFixed(2).replace(".", ",")} €
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  finance.ist_einnahmen
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }
                              >
                                {finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onSelect={() => onEdit && onEdit(finance)}>Bearbeiten</ContextMenuItem>
                          <ContextMenuItem className="text-red-600" onSelect={() => { setFinanceToDelete(finance); setShowDeleteConfirm(true); }}>Löschen</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>Möchten Sie diese Transaktion wirklich löschen? Dies kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600" disabled={isDeleting}>{isDeleting ? 'Löschen...' : 'Löschen'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
