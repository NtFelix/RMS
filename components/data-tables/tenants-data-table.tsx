"use client"

import { DataTable } from "@/components/ui/data-table"
import { Tenant } from "@/types/Tenant"
import { tenantsColumns } from "@/components/columns/tenants-columns"

interface TenantsDataTableProps {
  data: Tenant[]
}

export function TenantsDataTable({ data }: TenantsDataTableProps) {
  return (
    <DataTable columns={tenantsColumns} data={data} />
  )
}
