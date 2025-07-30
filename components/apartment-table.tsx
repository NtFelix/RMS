"use client";

import { useState, useEffect, useMemo, useCallback, MutableRefObject } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApartmentContextMenu } from "@/components/apartment-context-menu";
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";

// Data structure for an apartment
export interface Apartment {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string;
  Haeuser?: { name: string } | null;
  status: 'frei' | 'vermietet';
  tenant?: {
    id: string;
    name: string;
    einzug?: string;
    auszug?: string;
  } | null;
}

// Define which keys of an Apartment can be used for sorting
type SortKey = keyof Omit<Apartment, 'Haeuser' | 'tenant'> | 'hausName' | 'mieteProQm';
type SortDirection = "asc" | "desc";

// Props for the ApartmentTable component
interface ApartmentTableProps {
  filter: string;
  searchQuery: string;
  onEdit?: (apt: Apartment) => void;
  onTableRefresh?: () => Promise<void>;
  initialApartments?: Apartment[];
  reloadRef?: MutableRefObject<(() => void) | null>;
}

export function ApartmentTable({ filter, searchQuery, onEdit, onTableRefresh, initialApartments }: ApartmentTableProps) {
  const [apartments, setApartments] = useState<Apartment[]>(initialApartments ?? []);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Effect to update state when initialApartments prop changes
  useEffect(() => {
    setApartments(initialApartments ?? []);
  }, [initialApartments]);

  // Memoized sorting and filtering logic
  const sortedAndFilteredData = useMemo(() => {
    let result = [...apartments];

    // Filter by status
    if (filter === 'free') {
      result = result.filter(apt => apt.status === 'frei');
    } else if (filter === 'rented') {
      result = result.filter(apt => apt.status === 'vermietet');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (apt) =>
          apt.name.toLowerCase().includes(query) ||
          apt.groesse.toString().includes(query) ||
          apt.miete.toString().includes(query) ||
          (apt.Haeuser?.name && apt.Haeuser.name.toLowerCase().includes(query))
      );
    }

    // Sorting logic
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB;

        if (sortKey === 'hausName') {
          valA = a.Haeuser?.name ?? '';
          valB = b.Haeuser?.name ?? '';
        } else if (sortKey === 'mieteProQm') {
          valA = a.groesse > 0 ? a.miete / a.groesse : 0;
          valB = b.groesse > 0 ? b.miete / b.groesse : 0;
        } else {
          valA = a[sortKey as keyof Apartment];
          valB = b[sortKey as keyof Apartment];
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

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
      });
    }

    return result;
  }, [apartments, filter, searchQuery, sortKey, sortDirection]);

  // Handles changing the sort column and direction
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Renders the appropriate sort icon
  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // Reusable header cell component with sorting
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
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell sortKey="name" className="w-[250px]">Wohnung</TableHeaderCell>
            <TableHeaderCell sortKey="groesse">Größe (m²)</TableHeaderCell>
            <TableHeaderCell sortKey="miete">Miete (€)</TableHeaderCell>
            <TableHeaderCell sortKey="mieteProQm">Miete pro m²</TableHeaderCell>
            <TableHeaderCell sortKey="hausName">Haus</TableHeaderCell>
            <TableHeaderCell sortKey="status">Status</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Keine Wohnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            sortedAndFilteredData.map((apt) => (
              <ApartmentContextMenu
                key={apt.id}
                apartment={apt}
                onEdit={() => onEdit?.(apt)}
                onRefresh={async () => {
                  if (onTableRefresh) {
                    await onTableRefresh();
                  }
                }}
              >
                <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit?.(apt)}>
                  <TableCell className="font-medium">{apt.name}</TableCell>
                  <TableCell>{apt.groesse} m²</TableCell>
                  <TableCell>{apt.miete} €</TableCell>
                  <TableCell>{(apt.miete / apt.groesse).toFixed(2)} €/m²</TableCell>
                  <TableCell>{apt.Haeuser?.name || '-'}</TableCell>
                  <TableCell>
                    {apt.status === 'vermietet' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">vermietet</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">frei</Badge>
                    )}
                  </TableCell>
                </TableRow>
              </ApartmentContextMenu>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
