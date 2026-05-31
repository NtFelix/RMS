"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { ResponsiveFilterButton } from "@/components/ui/responsive-filter-button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle, Users, BadgeCheck, Euro, Search, Building2, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { TenantTable } from "@/components/tables/tenant-table";
import { TenantBulkActionBar } from "@/components/tenants/tenant-bulk-action-bar";
import { SearchInput } from "@/components/ui/search-input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { deleteTenantAction, deleteAllApplicantsAction } from "@/app/mieter-actions";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApplicantImportModal } from "@/components/tenants/applicant-import-modal";
import { ApplicantScoreModal } from "@/components/tenants/applicant-score-modal";
import { MailPreviewModal } from "@/components/mail-preview-modal";
import { ChevronDown, UserPlus, Mail, LogIn, LogOut, Clock, ArrowUpRight, TrendingUp, Coins, Percent } from "lucide-react";
import { TenantsDonutChart } from "@/components/dashboard/dashboard-charts";
import { TenantFluctuationChart } from "@/components/dashboard/dashboard-charts-wrapper";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";


import { Trash2 } from "lucide-react";
import type { Tenant, TenantStatus } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

// Custom tooltip showing total monthly prepayments
const CustomNebenkostenTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xl backdrop-blur-xs text-xs space-y-3 min-w-[220px] animate-in fade-in duration-150 z-50">
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Nebenkosten-Trend</span>
          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{data.name}</span>
        </div>
        
        <div className="flex items-center justify-between font-bold text-zinc-950 dark:text-zinc-50">
          <span>Gesamt:</span>
          <span className="text-accent font-bold text-sm">
            {data.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>

        {data.distribution && data.distribution.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block mb-1">Aufteilung nach Mieter</span>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {data.distribution.map((dist: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-zinc-700 dark:text-zinc-300 gap-4">
                  <span className="truncate max-w-[120px] font-medium">{dist.tenantName}</span>
                  <span className="font-semibold shrink-0">{dist.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Props for the main client view component
interface MieterClientViewProps {
  initialTenants: Tenant[];
  initialWohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

// Internal AddTenantButton (could be kept from previous step if preferred)


// This is the new main client component, previously MieterPageClientComponent in page.tsx
import { useFeatureFlagEnabled } from "posthog-js/react";

export default function MieterClientView({
  initialTenants,
  initialWohnungen,
  serverAction,
}: MieterClientViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<"current" | "previous" | "all">("current");
  const [currentTab, setCurrentTab] = useState<"mieter" | "bewerber" | "overview">("mieter");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { openTenantModal, openKautionModal } = useModalStore();
  const [depositSearch, setDepositSearch] = useState<string>("");
  const [depositFilter, setDepositFilter] = useState<"all" | "Erhalten" | "Zurückgezahlt" | "Ausstehend">("all");
  const [applicantSearch, setApplicantSearch] = useState<string>("");
  const [applicantFilter, setApplicantFilter] = useState<"all" | "A-Fit" | "B-Fit" | "C-Fit">("all");
  const rawFlag = useFeatureFlagEnabled('applicants-tab');
  const showApplicantsTab = !!rawFlag;
  const [nebenkostenTimeframe, setNebenkostenTimeframe] = useState<"1" | "2" | "5">("1");

  // Fallback to "mieter" if applicants tab is disabled and user is on "bewerber"
  useEffect(() => {
    if (rawFlag === false && currentTab === "bewerber") {
      setCurrentTab("mieter");
    }
  }, [rawFlag, currentTab]);

  // Compute tenant stats for overview subpage
  const tenantStats = useMemo(() => {
    if (!initialTenants || initialTenants.length === 0) {
      return {
        total: 0,
        activeCount: 0,
        applicantCount: 0,
        pastCount: 0,
        totalDeposit: 0,
        depositReceived: 0,
        depositOutstanding: 0,
        depositStatusCount: {} as Record<string, number>,
      }
    }

    let activeCount = 0
    let applicantCount = 0
    let pastCount = 0

    let totalDeposit = 0
    let depositReceived = 0
    let depositOutstanding = 0
    const depositStatusCount: Record<string, number> = {}

    initialTenants.forEach(t => {
      const status = t.status || 'mieter'
      if (status === 'mieter') {
        activeCount++
      } else if (status === 'bewerber') {
        applicantCount++
      } else {
        pastCount++
      }

      if (t.kaution) {
        const amount = typeof t.kaution.amount === 'string'
          ? parseFloat(t.kaution.amount)
          : Number(t.kaution.amount || 0);

        if (!isNaN(amount) && amount > 0) {
          totalDeposit += amount
          const statusLabel = (t.kaution.status || 'Ausstehend') as string
          depositStatusCount[statusLabel] = (depositStatusCount[statusLabel] || 0) + amount

          if (statusLabel === 'Erhalten' || statusLabel === 'Bezahlt') {
            depositReceived += amount
          } else if (statusLabel === 'Ausstehend' || statusLabel === 'Offen') {
            depositOutstanding += amount
          }
        }
      }
    })

    const total = initialTenants.length

    return {
      total,
      activeCount,
      applicantCount,
      pastCount,
      totalDeposit,
      depositReceived,
      depositOutstanding,
      depositStatusCount,
    }
  }, [initialTenants])

  // Compute occupancy rate
  const occupancyRate = useMemo(() => {
    if (!initialWohnungen || initialWohnungen.length === 0) return 0;
    const today = new Date();
    const activeTenantWohnungIds = new Set(
      initialTenants
        .filter(t => (t.status || 'mieter') === 'mieter' && (!t.auszug || new Date(t.auszug) > today))
        .map(t => t.wohnung_id)
        .filter(Boolean)
    );
    return Math.round((activeTenantWohnungIds.size / initialWohnungen.length) * 100);
  }, [initialWohnungen, initialTenants]);

  // Wohnungen map for bulk actions
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    initialWohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [initialWohnungen]);

  // Compute average tenancy duration (Ø Wohndauer)
  const tenancyStats = useMemo(() => {
    let totalMonths = 0;
    let count = 0;
    const today = new Date();

    initialTenants.forEach(t => {
      if ((t.status || 'mieter') !== 'mieter') return;
      if (!t.einzug) return;

      const startDate = new Date(t.einzug);
      if (isNaN(startDate.getTime())) return;

      const endDate = t.auszug ? new Date(t.auszug) : today;
      if (isNaN(endDate.getTime())) return;

      // Calculate difference in months
      const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      if (diffMonths >= 0) {
        totalMonths += diffMonths;
        count++;
      }
    });

    const avgMonths = count > 0 ? totalMonths / count : 0;
    const avgYears = avgMonths / 12;

    return {
      avgYears: parseFloat(avgYears.toFixed(1)),
      avgMonths: Math.round(avgMonths),
      count,
    };
  }, [initialTenants]);

  // Compute upcoming transitions (move-in and move-out schedules)
  const upcomingTransitions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: Array<{
      tenantName: string;
      type: 'einzug' | 'auszug';
      date: Date;
      dateString: string;
      daysRemaining: number;
      wohnungName?: string;
      tenant: Tenant;
    }> = [];

    initialTenants.forEach(t => {
      if ((t.status || 'mieter') !== 'mieter') return;
      
      const wohnungName = t.wohnung_id ? wohnungsMap[t.wohnung_id] : undefined;

      if (t.einzug) {
        const d = new Date(t.einzug);
        if (!isNaN(d.getTime()) && d >= today) {
          const diffTime = d.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          list.push({
            tenantName: t.name,
            type: 'einzug',
            date: d,
            dateString: t.einzug,
            daysRemaining: diffDays,
            wohnungName,
            tenant: t,
          });
        }
      }

      if (t.auszug) {
        const d = new Date(t.auszug);
        if (!isNaN(d.getTime()) && d >= today) {
          const diffTime = d.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          list.push({
            tenantName: t.name,
            type: 'auszug',
            date: d,
            dateString: t.auszug,
            daysRemaining: diffDays,
            wohnungName,
            tenant: t,
          });
        }
      }
    });

    // Sort chronologically
    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [initialTenants, wohnungsMap]);

  // Compute AI Applicant Score distribution
  const applicantScoreDistribution = useMemo(() => {
    let high = 0; // >= 80
    let good = 0; // 60 - 79
    let low = 0;  // < 60
    let totalWithScore = 0;

    initialTenants.forEach(t => {
      if (t.status === 'bewerber') {
        const score = t.bewerbung_score ?? 0;
        if (score >= 80) high++;
        else if (score >= 60) good++;
        else low++;
        totalWithScore++;
      }
    });

    return { high, good, low, totalWithScore };
  }, [initialTenants]);

  // Compute tenant fluctuation data (monthly einzüge vs auszüge) - last 12 months
  const tenantFluctuationData = useMemo(() => {
    const today = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(today.getMonth() - 12);

    const monthNamesGerman = [
      "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", 
      "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
    ];

    // Generate exactly 12 months, starting from twelveMonthsAgo
    const monthlyData: Array<{ month: string; einzüge: number; auszüge: number }> = [];
    let currentDate = new Date(twelveMonthsAgo);

    for (let i = 0; i < 12; i++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthName = `${monthNamesGerman[month]} ${year}`;

      monthlyData.push({
        month: monthName,
        einzüge: 0,
        auszüge: 0
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Count einzüge and auszüge by month
    initialTenants.forEach(tenant => {
      // Count move-ins (einzug)
      if (tenant.einzug) {
        const einzugDate = new Date(tenant.einzug);
        if (einzugDate >= twelveMonthsAgo && einzugDate <= today) {
          const einzugMonth = einzugDate.getMonth();
          const einzugYear = einzugDate.getFullYear();
          const monthIndex = (einzugYear - twelveMonthsAgo.getFullYear()) * 12 + einzugMonth - twelveMonthsAgo.getMonth();
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex].einzüge++;
          }
        }
      }

      // Count move-outs (auszug)
      if (tenant.auszug) {
        const auszugDate = new Date(tenant.auszug);
        if (auszugDate >= twelveMonthsAgo && auszugDate <= today) {
          const auszugMonth = auszugDate.getMonth();
          const auszugYear = auszugDate.getFullYear();
          const monthIndex = (auszugYear - twelveMonthsAgo.getFullYear()) * 12 + auszugMonth - twelveMonthsAgo.getMonth();
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex].auszüge++;
          }
        }
      }
    });

    return monthlyData;
  }, [initialTenants]);

  // Compute utilities trend prepayments (Nebenkosten-Prepayments aggregated by month over time)
  const nebenkostenTrend = useMemo(() => {
    const today = new Date();
    const cutoffDate = new Date();
    const yearsLimit = parseInt(nebenkostenTimeframe, 10);
    cutoffDate.setFullYear(today.getFullYear() - yearsLimit);
    
    // Start from cutoff month to today's month to generate a continuous timeline
    const startYear = cutoffDate.getFullYear();
    const startMonth = cutoffDate.getMonth() + 1;
    const endYear = today.getFullYear();
    const endMonth = today.getMonth() + 1;

    const allMonthKeys: string[] = [];
    let currentY = startYear;
    let currentM = startMonth;

    while (currentY < endYear || (currentY === endYear && currentM <= endMonth)) {
      allMonthKeys.push(`${currentY}-${String(currentM).padStart(2, '0')}`);
      currentM++;
      if (currentM > 12) {
        currentM = 1;
        currentY++;
      }
    }

    const monthNamesGerman = [
      "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", 
      "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
    ];

    // Compute active prepayment rate for each tenant per month
    const list = allMonthKeys.map(monthKey => {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const monthIdx = parseInt(monthStr, 10) - 1;
      const formattedName = `${monthNamesGerman[monthIdx]} ${year}`;

      let monthlyTotal = 0;
      const distribution: Array<{ tenantName: string; amount: number }> = [];

      initialTenants.forEach(t => {
        if (t.status === 'bewerber') return;

        // Parse move-in date
        let einzugKey = "";
        if (t.einzug) {
          const parts = t.einzug.split('-');
          if (parts.length >= 2) {
            einzugKey = `${parts[0]}-${parts[1].padStart(2, '0')}`;
          }
        }

        // Parse move-out date
        let auszugKey = "";
        if (t.auszug) {
          const parts = t.auszug.split('-');
          if (parts.length >= 2) {
            auszugKey = `${parts[0]}-${parts[1].padStart(2, '0')}`;
          }
        }

        // A tenant is considered active in the month if they moved in on or before the month,
        // and either haven't moved out or moved out on or after the month.
        const isActiveInMonth = einzugKey && monthKey >= einzugKey && (!auszugKey || monthKey <= auszugKey);
        if (!isActiveInMonth) return;

        // Parse and sort their nebenkosten rates chronologically
        const sortedEntries = [...(t.nebenkosten || [])]
          .map(entry => {
            const parts = (entry.date || "").split('-');
            const entryKey = parts.length >= 2 ? `${parts[0]}-${parts[1].padStart(2, '0')}` : "";
            return {
              ...entry,
              entryKey,
              amountVal: parseFloat(entry.amount) || 0,
            };
          })
          .filter(e => e.entryKey && e.amountVal > 0)
          .sort((a, b) => a.entryKey.localeCompare(b.entryKey));

        if (sortedEntries.length === 0) return;

        // Find the active rate configuration for this specific month
        let activeRate = 0;
        for (let i = sortedEntries.length - 1; i >= 0; i--) {
          if (sortedEntries[i].entryKey <= monthKey) {
            activeRate = sortedEntries[i].amountVal;
            break;
          }
        }

        // Fallback: if they are active in the month but no rate is configured <= monthKey,
        // use their earliest available rate so we don't display a zero value
        if (activeRate === 0 && sortedEntries.length > 0) {
          activeRate = sortedEntries[0].amountVal;
        }

        if (activeRate > 0) {
          monthlyTotal += activeRate;
          distribution.push({
            tenantName: t.name,
            amount: parseFloat(activeRate.toFixed(2)),
          });
        }
      });

      return {
        key: monthKey,
        name: formattedName,
        amount: parseFloat(monthlyTotal.toFixed(2)),
        distribution: distribution.sort((a, b) => b.amount - a.amount),
      };
    });

    // Filter out any months at the start that have absolutely zero prepayments across the entire portfolio
    // to avoid displaying empty months at the beginning of historical timelines.
    let firstNonZeroIdx = list.findIndex(item => item.amount > 0);
    if (firstNonZeroIdx === -1) return [];
    
    return list.slice(firstNonZeroIdx);
  }, [initialTenants, nebenkostenTimeframe]);

  // Compute deposit refund stats
  const depositRefundStats = useMemo(() => {
    let returnedCount = 0;
    let returnedAmount = 0;
    
    initialTenants.forEach(t => {
      if (t.kaution && t.kaution.status === 'Zurückgezahlt') {
        const amt = typeof t.kaution.amount === 'string'
          ? parseFloat(t.kaution.amount)
          : Number(t.kaution.amount || 0);
        if (!isNaN(amt) && amt > 0) {
          returnedCount++;
          returnedAmount += amt;
        }
      }
    });
    
    return { returnedCount, returnedAmount };
  }, [initialTenants]);

  // Filter tenants based on tab
  const filteredTenantsByTab = useMemo(() => {
    return initialTenants.filter(t => {
      // Default to "mieter" if status is missing (migration fallback)
      const status = t.status || 'mieter';
      // If current tab is overview, we don't strictly filter list records since overview shows stats,
      // but let's fall back to mieter to prevent errors in list bindings
      const activeFilterTab = currentTab === 'overview' ? 'mieter' : currentTab;
      return status === activeFilterTab;
    });
  }, [initialTenants, currentTab]);

  // Calculate stats based on the CURRENT TAB
  const summary = useMemo(() => {
    const tenantsInTab = filteredTenantsByTab;
    const total = tenantsInTab.length;
    const today = new Date();

    // For "mieter" tab, we distinguish active vs former
    // For "bewerber" tab, activeCount/formerCount doesn't make as much sense with current definitions,
    // so we might just show Total and maybe "With Email" or similar.
    // But to keep it simple, we reuse the logic:
    const activeCount = tenantsInTab.filter(t => !t.auszug || new Date(t.auszug) > today).length;
    const formerCount = total - activeCount;

    // Average utility cost (use last nebenkosten entry of each tenant if available)
    const utilityValues = tenantsInTab
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
  }, [filteredTenantsByTab]);

  // Remove local state for dialogOpen and editingId, as store will manage modal state
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddTenant = useCallback(() => {
    try {
      // Pass initialWohnungen. The serverAction is passed to TenantEditModal in layout.tsx
      // We want to pass the current tab as the default status for the new tenant
      // We do this by passing a partial object with just the status
      const defaultStatus = { status: currentTab };
      openTenantModal(defaultStatus, initialWohnungen);
    } catch (error) {
      console.error('Error opening tenant modal:', error);
    }
  }, [openTenantModal, initialWohnungen, currentTab]);

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
        status: tenantToEdit.status || "mieter",
      };
      try {
        openTenantModal(formattedInitialData, initialWohnungen);
      } catch (error) {
        console.error('Error opening tenant modal:', error);
      }
    } else {
      console.error("Tenant not found for editing:", tenant.id);
      // Optionally, show a toast message
    }
  }, [initialTenants, initialWohnungen, openTenantModal]);



  // Helper function to properly escape CSV values
  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedTenantsData = initialTenants.filter(t => selectedTenants.has(t.id))

    // Create CSV header
    const headers = ['Name', 'Email', 'Telefon', 'Wohnung', 'Einzug', 'Auszug', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedTenantsData.map(t => {
      const row = [
        t.name,
        t.email || '',
        t.telefonnummer || '',
        t.wohnung_id ? wohnungsMap[t.wohnung_id] || '' : '',
        t.einzug || '',
        t.auszug || '',
        t.status || 'mieter'
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mieter_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedTenants.size} Einträge exportiert.`,
      variant: "success",
    })
  }, [selectedTenants, initialTenants, wohnungsMap, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    if (selectedTenants.size === 0) {
      toast({
        title: "Keine Einträge ausgewählt",
        description: "Bitte wählen Sie mindestens einen Eintrag zum Löschen aus.",
        variant: "destructive",
      })
      return
    }

    setIsBulkDeleting(true)

    try {
      const response = await fetch('/api/mieter/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedTenants)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Löschen der Einträge')
      }

      setShowBulkDeleteConfirm(false)
      setSelectedTenants(new Set())

      toast({
        title: "Erfolg",
        description: `${result.successCount} Einträge erfolgreich gelöscht.`,
        variant: "success",
      })

      router.refresh()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Löschen der Einträge",
        variant: "destructive",
      })
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedTenants, router]);

  const handleDeleteAllApplicants = async () => {
    setIsDeletingAll(true);
    try {
      const result = await deleteAllApplicantsAction();
      if (!result.success) {
        throw new Error(result.error?.message || "Fehler beim Löschen aller Bewerber");
      }
      setShowDeleteAllConfirm(false);
      toast({
        title: "Erfolg",
        description: "Alle Bewerber wurden gelöscht.",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Löschen",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">

      <div className="flex flex-col gap-6">
        {/* 3-way sliding toggle */}
        <div className={cn(
          "flex items-center bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full select-none z-0 overflow-hidden",
          showApplicantsTab ? "sm:w-[380px]" : "sm:w-[260px]"
        )}>
          <motion.button
            layout
            onClick={() => {
              setCurrentTab("mieter");
              setFilter("current");
              setSelectedTenants(new Set());
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-full h-9 relative outline-none cursor-pointer text-xs sm:text-sm font-medium transition-colors duration-300",
              currentTab === "mieter" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {currentTab === "mieter" && (
              <motion.div
                layoutId="active-tenant-tab-pill"
                className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Users className="h-4 w-4 shrink-0 transition-transform duration-300" />
            <span>Mieter</span>
          </motion.button>

          {showApplicantsTab && (
            <motion.button
              layout
              onClick={() => {
                setCurrentTab("bewerber");
                setFilter("current");
                setSelectedTenants(new Set());
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-full h-9 relative outline-none cursor-pointer text-xs sm:text-sm font-medium transition-colors duration-300",
                currentTab === "bewerber" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {currentTab === "bewerber" && (
                <motion.div
                  layoutId="active-tenant-tab-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <UserPlus className="h-4 w-4 shrink-0 transition-transform duration-300" />
              <span>Bewerber</span>
            </motion.button>
          )}

          <motion.button
            layout
            onClick={() => {
              setCurrentTab("overview");
              setSelectedTenants(new Set());
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-full h-9 relative outline-none cursor-pointer text-xs sm:text-sm font-medium transition-colors duration-300",
              currentTab === "overview" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {currentTab === "overview" && (
              <motion.div
                layoutId="active-tenant-tab-pill"
                className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <BarChart3 className="h-4 w-4 shrink-0 transition-transform duration-300" />
            <span>Übersicht</span>
          </motion.button>
        </div>

        {currentTab !== "overview" ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 animate-in fade-in duration-300">
              <StatCard
                title={currentTab === 'mieter' ? "Mieter gesamt" : "Bewerber gesamt"}
                value={summary.total}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              {currentTab === 'mieter' && (
                <>
                  <StatCard
                    title="Aktiv / Ehemalig"
                    value={`${summary.activeCount} / ${summary.formerCount}`}
                    icon={<BadgeCheck className="h-4 w-4 text-muted-foreground" />}
                    className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
                  />
                  <StatCard
                    title="Ø Nebenkosten"
                    value={summary.avgUtilities}
                    unit="€"
                    decimals
                    icon={<Euro className="h-4 w-4 text-muted-foreground" />}
                    className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
                  />
                </>
              )}
            </div>

            <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] animate-in fade-in duration-300">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{currentTab === 'mieter' ? 'Mieterverwaltung' : 'Bewerberverwaltung'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                      {currentTab === 'mieter' ? 'Verwalten Sie hier alle Ihre Mieter' : 'Verwalten Sie hier potenzielle Mieter und Interessenten'}
                    </p>
                  </div>
                  <div className="mt-0 sm:mt-1">
                    {showApplicantsTab ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="w-full sm:w-auto gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Hinzufügen
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuItem onClick={handleAddTenant} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                            <div className="flex items-center font-medium">
                              <UserPlus className="mr-2 h-4 w-4" />
                              Manuell hinzufügen
                            </div>
                            <span className="text-xs text-muted-foreground ml-6">
                              Erstellen Sie einen neuen Mieter oder Bewerber per Hand.
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowImportModal(true)} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                            <div className="flex items-center font-medium">
                              <Mail className="mr-2 h-4 w-4" />
                              Aus E-Mails importieren
                            </div>
                            <span className="text-xs text-muted-foreground ml-6">
                              Die KI analysiert E-Mails und erstellt automatisch Bewerber-Profile.
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button onClick={handleAddTenant} className="w-full sm:w-auto gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Mieter hinzufügen
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <div className="px-6">
                <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
              </div>

              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 mt-4 sm:mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {currentTab === "mieter" ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {[
                          { value: "current" as const, shortLabel: "Aktuelle", fullLabel: "Aktuelle Mieter" },
                          { value: "previous" as const, shortLabel: "Vorherige", fullLabel: "Vorherige Mieter" },
                          { value: "all" as const, shortLabel: "Alle", fullLabel: "Alle Mieter" },
                        ].map(({ value, shortLabel, fullLabel }) => (
                          <ResponsiveFilterButton
                            key={value}
                            shortLabel={shortLabel}
                            fullLabel={fullLabel}
                            isActive={filter === value}
                            onClick={() => setFilter(value)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteAllConfirm(true)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Alle Bewerber löschen
                        </Button>
                      </div>
                    )}
                    <SearchInput
                      placeholder={currentTab === "mieter" ? "Mieter suchen..." : "Bewerber suchen..."}
                      className="rounded-full"
                      mode="table"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClear={() => setSearchQuery("")}
                    />
                  </div>
                  <TenantBulkActionBar
                    selectedTenants={selectedTenants}
                    tenants={filteredTenantsByTab}
                    wohnungsMap={wohnungsMap}
                    onClearSelection={() => setSelectedTenants(new Set())}
                    onExport={handleBulkExport}
                    onDelete={() => setShowBulkDeleteConfirm(true)}
                  />
                </div>
                <TenantTable
                  key={currentTab}
                  tenants={filteredTenantsByTab}
                  wohnungen={initialWohnungen}
                  filter={currentTab === "mieter" ? filter : "all"}
                  searchQuery={searchQuery}
                  onEdit={handleEditTenantInTable}
                  selectedTenants={selectedTenants}
                  onSelectionChange={setSelectedTenants}
                  mode={currentTab === "mieter" ? "tenants" : "applicants"}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
            {/* Stats cards for Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Mieter (aktiv)"
                value={tenantStats.activeCount}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              {showApplicantsTab ? (
                <StatCard
                  title="Bewerber"
                  value={tenantStats.applicantCount}
                  icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                  className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
                />
              ) : (
                <StatCard
                  title="Ø Nebenkosten"
                  value={summary.avgUtilities}
                  unit="€"
                  decimals
                  icon={<Coins className="h-4 w-4 text-muted-foreground" />}
                  className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
                />
              )}
              <StatCard
                title="Auslastung"
                value={occupancyRate}
                unit="%"
                icon={<BadgeCheck className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              <StatCard
                title="Ø Wohndauer"
                value={tenancyStats.avgYears}
                unit="Jahre"
                decimals
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
            </div>

            {/* Grid 1: Transitions Timeline Feed & Tenant Fluctuation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Timeline Card */}
              <Card className="lg:col-span-8 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col min-h-[400px]">
                <CardHeader className="px-0 pt-0 shrink-0">
                  <CardTitle className="text-base font-semibold">
                    Anstehende Mieterwechsel
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vertragsbeginne und Kündigungstermine im Überblick
                  </p>
                </CardHeader>
                <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0">
                  {upcomingTransitions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-zinc-100/50 dark:bg-zinc-800/10 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/40 animate-in fade-in duration-300 h-full">
                      <div className="p-3 bg-zinc-200/30 dark:bg-zinc-800/30 rounded-full mb-3">
                        <Clock className="h-6 w-6 text-muted-foreground/50 animate-pulse" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Keine anstehenden Mieterwechsel erfasst
                      </span>
                      <span className="text-xs text-muted-foreground/60 max-w-[280px] mt-1.5">
                        Neue Vertragsdaten oder Auszugspläne werden hier automatisch in einem premium Feed visualisiert.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-300 flex-1 justify-between">
                      {/* Highlights Grid */}
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-primary/5 border border-zinc-200/50 dark:border-zinc-800/30">
                        <div className="text-left border-r border-zinc-200/60 dark:border-zinc-800/80 pr-4">
                          <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">Wechsel Aktiv</span>
                          <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {upcomingTransitions.length} anstehend
                          </span>
                        </div>
                        <div className="text-left pl-4 flex flex-col justify-center">
                          <span className="text-[10px] sm:text-xs text-muted-foreground block mb-0.5 font-semibold uppercase tracking-wider">Nächster Termin</span>
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate max-w-[120px] sm:max-w-[200px]">
                            {upcomingTransitions[0].tenantName}
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {new Date(upcomingTransitions[0].dateString).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>

                      {/* List Feed */}
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Wechsel-Timeline</h4>
                        <div className="flex flex-col gap-2.5">
                          {upcomingTransitions.map((t, idx) => {
                            const isEinzug = t.type === 'einzug';
                            return (
                              <div 
                                key={idx} 
                                onClick={() => handleEditTenantInTable(t.tenant)}
                                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-xs transition-all duration-200 cursor-pointer select-none"
                              >
                                {/* Left section: Icon and basic info */}
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                                    {isEinzug ? (
                                      <LogIn className="h-4.5 w-4.5" />
                                    ) : (
                                      <LogOut className="h-4.5 w-4.5" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block group-hover:text-accent transition-colors duration-200">
                                      {t.tenantName}
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                      {isEinzug ? 'Einzug geplant' : 'Auszug geplant'}
                                    </span>
                                  </div>
                                </div>

                                {/* Right section: Structured details */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-end">
                                  {t.wohnungName && (
                                    <div className="flex items-center gap-1 text-muted-foreground min-w-[100px]">
                                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.wohnungName}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1.5 min-w-[120px]">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                                      {new Date(t.dateString).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                  </div>

                                  <div className="shrink-0 min-w-[90px] flex justify-end">
                                    <span className={cn(
                                      "text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border shadow-xs transition-colors duration-200",
                                      isEinzug 
                                        ? "bg-primary/5 text-primary border-primary/20 dark:border-primary/30" 
                                        : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                                    )}>
                                      In {t.daysRemaining} Tagen
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tenant Fluctuation Chart */}
              <div className="lg:col-span-4 h-full min-h-[400px] flex flex-col">
                <TenantFluctuationChart data={tenantFluctuationData} />
              </div>
            </div>

            {/* Grid 2: Deposits Details & Applicant Suitability Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Enhanced Deposits Details Card */}
              <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
                <div>
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base font-semibold">
                      Kaution Status & Rückzahlungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0 flex-1 flex flex-col justify-between gap-6 mt-2">
                    <div className="flex flex-col gap-4">
                      {/* Highlights Grid */}
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-primary/5 border border-zinc-200/50 dark:border-zinc-800/30">
                        <div className="text-left border-r border-zinc-200/60 dark:border-zinc-800/80 pr-4">
                          <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">Erhalten & Aktiv</span>
                          <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {tenantStats.depositReceived.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="text-left pl-4 flex flex-col justify-center">
                          <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">Ausstehend</span>
                          <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {tenantStats.depositOutstanding.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* List of deposits */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Kautionsbestand nach Mieter
                          </h4>
                        </div>
                        
                        {/* Compact Search & Filter Row */}
                        <div className="flex items-center gap-2">
                          <SearchInput
                            placeholder="Name o. Wohnung..."
                            value={depositSearch}
                            onChange={(e) => setDepositSearch(e.target.value)}
                            onClear={() => setDepositSearch("")}
                            sizeVariant="sm"
                            wrapperClassName="flex-1"
                          />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 text-xs px-3 rounded-xl bg-background border border-input focus:border-primary focus:bg-background/80 hover:border-border/80 hover:bg-muted/30 focus:ring-0 focus:outline-hidden transition-all duration-300 ease-in-out gap-1.5 font-medium cursor-pointer">
                                <TrendingUp className="h-3.5 w-3.5 opacity-60 text-muted-foreground" />
                                <span>
                                  {depositFilter === "all" ? "Alle" : depositFilter === "Erhalten" ? "Bezahlt" : depositFilter === "Zurückgezahlt" ? "Erstattet" : "Ausstehend"}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setDepositFilter("all")} className="text-xs cursor-pointer">Alle</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDepositFilter("Erhalten")} className="text-xs cursor-pointer">Bezahlt</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDepositFilter("Zurückgezahlt")} className="text-xs cursor-pointer">Erstattet</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDepositFilter("Ausstehend")} className="text-xs cursor-pointer">Ausstehend</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Scrollable list */}
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar mt-2">
                          {initialTenants
                            .filter((t) => t.status === "mieter" && t.kaution && t.kaution.amount !== undefined)
                            .map((t) => {
                              const amount = typeof t.kaution?.amount === 'string'
                                ? parseFloat(t.kaution.amount)
                                : Number(t.kaution?.amount || 0);
                              return { tenant: t, amount };
                            })
                            .filter(({ tenant: t, amount }) => {
                              if (isNaN(amount) || amount <= 0) return false;
                              
                              // Search filter
                              const wohnungName = t.wohnung_id ? wohnungsMap[t.wohnung_id] || "" : "";
                              const matchesSearch = t.name.toLowerCase().includes(depositSearch.toLowerCase()) || 
                                                    wohnungName.toLowerCase().includes(depositSearch.toLowerCase());
                              
                              // Status filter
                              const matchesStatus = depositFilter === "all" || (t.kaution?.status === depositFilter);
                              
                              return matchesSearch && matchesStatus;
                            })
                            .sort((a, b) => b.amount - a.amount)
                            .map(({ tenant: t, amount: kautionAmount }, idx) => {
                              const status = t.kaution?.status || 'Ausstehend';
                              const wohnungName = t.wohnung_id ? wohnungsMap[t.wohnung_id] : undefined;

                              // Badge styling based on status
                              const badgeCn = status === 'Erhalten'
                                ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-450 border-emerald-500/20 text-[10px] py-0.5 px-2 font-bold"
                                : status === 'Zurückgezahlt'
                                  ? "bg-blue-500/5 text-blue-700 dark:text-blue-450 border-blue-500/20 text-[10px] py-0.5 px-2 font-bold"
                                  : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0.5 px-2 font-bold";

                              const statusLabel = status === 'Erhalten'
                                ? 'Bezahlt'
                                : status === 'Zurückgezahlt'
                                  ? 'Erstattet'
                                  : 'Ausstehend';

                              return (
                                <div
                                  key={t.id || idx}
                                  onClick={() => openKautionModal(t, t.kaution)}
                                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-xs transition-all duration-200 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                                      <Coins className="h-4.5 w-4.5" />
                                    </div>
                                    <div>
                                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block group-hover:text-accent transition-colors duration-200">
                                        {t.name}
                                      </span>
                                      {wohnungName && (
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                          {wohnungName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-end">
                                    <div className="shrink-0 min-w-[90px] flex justify-end">
                                      <span className="font-bold text-zinc-800 dark:text-zinc-100">
                                        {kautionAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                      </span>
                                    </div>

                                    <div className="shrink-0 min-w-[90px] flex justify-end">
                                      <Badge variant="outline" className={badgeCn}>
                                        {statusLabel}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          {initialTenants.filter((t) => t.status === "mieter" && t.kaution && t.kaution.amount !== undefined).length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-center bg-zinc-100/50 dark:bg-zinc-800/10 rounded-2xl border border-zinc-200/20 dark:border-zinc-800/40">
                              <span className="text-xs text-muted-foreground">Keine Kautionsdaten erfasst</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress refund tracker */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Kautionsabwicklungsquote</span>
                        <span className="text-accent font-bold text-sm">
                          {tenantStats.totalDeposit > 0
                            ? Math.round((depositRefundStats.returnedAmount / tenantStats.totalDeposit) * 100)
                            : 0}% abgeschlossen
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]" 
                          style={{ 
                            width: `${tenantStats.totalDeposit > 0 
                              ? (depositRefundStats.returnedAmount / tenantStats.totalDeposit) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Verhältnis der zurückgezahlten Kautionen zum Gesamtkautionsvolumen.
                      </p>
                    </div>

                  </CardContent>
                </div>
              </Card>

              {/* Applicant Fit Distribution / Score Funnel Card */}
              <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
                <div>
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base font-semibold">
                      KI-Bewerber Match-Score
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qualifikationseinstufung eingegangener Profile
                    </p>
                  </CardHeader>
                  <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-between gap-6">
                    {!showApplicantsTab ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-100/50 dark:bg-zinc-800/10 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/40">
                        <div className="p-3 bg-zinc-200/30 dark:bg-zinc-800/30 rounded-full mb-3">
                          <UserPlus className="h-6 w-6 text-muted-foreground/50 animate-pulse" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">
                          Bewerber-Import inaktiv
                        </span>
                        <span className="text-xs text-muted-foreground/60 max-w-[280px] mt-1.5">
                          Aktivieren Sie das Bewerber-Feature in den Kontoeinstellungen, um automatische KI-Mail-Importe und Eignungs-Scoring freizuschalten.
                        </span>
                      </div>
                    ) : applicantScoreDistribution.totalWithScore === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-100/50 dark:bg-zinc-800/10 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/40">
                        <div className="p-3 bg-zinc-200/30 dark:bg-zinc-800/30 rounded-full mb-3">
                          <UserPlus className="h-6 w-6 text-muted-foreground/50 animate-pulse" />
                        </div>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Keine bewerteten Bewerber vorhanden
                        </span>
                        <span className="text-xs text-muted-foreground/60 max-w-[240px] mt-1.5">
                          Sobald Sie neue Bewerber per Hand oder Mail-Import anlegen, erscheinen hier deren Eignungsstufen.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-primary/5 border border-zinc-200/50 dark:border-zinc-800/30">
                          <div className="text-left border-r border-zinc-200/60 dark:border-zinc-800/80 pr-4">
                            <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1 font-semibold uppercase tracking-wider">Bewerbungen</span>
                            <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {tenantStats.applicantCount} {tenantStats.applicantCount === 1 ? 'Profil' : 'Profile'}
                            </span>
                          </div>
                          <div className="text-left pl-4 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs text-muted-foreground block mb-0.5 font-semibold uppercase tracking-wider">Top-Kandidaten</span>
                            <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {applicantScoreDistribution.high} A-Fits
                            </span>
                          </div>
                        </div>

                        {/* List of applicants */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Bewerber nach Eignungsstufen
                            </h4>
                          </div>

                          {/* Compact Search & Filter Row */}
                          <div className="flex items-center gap-2">
                            <SearchInput
                              placeholder="Bewerber suchen..."
                              value={applicantSearch}
                              onChange={(e) => setApplicantSearch(e.target.value)}
                              onClear={() => setApplicantSearch("")}
                              sizeVariant="sm"
                              wrapperClassName="flex-1"
                            />
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 text-xs px-3 rounded-xl bg-background border border-input focus:border-primary focus:bg-background/80 hover:border-border/80 hover:bg-muted/30 focus:ring-0 focus:outline-hidden transition-all duration-300 ease-in-out gap-1.5 font-medium cursor-pointer">
                                  <Users className="h-3.5 w-3.5 opacity-60 text-muted-foreground" />
                                  <span>
                                    {applicantFilter === "all" ? "Alle Fits" : applicantFilter}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setApplicantFilter("all")} className="text-xs cursor-pointer">Alle Fits</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setApplicantFilter("A-Fit")} className="text-xs cursor-pointer">A-Fit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setApplicantFilter("B-Fit")} className="text-xs cursor-pointer">B-Fit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setApplicantFilter("C-Fit")} className="text-xs cursor-pointer">C-Fit</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Scrollable list */}
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar mt-2">
                            {initialTenants
                              .filter((t) => t.status === 'bewerber')
                              .filter((t) => {
                                // Search filter
                                const matchesSearch = t.name.toLowerCase().includes(applicantSearch.toLowerCase());
                                
                                // Score/Fit filter
                                const score = t.bewerbung_score ?? 0;
                                const fitClass = score >= 80 ? 'A-Fit' : score >= 60 ? 'B-Fit' : 'C-Fit';
                                const matchesFit = applicantFilter === "all" || (fitClass === applicantFilter);
                                
                                return matchesSearch && matchesFit;
                              })
                              .sort((a, b) => (b.bewerbung_score ?? 0) - (a.bewerbung_score ?? 0))
                              .map((t, idx) => {
                                const score = t.bewerbung_score ?? 0;
                                const fitClass = score >= 80 
                                  ? 'A-Fit' 
                                  : score >= 60 
                                    ? 'B-Fit' 
                                    : 'C-Fit';

                                // Unified brand styling for badges
                                const badgeCn = fitClass === 'A-Fit'
                                  ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-450 border-emerald-500/20 text-[10px] py-0.5 px-2 font-bold"
                                  : fitClass === 'B-Fit'
                                    ? "bg-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px] py-0.5 px-2 font-bold"
                                    : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0.5 px-2 font-bold";

                                const labelText = fitClass === 'A-Fit'
                                  ? 'A-Fit'
                                  : fitClass === 'B-Fit'
                                    ? 'B-Fit'
                                    : 'C-Fit';

                                return (
                                  <div
                                    key={t.id || idx}
                                    onClick={() => handleEditTenantInTable(t)}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-xs transition-all duration-200 cursor-pointer select-none"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                                        {fitClass === 'A-Fit' ? (
                                          <BadgeCheck className="h-4.5 w-4.5" />
                                        ) : fitClass === 'B-Fit' ? (
                                          <UserPlus className="h-4.5 w-4.5" />
                                        ) : (
                                          <Clock className="h-4.5 w-4.5" />
                                        )}
                                      </div>
                                      <div>
                                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block group-hover:text-accent transition-colors duration-200">
                                          {t.name}
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                          Score: {score}%
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-end">
                                      <div className="shrink-0 min-w-[80px] flex justify-end">
                                        <Badge variant="outline" className={badgeCn}>
                                          {labelText}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Bottom progress section for applicant scoring quality */}
                        <div className="space-y-2 mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Top-Bewerber-Anteil (A & B-Fit)</span>
                            <span className="text-accent font-bold text-sm">
                              {applicantScoreDistribution.totalWithScore > 0
                                ? Math.round(((applicantScoreDistribution.high + applicantScoreDistribution.good) / applicantScoreDistribution.totalWithScore) * 100)
                                : 0}% hohe Eignung
                            </span>
                          </div>
                          <div className="h-2 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]" 
                              style={{ 
                                width: `${applicantScoreDistribution.totalWithScore > 0 
                                  ? ((applicantScoreDistribution.high + applicantScoreDistribution.good) / applicantScoreDistribution.totalWithScore) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Anteil der Profile mit einer Qualifikation von mindestens 60% (Gute bis hervorragende Eignung).
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            </div>

            {/* Row 3: Nebenkosten-Entwicklung Trend AreaChart */}
            <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
              <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Nebenkosten-Vorauszahlungs-Trends (€)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verteilungsvergleich der monatlichen Vorauszahlungspauschalen nach Mieter
                  </p>
                </div>

                {/* Timeframe selector pill */}
                <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-200/20 dark:border-zinc-800/20 p-1 rounded-full relative w-full sm:w-auto self-start sm:self-center select-none overflow-hidden">
                  {(["1", "2", "5"] as const).map((timeframe) => {
                    const label = timeframe === "1" ? "1 Jahr" : timeframe === "2" ? "2 Jahre" : "5 Jahre";
                    const isActive = nebenkostenTimeframe === timeframe;
                    return (
                      <button
                        key={timeframe}
                        onClick={() => setNebenkostenTimeframe(timeframe)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 relative cursor-pointer min-w-[70px] text-center z-10",
                          isActive
                            ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="nebenkosten-timeframe-pill"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs border border-zinc-200/10 dark:border-zinc-600/30 rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-6">
                {nebenkostenTrend.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-100/50 dark:bg-zinc-800/20 rounded-2xl border border-zinc-200/20">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Keine erfassten Nebenkostenwerte vorhanden
                    </span>
                    <span className="text-xs text-muted-foreground/60 max-w-[240px] mt-1">
                      Fügen Sie Nebenkosteneinträge bei Ihren Mietern hinzu, um Trends und Preisanomalien zu visualisieren.
                    </span>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={nebenkostenTrend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => `${value} €`} 
                        />
                        <RechartsTooltip content={<CustomNebenkostenTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorAmount)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Einträge löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedTenants.size} Einträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedTenants.size} Einträge löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Bewerber löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich ALLE Bewerber unwiderruflich löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllApplicants} disabled={isDeletingAll} className="bg-red-600 hover:bg-red-700">
              {isDeletingAll ? "Lösche..." : "Alle löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ApplicantImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />
      <ApplicantScoreModal />
      <MailPreviewModal />
    </div>
  );
}
