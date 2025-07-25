"use client"

import { DataTable } from "@/components/ui/data-table"
import { Finanzen } from "@/lib/data-fetching"
import { financesColumns } from "@/components/columns/finances-columns"

interface FinancesDataTableProps {
  data: Finanzen[]
}

export function FinancesDataTable({ data }: FinancesDataTableProps) {
  return (
    <DataTable columns={financesColumns} data={data} />
  )
}
