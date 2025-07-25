"use client"

import { DataTable } from "@/components/ui/data-table"
import { Betriebskosten } from "@/types/supabase"
import { operatingCostsColumns } from "@/components/columns/operating-costs-columns"

interface OperatingCostsDataTableProps {
  data: Betriebskosten[]
}

export function OperatingCostsDataTable({ data }: OperatingCostsDataTableProps) {
  return (
    <DataTable columns={operatingCostsColumns} data={data} />
  )
}
