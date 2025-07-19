"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Check, X, ArrowUpDown } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DashboardTenantContextMenu } from "@/components/dashboard-tenant-context-menu"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

type TenantDataItem = {
  id: string
  apartment: string
  tenant: string
  size: string
  rent: string
  pricePerSqm: string
  status: 'Miete bezahlt' | 'Miete unbezahlt'
  tenantId: string
  apartmentId: string
  mieteRaw: number
}

export function TenantDataTable() {
  const [tenantData, setTenantData] = useState<TenantDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data: mieterData, error: mieterError } = await supabase.from("Mieter").select(`id, name, einzug, auszug, Wohnungen:wohnung_id (id, name, groesse, miete)`).or(`auszug.is.null,auszug.gt.${new Date().toISOString()}`)
    if (mieterError) { console.error("Fehler beim Abrufen der Mieter:", mieterError); setLoading(false); return }
    
    const currentDate = new Date(), currentMonth = currentDate.getMonth() + 1, currentYear = currentDate.getFullYear()
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
    
    const { data: finanzData, error: finanzError } = await supabase.from("Finanzen").select('*').eq('ist_einnahmen', true).gte('datum', startOfMonth).lte('datum', endOfMonth).ilike('name', '%Mietzahlung%')
    if (finanzError) console.error("Fehler beim Abrufen der Finanzen:", finanzError)
    
    const mietStatus: Record<string, boolean> = {}
    finanzData?.forEach(finanz => { if (finanz.wohnung_id) mietStatus[finanz.wohnung_id] = true })
    
    const formattedData: TenantDataItem[] = mieterData.filter(m => m.Wohnungen).map(m => {
        const w = m.Wohnungen as any, g = Number(w.groesse) || 0, r = Number(w.miete) || 0
        return {
          id: m.id, tenantId: m.id, apartmentId: w.id, apartment: w.name || "N/A", tenant: m.name,
          size: g > 0 ? `${g.toFixed(2)} m²` : "-", rent: r > 0 ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(r) : "-",
          pricePerSqm: g > 0 ? `${(r / g).toFixed(2)} €/m²` : "-", status: mietStatus[w.id] ? 'Miete bezahlt' : 'Miete unbezahlt', mieteRaw: r
        }
      })
    
    setTenantData(formattedData)
    setLoading(false)
  }
  
  useEffect(() => { fetchData() }, [])
  
  const toggleRentPayment = async (tenant: TenantDataItem) => {
    setUpdatingStatus(tenant.id)
    const supabase = createClient()
    try {
      if (tenant.status === 'Miete bezahlt') {
        const { error } = await supabase.from('Finanzen').delete().match({ wohnung_id: tenant.apartmentId, ist_einnahmen: true }).ilike('name', '%Mietzahlung%')
        if (error) throw error
        toast({ title: "Mietstatus aktualisiert", description: `Mietzahlung für ${tenant.apartment} als unbezahlt markiert.` })
      } else {
        const { error } = await supabase.from('Finanzen').insert({
            wohnung_id: tenant.apartmentId, name: `Mietzahlung ${tenant.apartment}`, datum: new Date().toISOString().split('T')[0],
            betrag: tenant.mieteRaw, ist_einnahmen: true, notiz: `Mietzahlung von ${tenant.tenant}`
          })
        if (error) throw error
        toast({ title: "Mietstatus aktualisiert", description: `Mietzahlung für ${tenant.apartment} als bezahlt markiert.` })
      }
      await fetchData()
    } catch (error) {
      toast({ title: "Fehler", description: "Der Mietstatus konnte nicht aktualisiert werden.", variant: "destructive" })
    } finally {
      setUpdatingStatus(null)
    }
  }
  
  const columns: ColumnDef<TenantDataItem>[] = useMemo(() => [
    {
      accessorKey: "apartment",
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Wohnung <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => (
        <DashboardTenantContextMenu tenantData={row.original} openTenantModal={() => {}} openApartmentModal={() => {}}>
          <div className="hover:bg-gray-50 cursor-pointer">{row.original.apartment}</div>
        </DashboardTenantContextMenu>
      )
    },
    { accessorKey: "tenant", header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Mieter <ArrowUpDown className="ml-2 h-4 w-4" /></Button> },
    { accessorKey: "size", header: "Größe", sortingFn: "alphanumeric" },
    { accessorKey: "rent", header: "Miete", sortingFn: "alphanumeric" },
    { accessorKey: "pricePerSqm", header: "Preis pro m²", sortingFn: "alphanumeric" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Button variant="outline" size="sm"
          className={row.original.status === 'Miete bezahlt' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}
          onClick={(e) => { e.stopPropagation(); toggleRentPayment(row.original) }}
          disabled={updatingStatus === row.original.id}
        >
          {updatingStatus === row.original.id ? "Aktualisiere..." : (
            <>
              {row.original.status === 'Miete bezahlt' ? <Check className="mr-1 h-4 w-4" /> : <X className="mr-1 h-4 w-4" />}
              {row.original.status}
            </>
          )}
        </Button>
      )
    },
  ], [updatingStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mieterübersicht</CardTitle>
        <CardDescription>Aktuelle Mietverhältnisse und Wohnungsdaten</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable columns={columns} data={tenantData} />
        )}
      </CardContent>
    </Card>
  )
}
