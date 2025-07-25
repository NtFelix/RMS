"use client"

import { DataTable } from "@/components/ui/data-table"
import { Finanzen } from "@/types/supabase"
import { financesColumns } from "@/components/columns/finances-columns"

interface FinancesDataTableProps {
  data: Finanzen[]
}

export function FinancesDataTable({ data }: FinancesDataTableProps) {
  return (
    <DataTable columns={financesColumns} data={data} />
  )
}
