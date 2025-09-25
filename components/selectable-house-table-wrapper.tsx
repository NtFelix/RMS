'use client'

import React, { useState, useEffect, useCallback, useMemo, MutableRefObject } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { HouseContextMenu } from '@/components/house-context-menu'
import { toast } from '@/hooks/use-toast'
import { ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { SelectableTable, SelectableTableRow, SelectableTableHeader } from '@/components/selectable-table'
import { getBulkOperations } from '@/lib/bulk-operations-config'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { useBulkOperations } from '@/context/bulk-operations-context'

export interface House {
  id: string
  name: string
  strasse?: string
  ort: string
  size?: string
  rent?: string
  pricePerSqm?: string
  status?: string
  totalApartments?: number
  freeApartments?: number
}

// Define sortable fields explicitly, excluding internal calculation properties
type SortKey = keyof Omit<House, 'totalApartments' | 'freeApartments'> | 'status'
type SortDirection = "asc" | "desc"

interface SelectableHouseTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit: (house: House) => void
  initialHouses?: House[]
}

export function SelectableHouseTable({ 
  filter, 
  searchQuery, 
  reloadRef, 
  onEdit, 
  initialHouses 
}: SelectableHouseTableProps) {
  const { state } = useBulkOperations()
  const [houses, setHouses] = useState<House[]>(initialHouses ?? [])
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const fetchHouses = useCallback(async () => {
    try {
      const res = await fetch("/api/haeuser")
      if (res.ok) {
        const data = await res.json()
        setHouses(data)
        return data
      }
      return []
    } catch (error) {
      console.error('Error fetching houses:', error)
      return []
    }
  }, [])

  useEffect(() => {
    if (reloadRef) {
      reloadRef.current = fetchHouses
    }
    if (!initialHouses || initialHouses.length === 0) {
      fetchHouses()
    }
    return () => {
      if (reloadRef) {
        reloadRef.current = null
      }
    }
  }, [fetchHouses, initialHouses, reloadRef])

  useEffect(() => {
    if (initialHouses && initialHouses.length > 0) {
      setHouses(initialHouses)
    }
  }, [initialHouses])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...houses]

    if (filter === "full") {
      result = result.filter((house) => house.freeApartments === 0)
    } else if (filter === "vacant") {
      result = result.filter((house) => (house.freeApartments ?? 0) > 0)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (house) =>
          house.name.toLowerCase().includes(query) ||
          (house.ort && house.ort.toLowerCase().includes(query)) ||
          (house.size && house.size.toLowerCase().includes(query)) ||
          (house.rent && house.rent.toLowerCase().includes(query)) ||
          (house.pricePerSqm && house.pricePerSqm.toLowerCase().includes(query))
      )
    }

    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'status') {
          valA = (a.totalApartments ?? 0) - (a.freeApartments ?? 0)
          valB = (b.totalApartments ?? 0) - (b.freeApartments ?? 0)
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        // Convert to number if it's a numeric string for proper sorting
        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }

    return result
  }, [houses, filter, searchQuery, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: SortKey, children: React.ReactNode, className?: string }) => (
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

  const bulkOperations = getBulkOperations('haeuser')
  const allIds = sortedAndFilteredData.map(house => house.id)

  const getAffectedItemsPreview = (selectedIds: string[]) => {
    return selectedIds.map(id => {
      const house = sortedAndFilteredData.find(h => h.id === id)
      return house ? house.name : id
    })
  }

  return (
    <SelectableTable
      data={sortedAndFilteredData}
      tableType="haeuser"
      bulkOperations={bulkOperations}
    >
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <SelectableTableHeader allIds={allIds}>
              <TableHeaderCell sortKey="name" className="w-[250px]">Häuser</TableHeaderCell>
              <TableHeaderCell sortKey="ort">Ort</TableHeaderCell>
              <TableHeaderCell sortKey="size">Größe</TableHeaderCell>
              <TableHeaderCell sortKey="rent">Miete</TableHeaderCell>
              <TableHeaderCell sortKey="pricePerSqm">Miete pro m²</TableHeaderCell>
              <TableHeaderCell sortKey="status">Status</TableHeaderCell>
            </SelectableTableHeader>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Keine Häuser gefunden.
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredData.map((house) => (
                <HouseContextMenu
                  key={house.id}
                  house={house}
                  onEdit={() => onEdit(house)}
                  onRefresh={fetchHouses}
                >
                  <SelectableTableRow
                    id={house.id}
                    onClick={() => onEdit(house)}
                  >
                    <TableCell className="font-medium">{house.name}</TableCell>
                    <TableCell>{house.ort}</TableCell>
                    <TableCell>{house.size ? `${house.size} m²` : "-"}</TableCell>
                    <TableCell>{house.rent ? `${house.rent} €` : "-"}</TableCell>
                    <TableCell>{house.pricePerSqm ? `${house.pricePerSqm} €/m²` : "-"}</TableCell>
                    <TableCell>
                      {(house.totalApartments ?? 0) === 0 ? (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
                          Keine Wohnungen
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={
                            (house.freeApartments ?? 0) > 0
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-50"
                              : "bg-green-50 text-green-700 hover:bg-green-50"
                          }
                        >
                          {(house.totalApartments ?? 0) - (house.freeApartments ?? 0)}/{house.totalApartments ?? 0} belegt
                        </Badge>
                      )}
                    </TableCell>
                  </SelectableTableRow>
                </HouseContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <BulkActionBar
        operations={bulkOperations}
        getAffectedItemsPreview={getAffectedItemsPreview}
      />
    </SelectableTable>
  )
}