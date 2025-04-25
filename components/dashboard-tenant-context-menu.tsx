"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, Home, User } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface TenantData {
  id: string
  apartment: string
  tenant: string
  size: string
  rent: string
  pricePerSqm: string
  status: string
  tenantId?: string
  apartmentId?: string
}

interface DashboardTenantContextMenuProps {
  children: React.ReactNode
  tenantData: TenantData
  openTenantModal: (tenantId: string) => void
  openApartmentModal: (apartmentId: string) => void
}

export function DashboardTenantContextMenu({
  children,
  tenantData,
  openTenantModal,
  openApartmentModal,
}: DashboardTenantContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {tenantData.apartmentId && (
          <ContextMenuItem 
            onClick={() => openApartmentModal(tenantData.apartmentId!)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Wohnung bearbeiten</span>
          </ContextMenuItem>
        )}
        {tenantData.tenantId && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => openTenantModal(tenantData.tenantId!)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <User className="h-4 w-4" />
              <span>Mieter bearbeiten</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
