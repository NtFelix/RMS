"use client"

import { DataTable } from "@/components/ui/data-table"
import { Apartment } from "@/components/apartment-table"
import { apartmentsColumns } from "@/components/columns/apartments-columns"

interface ApartmentsDataTableProps {
  data: Apartment[]
}

export function ApartmentsDataTable({ data }: ApartmentsDataTableProps) {
  return (
    <DataTable columns={apartmentsColumns} data={data} />
  )
}
