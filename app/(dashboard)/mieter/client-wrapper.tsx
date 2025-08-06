"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle, Users, BadgeCheck, Euro } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { TenantFilters } from "@/components/tenant-filters";
import { TenantTable } from "@/components/tenant-table";


import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

// Props for the main client view component
interface MieterClientViewProps {
  initialTenants: Tenant[];
  initialWohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

// Internal AddTenantButton (could be kept from previous step if preferred)
function AddTenantButton({ onAdd }: { onAdd: () => void }) {
  return (
    <ButtonWithTooltip onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Mieter hinzufügen
    </ButtonWithTooltip>
  );
}

// This is the new main client component, previously MieterPageClientComponent in page.tsx
export default function MieterClientView({
  initialTenants,
  initialWohnungen,
  serverAction,
}: MieterClientViewProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { openTenantModal } = useModalStore();

  // Summary calculation for StatCards
  const summary = useMemo(() => {
    const total = initialTenants.length;
    const today = new Date();
    const activeCount = initialTenants.filter(t => !t.auszug || new Date(t.auszug) > today).length;
    const formerCount = total - activeCount;

    // Average utility cost (use last nebenkosten entry of each tenant if available)
    const utilityValues = initialTenants
      .map(t => {
        if (!t.nebenkosten || t.nebenkosten.length === 0) return undefined;

        // Find latest entry by date (ISO string)
        const latestEntry = t.nebenkosten.reduce((latest, current) => {
          return new Date(current.date) > new Date(latest.date) ? current : latest;
        });

        return parseFloat(latestEntry.amount);
      })
      .filter((v): v is number => typeof v === "number" && !isNaN(v));
    const avgUtilities = utilityValues.length ? utilityValues.reduce((s, v) => s + v, 0) / utilityValues.length : 0;

    return { total, activeCount, formerCount, avgUtilities };
  }, [initialTenants]);

  // Remove local state for dialogOpen and editingId, as store will manage modal state
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddTenant = useCallback(() => {
    // Pass initialWohnungen. The serverAction is passed to TenantEditModal in layout.tsx
    openTenantModal(undefined, initialWohnungen);
  }, [openTenantModal, initialWohnungen]);

  const handleEditTenantInTable = useCallback((tenant: Tenant) => {
    // Find the full tenant data if only partial data is passed by the table event
    const tenantToEdit = initialTenants.find(t => t.id === tenant.id);
    if (tenantToEdit) {
      // Format data as expected by TenantEditModal's useEffect for parsing Nebenkosten
      const formattedInitialData = {
        id: tenantToEdit.id,
        wohnung_id: tenantToEdit.wohnung_id || "",
        name: tenantToEdit.name,
        einzug: tenantToEdit.einzug || "",
        auszug: tenantToEdit.auszug || "",
        email: tenantToEdit.email || "",
        telefonnummer: tenantToEdit.telefonnummer || "",
        notiz: tenantToEdit.notiz || "",
        nebenkosten: tenantToEdit.nebenkosten || [],
      };
      openTenantModal(formattedInitialData, initialWohnungen);
    } else {
      console.error("Tenant not found for editing:", tenant.id);
      // Optionally, show a toast message
    }
  }, [initialTenants, initialWohnungen, openTenantModal]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="Mieter gesamt"
          value={summary.total}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Aktiv / Ehemalig"
          value={`${summary.activeCount} / ${summary.formerCount}`}
          icon={<BadgeCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Ø Nebenkosten"
          value={summary.avgUtilities}
          unit="€"
          decimals
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
      <Card className="overflow-hidden rounded-xl border border-[#F1F3F3] shadow-md">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Mieterverwaltung</CardTitle>
            <AddTenantButton onAdd={handleAddTenant} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <TenantTable
            tenants={initialTenants} // Directly use initialTenants or manage a separate 'filteredTenants' state if needed
            wohnungen={initialWohnungen}
            filter={filter}
            searchQuery={searchQuery}
            onEdit={handleEditTenantInTable}
          />
        </CardContent>
      </Card>
    </div>
  );
}
