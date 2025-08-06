"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, User, Eye } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"

interface ApartmentTenantRowContextMenuProps {
  children: React.ReactNode
  apartmentId: string
  tenantId?: string
  apartmentData?: {
    id: string
    name: string
    groesse: number
    miete: number
  }
  tenantData?: {
    id: string
    name: string
    email?: string
    telefon?: string
    einzug?: string
  }
  onEditApartment: () => void
  onEditTenant: () => void
  onViewDetails: () => void
}

export function ApartmentTenantRowContextMenu({
  children,
  apartmentId,
  tenantId,
  apartmentData,
  tenantData,
  onEditApartment,
  onEditTenant,
  onViewDetails,
}: ApartmentTenantRowContextMenuProps) {
  const { openApartmentTenantDetailsModal } = useModalStore()

  const handleViewDetails = () => {
    onViewDetails()
  }

  const handleEditApartment = () => {
    onEditApartment()
  }

  const handleEditTenant = () => {
    if (tenantId) {
      onEditTenant()
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem 
          onClick={handleEditApartment} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit className="h-4 w-4" />
          <span>Wohnung bearbeiten</span>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={handleEditTenant}
          disabled={!tenantId}
          className="flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <User className="h-4 w-4" />
          <span>Mieter bearbeiten</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleViewDetails} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          <span>Details anzeigen</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}