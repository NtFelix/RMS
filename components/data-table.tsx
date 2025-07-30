"use client"

import { useState, useEffect, useCallback, useMemo, MutableRefObject } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"

// Generic type for data items
type DataItem = { id: string; [key: string]: any }

// Define sortable fields explicitly, excluding internal calculation properties
type SortKey<T> = keyof T
type SortDirection = "asc" | "desc"

interface DataTableProps<T extends DataItem> {
  data: T[]
  columns: {
    key: SortKey<T>
    header: string
    className?: string
  }[]
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  renderRow: (item: T) => React.ReactNode
}

export function DataTable<T extends DataItem>({
  data,
  columns,
  filter,
  searchQuery,
  reloadRef,
  onEdit,
  onDelete,
  renderRow,
}: DataTableProps<T>) {
  const [items, setItems] = useState<T[]>(data)
  const [sortKey, setSortKey] = useState<SortKey<T> | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  useEffect(() => {
    setItems(data)
  }, [data])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...items]

    // Implement filtering and searching logic here based on your specific needs
    // This is a generic implementation, you might need to adjust it

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      )
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey]
        const valB = b[sortKey]

        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA
        }

        const strA = String(valA)
        const strB = String(valB)
        return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA)
      })
    }

    return result
  }, [items, filter, searchQuery, sortKey, sortDirection])

  const handleSort = (key: SortKey<T>) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: SortKey<T>) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: SortKey<T>, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2"
      >
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHeaderCell key={String(col.key)} sortKey={col.key} className={col.className}>
                {col.header}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Keine Einträge gefunden.
              </TableCell>
            </TableRow>
          ) : (
            sortedAndFilteredData.map((item) => renderRow(item))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
