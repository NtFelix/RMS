"use client"

import { DataTable } from "@/components/ui/data-table"
import { House } from "@/types/supabase"
import { housesColumns } from "@/components/columns/houses-columns"

interface HousesDataTableProps {
  data: House[]
}

export function HousesDataTable({ data }: HousesDataTableProps) {
  return (
    <DataTable columns={housesColumns} data={data} />
  )
}
