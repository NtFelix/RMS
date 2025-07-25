"use client"

import { DataTable } from "@/components/ui/data-table"
import { Nebenkosten } from "@/lib/data-fetching"
import { operatingCostsColumns } from "@/components/columns/operating-costs-columns"

interface OperatingCostsDataTableProps {
  data: Nebenkosten[]
}

export function OperatingCostsDataTable({ data }: OperatingCostsDataTableProps) {
  return (
    <DataTable columns={operatingCostsColumns} data={data} />
  )
}
