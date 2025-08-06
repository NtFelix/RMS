"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, User, Eye, Home } from "lucide-react"

interface WohnungOverviewData {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  status: 'frei' | 'vermietet';
  currentTenant?: {
    id: string;
    name: string;
    einzug?: string;
  };
}

interface ApartmentTenantRowContextMenuProps {
  children: React.ReactNode;
  apartment: WohnungOverviewData;
  onEditApartment: () => void;
  onEditTenant: () => void;
  onViewDetails: () => void;
}

export function ApartmentTenantRowContextMenu({
  children,
  apartment,
  onEditApartment,
  onEditTenant,
  onViewDetails,
}: ApartmentTenantRowContextMenuProps) {
  const hasTenant = apartment.status === 'vermietet' && apartment.currentTenant

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem 
          onClick={onEditApartment} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Home className="h-4 w-4" />
          <span>Wohnung bearbeiten</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={onEditTenant} 
          disabled={!hasTenant}
          className="flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <User className="h-4 w-4" />
          <span>Mieter bearbeiten</span>
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={onViewDetails} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          <span>Details anzeigen</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}