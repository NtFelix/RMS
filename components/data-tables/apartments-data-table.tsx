"use client"

import { DataTable } from "@/components/ui/data-table"
import { Wohnung } from "@/types/Wohnung"
import { apartmentsColumns } from "@/components/columns/apartments-columns"

interface ApartmentsDataTableProps {
  data: Wohnung[]
}

export function ApartmentsDataTable({ data }: ApartmentsDataTableProps) {
  return (
    <DataTable columns={apartmentsColumns} data={data} />
  )
}
