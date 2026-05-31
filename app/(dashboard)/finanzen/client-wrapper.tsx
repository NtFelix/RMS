"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FinanceDonutChart, BaseDonutChart } from "@/components/dashboard/dashboard-charts";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import dynamic from "next/dynamic";
import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet, PlusCircle, Search, Euro, TrendingUp, TrendingDown, Download, Info, Building2, Coins, Clock, Percent, Activity } from "lucide-react";

// Dynamically import heavy components
const FinanceVisualization = dynamic(
  () => import("@/components/finance/finance-visualization").then((mod) => mod.FinanceVisualization),
  { ssr: false } // Charts are client-side only
);

const FinanceTable = dynamic(
  () => import("@/components/tables/finance-table").then((mod) => mod.FinanceTable),
  { ssr: true } // Table benefits from SSR for SEO/initial paint
);

import { FinanceBulkActionBar } from "@/components/finance/finance-bulk-action-bar";
import { SummaryCardSkeleton } from "@/components/skeletons/summary-card-skeleton";
import { SummaryCard } from "@/components/common/summary-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/common/stat-card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { CustomCombobox } from "@/components/ui/custom-combobox";
import { TagInput, ALL_FINANCE_TAGS } from "@/components/ui/tag-input";

import { PAGINATION } from "@/constants";
import { useModalStore } from "@/hooks/use-modal-store";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";

interface Finanz {
  id: string;
  wohnung_id?: string;
  name: string;
  datum?: string;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string;
  tags?: string[] | null;
  Wohnungen?: { name: string };
}

interface Wohnung { id: string; name: string; miete?: number; }

interface SummaryData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalCashflow: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyCashflow: number;
  yearlyProjection: number;
  monthsPassed: number;
  monthlyData: Record<number, { income: number; expenses: number }>;
}

interface FinanzenClientWrapperProps {
  finances: Finanz[];
  wohnungen: Wohnung[];
  summaryData: SummaryData | null;
  initialAvailableYears?: number[];
  initialYear?: number;
  isUsingFallbackYear?: boolean;
  currentYear?: number;
}

// Utility function to remove duplicates based on ID
const deduplicateFinances = (finances: Finanz[]): Finanz[] => {
  const seen = new Set<string>();
  return finances.filter(finance => {
    if (seen.has(finance.id)) {
      return false;
    }
    seen.add(finance.id);
    return true;
  });
};

export default function FinanzenClientWrapper({
  finances: initialFinances,
  wohnungen,
  summaryData: initialSummaryData,
  initialAvailableYears = [],
  initialYear,
  isUsingFallbackYear = false,
  currentYear = new Date().getFullYear()
}: FinanzenClientWrapperProps) {
  const [currentTab, setCurrentTab] = useState<"finance" | "overview">("finance");
  const [finData, setFinData] = useState<Finanz[]>(() => deduplicateFinances(initialFinances));
  const [summaryData, setSummaryData] = useState<SummaryData | null>(initialSummaryData);
  const [unitSearch, setUnitSearch] = useState<string>("");
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [tenantPaymentsData, setTenantPaymentsData] = useState<any[]>([]);
  const [isTenantPaymentsLoading, setIsTenantPaymentsLoading] = useState<boolean>(false);
  const [financeTimeframe, setFinanceTimeframe] = useState<"1" | "2" | "5">("1");
  const [chartFinances, setChartFinances] = useState<Finanz[]>([]);
  const [isChartLoading, setIsChartLoading] = useState<boolean>(false);

  // ... (useEffect for chartFinances remains same)
  useEffect(() => {
    if (currentTab !== "overview" || chartFinances.length > 0) return;

    const fetchChartFinances = async () => {
      setIsChartLoading(true);
      try {
        const supabase = createClient();
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
        cutoffDate.setDate(1); // Ensure we fetch from the very first day of the start month
        const cutoffStr = cutoffDate.toISOString().split('T')[0]; // yyyy-mm-dd

        // Fetch all transactions from the last 5 years
        const { data, error } = await supabase
          .from('Finanzen')
          .select('*, Wohnungen(name)')
          .gte('datum', cutoffStr)
          .order('datum', { ascending: true });

        if (error) {
          console.error("Failed to fetch 5-year finances for chart:", error);
        } else {
          setChartFinances(data || []);
        }
      } catch (err) {
        console.error("Error fetching 5-year finances:", err);
      } finally {
        setIsChartLoading(false);
      }
    };

    fetchChartFinances();
  }, [currentTab, chartFinances.length]);

  // Fetch tenant payment data using the exact same dashboard RPC backend logic
  useEffect(() => {
    if (currentTab !== "overview" || tenantPaymentsData.length > 0) return;

    const fetchTenantPayments = async () => {
      try {
        setIsTenantPaymentsLoading(true);
        const response = await fetch("/api/tenants-data");
        if (!response.ok) throw new Error("Failed to fetch tenant payments");
        const data = await response.json();
        setTenantPaymentsData(data.tenants || []);
      } catch (err) {
        console.error("Error loading tenant payments:", err);
      } finally {
        setIsTenantPaymentsLoading(false);
      }
    };

    fetchTenantPayments();
  }, [currentTab, tenantPaymentsData.length]);

  const monthlyChartSource = useMemo(() => {
    return chartFinances.length > 0 ? chartFinances : finData;
  }, [chartFinances, finData]);

  // Compute stats for finance dashboard overview
  const financeStats = useMemo(() => {
    if (!finData || finData.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0,
        cashflowRatio: 0,
        avgTransaction: 0,
        expenseTags: {} as Record<string, number>,
      }
    }

    let totalIncome = 0
    let totalExpenses = 0
    const expenseTags: Record<string, number> = {}

    finData.forEach(item => {
      const amount = Number(item.betrag || 0)
      if (item.ist_einnahmen) {
        totalIncome += amount
      } else {
        totalExpenses += amount
        const tags = item.tags || []
        if (tags.length > 0) {
          tags.forEach((t: string) => {
            const cleanTag = t.trim()
            expenseTags[cleanTag] = (expenseTags[cleanTag] || 0) + amount
          })
        } else {
          expenseTags['Sonstiges'] = (expenseTags['Sonstiges'] || 0) + amount
        }
      }
    })

    const netCashflow = totalIncome - totalExpenses
    const cashflowRatio = totalIncome > 0 ? Math.round((netCashflow / totalIncome) * 100) : 0
    const avgTransaction = finData.length > 0 ? Math.round((totalIncome + totalExpenses) / finData.length) : 0

    return {
      totalIncome,
      totalExpenses,
      netCashflow,
      cashflowRatio,
      avgTransaction,
      expenseTags,
    };
  }, [finData]);

  // Operational metrics derived directly from the unified tenants-data dashboard API
  const collectionMetrics = useMemo(() => {
    if (tenantPaymentsData.length === 0) {
      return {
        collectionRate: 0,
        uncollectedRent: 0,
        avgDaysToPay: 0,
        punctualityScore: 0,
        expectedMonthlyRent: 0,
        healthStatus: { label: "Lade...", color: "text-zinc-500 animate-pulse", bg: "bg-zinc-500/5 animate-pulse" },
        currentMonthRentStatus: [],
        totalCurrentMonthExpected: 0,
        totalCurrentMonthCollected: 0,
        currentMonthCollectionRate: 0,
        paidCount: 0,
        unpaidCount: 0,
        totalOutstandingMoney: 0
      };
    }

    // Filter for active tenants in the current calendar month
    const activeTenants = tenantPaymentsData.filter(t => {
      // 1. Exclude applicants
      if (t.status === "bewerber") return false;
      
      // 2. Must have a valid apartment assigned
      if (!t.wohnung_id && !t.Wohnungen?.id) return false;
      
      // 3. Must have an expected rent or has paid something
      const expectedRent = Number(t.Wohnungen?.miete) || 0;
      if (expectedRent <= 0 && (Number(t.actualRent) || 0) <= 0) return false;
      
      // 4. Must have already moved in (einzug date is not in the future)
      if (t.einzug) {
        const moveInDate = new Date(t.einzug);
        const today = new Date();
        const moveInYear = moveInDate.getFullYear();
        const moveInMonth = moveInDate.getMonth();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        if (moveInYear > currentYear || (moveInYear === currentYear && moveInMonth > currentMonth)) {
          return false;
        }
      }
      
      // 5. Must not have moved out in the past (auszug date is not in the past)
      if (t.auszug) {
        const moveOutDate = new Date(t.auszug);
        const today = new Date();
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        if (moveOutDate < currentMonthStart) {
          return false;
        }
      }
      
      return true;
    });

    const totalCurrentMonthExpected = activeTenants.reduce((sum, t) => sum + (Number(t.Wohnungen?.miete) || 0), 0);
    const totalCurrentMonthCollected = activeTenants.reduce((sum, t) => sum + (t.paid ? Number(t.actualRent) || Number(t.Wohnungen?.miete) : 0), 0);
    const currentMonthCollectionRate = totalCurrentMonthExpected > 0 ? (totalCurrentMonthCollected / totalCurrentMonthExpected) * 100 : 0;
    const paidCount = activeTenants.filter(t => t.paid).length;
    const unpaidCount = activeTenants.filter(t => !t.paid).length;
    const totalOutstandingMoney = Math.max(0, totalCurrentMonthExpected - totalCurrentMonthCollected);

    // Health Status
    let healthStatus = { label: "Hervorragend", color: "text-emerald-500", bg: "bg-emerald-500/10" };
    if (currentMonthCollectionRate < 95) {
      healthStatus = { label: "Stabil", color: "text-blue-500", bg: "bg-blue-500/10" };
    }
    if (currentMonthCollectionRate < 90) {
      healthStatus = { label: "Achtung", color: "text-amber-500", bg: "bg-amber-500/10" };
    }
    if (currentMonthCollectionRate < 80) {
      healthStatus = { label: "Kritisch", color: "text-rose-500", bg: "bg-rose-500/10" };
    }

    return {
      collectionRate: currentMonthCollectionRate,
      uncollectedRent: totalOutstandingMoney,
      avgDaysToPay: 0,
      punctualityScore: 0,
      expectedMonthlyRent: totalCurrentMonthExpected,
      healthStatus,
      currentMonthRentStatus: activeTenants,
      totalCurrentMonthExpected,
      totalCurrentMonthCollected,
      currentMonthCollectionRate,
      paidCount,
      unpaidCount,
      totalOutstandingMoney
    };
  }, [tenantPaymentsData]);

  // Aggregate comparative monthly data dynamically from finData over the selected timeframe
  const monthlyChartData = useMemo(() => {
    const today = new Date();
    const cutoffDate = new Date();
    const yearsLimit = parseInt(financeTimeframe, 10);
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

    // Build the dataset chronologically
    return allMonthKeys.map(monthKey => {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const monthIdx = parseInt(monthStr, 10) - 1;
      
      // X-axis label: e.g. "Mai 26"
      const formattedName = `${monthNamesGerman[monthIdx]} ${String(year).slice(-2)}`;
      
      // Complete month name for the tooltip
      const fullMonthNamesGerman = [
        "Januar", "Februar", "März", "April", "Mai", "Juni", 
        "Juli", "August", "September", "Oktober", "November", "Dezember"
      ];
      const fullFormattedName = `${fullMonthNamesGerman[monthIdx]} ${year}`;

      let incomeSum = 0;
      let expenseSum = 0;

      monthlyChartSource.forEach(item => {
        if (!item.datum) return;
        // Parse date yyyy-mm-dd
        const dateParts = item.datum.split('-');
        if (dateParts.length < 2) return;
        const itemYear = parseInt(dateParts[0], 10);
        const itemMonth = parseInt(dateParts[1], 10);
        
        if (itemYear === year && itemMonth === (monthIdx + 1)) {
          const amount = Number(item.betrag || 0);
          if (item.ist_einnahmen) {
            incomeSum += amount;
          } else {
            expenseSum += amount;
          }
        }
      });

      return {
        name: formattedName,         // Shown on X-axis
        fullName: fullFormattedName, // For tooltip
        Einnahmen: incomeSum,
        Ausgaben: expenseSum
      };
    });
  }, [monthlyChartSource, financeTimeframe]);

  // Aggregate income and expense breakdowns per apartment unit
  const unitProfitability = useMemo(() => {
    const map: Record<string, { id: string; name: string; income: number; expenses: number }> = {};
    
    wohnungen.forEach(w => {
      map[w.id] = { id: w.id, name: w.name, income: 0, expenses: 0 };
    });

    monthlyChartSource.forEach(item => {
      if (item.wohnung_id && map[item.wohnung_id]) {
        const amount = Number(item.betrag || 0);
        if (item.ist_einnahmen) {
          map[item.wohnung_id].income += amount;
        } else {
          map[item.wohnung_id].expenses += amount;
        }
      }
    });

    return Object.values(map)
      .map(u => {
        const netProfit = u.income - u.expenses;
        const total = u.income + u.expenses;
        const ratio = total > 0 ? Math.round((u.income / total) * 100) : 0;
        return { ...u, netProfit, ratio };
      })
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [monthlyChartSource, wohnungen]);

  // Compute annualized operating income and rental yields
  const annualizedIncome = useMemo(() => financeStats.totalIncome, [financeStats.totalIncome]);
  const annualizedExpenses = useMemo(() => financeStats.totalExpenses, [financeStats.totalExpenses]);
  const netAnnualOperatingIncome = useMemo(() => annualizedIncome - annualizedExpenses, [annualizedIncome, annualizedExpenses]);

  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(initialSummaryData !== null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>(initialAvailableYears);
  const [selectedFinances, setSelectedFinances] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    searchQuery: '',
    selectedApartment: 'Alle Wohnungen',
    selectedYear: 'Alle Jahre',
    selectedType: 'Alle Transaktionen',
    selectedTags: [] as string[],
    sortKey: 'datum',
    sortDirection: 'desc'
  });
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [filteredIncome, setFilteredIncome] = useState(0);
  const [filteredExpenses, setFilteredExpenses] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const reloadRef = useRef<(() => void) | null>(null);
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);
  const filtersRef = useRef(filters);
  const debouncedSearchQueryRef = useRef(debouncedSearchQuery);

  // Update refs when values change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    debouncedSearchQueryRef.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  const loadMoreTransactions = useCallback(async (resetData = false) => {
    if (isLoading || (!hasMore && !resetData)) return;
    setIsLoading(true);
    setError(null);

    const targetPage = resetData ? 1 : page + 1;

    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE.toString(),
        searchQuery: debouncedSearchQueryRef.current,
        selectedApartment: filtersRef.current.selectedApartment,
        selectedYear: filtersRef.current.selectedYear,
        selectedType: filtersRef.current.selectedType,
        sortKey: filtersRef.current.sortKey,
        sortDirection: filtersRef.current.sortDirection
      });

      // Add selected tags as a comma-separated list
      if (filtersRef.current.selectedTags.length > 0) {
        params.set('selectedTags', filtersRef.current.selectedTags.join(','));
      }

      const response = await fetch(`/api/finanzen?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const newTransactions = await response.json();
      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);

      if (resetData) {
        setFinData(deduplicateFinances(newTransactions));
        setPage(1);
      } else {
        setFinData(prev => {
          // Create a Set of existing IDs to avoid duplicates
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewTransactions = newTransactions.filter((transaction: Finanz) => !existingIds.has(transaction.id));
          return [...prev, ...uniqueNewTransactions];
        });
        setPage(prev => prev + 1);
      }

      // Check if there are more records to load
      const loadedCount = resetData ? newTransactions.length : finData.length + newTransactions.length;
      setHasMore(loadedCount < totalCount);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while loading transactions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading]);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_filtered_financial_summary', {
        search_query: debouncedSearchQueryRef.current,
        apartment_name: filtersRef.current.selectedApartment,
        target_year: filtersRef.current.selectedYear,
        transaction_type: filtersRef.current.selectedType,
        filter_tags: filtersRef.current.selectedTags
      });

      if (error) {
        console.error('Failed to fetch filtered summary:', error);
        throw new Error(error.message);
      }

      // The RPC function is designed to always return a single row.
      // We provide a fallback just in case the contract changes or an unexpected error occurs.
      const summary = data?.[0] ?? { total_balance: 0, total_income: 0, total_expenses: 0 };
      setTotalBalance(Number(summary.total_balance));
      setFilteredIncome(Number(summary.total_income));
      setFilteredExpenses(Number(summary.total_expenses));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      if (error instanceof Error) {
        setError(`Failed to fetch balance: ${error.message}`);
      } else {
        setError('An unknown error occurred while fetching balance');
      }
    } finally {
      setBalanceLoading(false);
    }
  }, []); // No dependencies needed since we use refs

  const refreshSummaryData = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/finanzen/analytics?action=summary&year=${currentYear}`);
      if (response.ok) {
        const newSummaryData = await response.json();
        setSummaryData(newSummaryData);
        setHasInitialData(true);
      }
    } catch (error) {
      console.error('Failed to refresh summary data:', error);
      if (error instanceof Error) {
        setError(`Failed to refresh summary data: ${error.message}`);
      } else {
        setError('An unknown error occurred while refreshing summary data');
      }
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  const handleAddFinance = useCallback((newFinance: Finanz) => {
    setFinData(prev => {
      const existingIndex = prev.findIndex(item => item.id === newFinance.id);
      if (existingIndex !== -1) {
        // Update existing item
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newFinance };
        return updated;
      }
      // Add new item at the beginning
      return [newFinance, ...prev];
    });

    // Refresh summary data if the transaction is from current year
    const currentYear = new Date().getFullYear();
    if (newFinance.datum && new Date(newFinance.datum).getFullYear() === currentYear) {
      refreshSummaryData();
    }

    // Refresh balance to reflect the new/updated transaction
    fetchBalance();
  }, [refreshSummaryData, fetchBalance]);

  const handleBulkUpdateSuccess = useCallback((updatedFinances: Finanz[]) => {
    if (!updatedFinances?.length) {
      return;
    }

    const currentYear = new Date().getFullYear();
    const shouldRefreshSummary = updatedFinances.some(finance => (
      finance.datum && new Date(finance.datum).getFullYear() === currentYear
    ));

    setFinData(prev => {
      const updatesById = new Map(updatedFinances.map(finance => [finance.id, finance]));
      return prev.map(item => updatesById.get(item.id) ? { ...item, ...updatesById.get(item.id)! } : item);
    });

    if (shouldRefreshSummary) {
      refreshSummaryData();
    }

    fetchBalance();
  }, [refreshSummaryData, fetchBalance]);

  const handleSuccess = useCallback((data: any) => {
    if (data) {
      handleAddFinance(data);
    }
  }, [handleAddFinance]);

  // Use server-provided summary data or fallback to default values
  const averageMonthlyIncome = summaryData?.averageMonthlyIncome ?? 0;
  const averageMonthlyExpenses = summaryData?.averageMonthlyExpenses ?? 0;
  const averageMonthlyCashflow = summaryData?.averageMonthlyCashflow ?? 0;
  const yearlyProjection = summaryData?.yearlyProjection ?? 0;
  const totalIncome = summaryData?.totalIncome ?? 0;
  const totalExpenses = summaryData?.totalExpenses ?? 0;

  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, handleSuccess);
  }, [wohnungen, handleSuccess]);

  const handleAddTransaction = useCallback(() => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, handleSuccess);
  }, [wohnungen, handleSuccess]);

  const refreshFinances = useCallback(async () => {
    await loadMoreTransactions(true);
    await refreshSummaryData();
    await fetchBalance();
  }, [loadMoreTransactions, refreshSummaryData, fetchBalance]);

  // Constants for filter options
  const ALL_APARTMENTS_FILTER = 'Alle Wohnungen';
  const ALL_YEARS_FILTER = 'Alle Jahre';

  // Filter options
  const apartmentOptions = useMemo(() =>
    [ALL_APARTMENTS_FILTER, ...wohnungen.map(w => w.name)].map(a => ({ value: a, label: a })),
    [wohnungen]
  );

  const yearOptions = useMemo(() =>
    [ALL_YEARS_FILTER, ...availableYears.map(y => y.toString())].map(y => ({ value: y, label: y })),
    [availableYears]
  );

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };

  // Summary calculation for StatCards
  const summary = useMemo(() => {
    const totalTransactions = finData.length;
    const incomeCount = finData.filter(f => f.ist_einnahmen).length;
    const expenseCount = totalTransactions - incomeCount;

    // Average transaction amount
    const transactionAmounts = finData.map(f => f.betrag).filter(amount => amount > 0);
    const avgTransaction = transactionAmounts.length ? transactionAmounts.reduce((s, v) => s + v, 0) / transactionAmounts.length : 0;

    return { totalTransactions, incomeCount, expenseCount, avgTransaction };
  }, [finData]);

  // Wohnungen map for bulk actions
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen]);

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

  const handleBulkDelete = useCallback(async () => {
    if (selectedFinances.size === 0) return;

    try {
      const response = await fetch('/api/finanzen/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedFinances) })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Erfolg",
          description: `${selectedFinances.size} Transaktionen erfolgreich gelöscht.`,
          variant: "success",
        });

        // Refresh the data after successful deletion
        if (refreshFinances) {
          refreshFinances();
        }

        // Clear selection after successful deletion
        setSelectedFinances(new Set());
      } else {
        throw new Error(result.error || 'Fehler beim Löschen der Transaktionen');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Fehler",
        description: "Beim Löschen der ausgewählten Transaktionen ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  }, [selectedFinances, refreshFinances]);

  const handleBulkExport = useCallback(() => {
    const selectedFinancesData = finData.filter(f => selectedFinances.has(f.id))

    // Create CSV header
    const headers = ['Bezeichnung', 'Wohnung', 'Datum', 'Betrag', 'Typ', 'Notiz']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedFinancesData.map(f => {
      const row = [
        f.name,
        f.Wohnungen?.name || '',
        f.datum || '',
        f.betrag.toString(),
        f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
        f.notiz || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finanzen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }, [selectedFinances, finData, escapeCsvValue]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters.selectedApartment) params.append('selectedApartment', filters.selectedApartment);
    if (filters.selectedYear) params.append('selectedYear', filters.selectedYear);
    if (filters.selectedType) params.append('selectedType', filters.selectedType);

    const url = `/api/finanzen/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('/api/finanzen/analytics?action=available-years');
      if (response.ok) {
        const years = await response.json();
        setAvailableYears(years);
      } else {
        // Fallback to the old API if the new one fails
        console.warn('New analytics API failed, falling back to old years API');
        const fallbackResponse = await fetch('/api/finanzen/years');
        if (fallbackResponse.ok) {
          const years = await fallbackResponse.json();
          setAvailableYears(years);
        }
      }
    } catch (error) {
      console.error('Failed to fetch available years:', error);
      if (error instanceof Error) {
        setError(`Failed to fetch available years: ${error.message}`);
      } else {
        setError('An unknown error occurred while fetching available years');
      }
    }
  }, []);

  useEffect(() => {
    fetchAvailableYears();
    fetchBalance(); // Initial balance fetch
  }, []); // Only run once on mount

  useEffect(() => {
    setIsFilterLoading(true);
    const timer = setTimeout(() => {
      loadMoreTransactions(true).finally(() => setIsFilterLoading(false));
      fetchBalance();
    }, 100);

    return () => clearTimeout(timer);
  }, [filters.selectedApartment, filters.selectedYear, filters.selectedType, filters.selectedTags, filters.sortKey, filters.sortDirection, debouncedSearchQuery]);


  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      {/* Visual Toggle Pill */}
      <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px] select-none z-0">
        <motion.button
          layout
          onClick={() => setCurrentTab("finance")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "finance" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "finance" && (
            <motion.div
              layoutId="active-finanzen-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Wallet className="size-4 shrink-0 transition-transform duration-300" />
          <span>Finanzen</span>
        </motion.button>

        <motion.button
          layout
          onClick={() => setCurrentTab("overview")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "overview" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "overview" && (
            <motion.div
              layoutId="active-finanzen-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <BarChart3 className="size-4 shrink-0 transition-transform duration-300" />
          <span>Übersicht</span>
        </motion.button>
      </div>

      {currentTab === "finance" ? (
        <>
          {/* Fallback Year Notification Banner */}
          {isUsingFallbackYear && initialYear && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
              <Info className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Daten aus {initialYear} werden angezeigt
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Für das aktuelle Jahr ({currentYear}) liegen noch keine Finanzdaten vor.
                </p>
              </div>
            </div>
          )}

          {/* Summary Cards for Current Year */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
            {isSummaryLoading && hasInitialData ? (
              <>
                <SummaryCardSkeleton
                  title="Ø Monatliche Einnahmen"
                  icon={<ArrowUpCircle className="size-4 text-green-500" />}
                />
                <SummaryCardSkeleton
                  title="Ø Monatliche Ausgaben"
                  icon={<ArrowDownCircle className="size-4 text-red-500" />}
                />
                <SummaryCardSkeleton
                  title="Ø Monatlicher Cashflow"
                  icon={<Wallet className="size-4 text-muted-foreground" />}
                />
                <SummaryCardSkeleton
                  title="Jahresprognose"
                  icon={<BarChart3 className="size-4 text-muted-foreground" />}
                />
              </>
            ) : (
              <>
                <SummaryCard
                  title="Ø Monatliche Einnahmen"
                  value={averageMonthlyIncome}
                  description="Durchschnittliche monatliche Einnahmen"
                  icon={<ArrowUpCircle className="size-4 text-green-500" />}
                  isLoading={isSummaryLoading}
                />
                <SummaryCard
                  title="Ø Monatliche Ausgaben"
                  value={averageMonthlyExpenses}
                  description="Durchschnittliche monatliche Ausgaben"
                  icon={<ArrowDownCircle className="size-4 text-red-500" />}
                  isLoading={isSummaryLoading}
                />
                <SummaryCard
                  title="Ø Monatlicher Cashflow"
                  value={averageMonthlyCashflow}
                  description="Durchschnittlicher monatlicher Überschuss"
                  icon={<Wallet className="size-4 text-muted-foreground" />}
                  isLoading={isSummaryLoading}
                />
                <SummaryCard
                  title="Jahresprognose"
                  value={yearlyProjection}
                  description="Geschätzter Jahresgewinn"
                  icon={<BarChart3 className="size-4 text-muted-foreground" />}
                  isLoading={isSummaryLoading}
                />
              </>
            )}
          </div>

          <FinanceVisualization
            finances={finData}
            summaryData={summaryData}
            availableYears={availableYears}
            initialYear={initialYear}
            key={summaryData?.year}
          />

          {/* Filtered Summary Cards */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
            {balanceLoading ? (
              <>
                <SummaryCardSkeleton
                  title="Gefilterte Einnahmen"
                  icon={<ArrowUpCircle className="size-4 text-green-500" />}
                />
                <SummaryCardSkeleton
                  title="Gefilterte Ausgaben"
                  icon={<ArrowDownCircle className="size-4 text-red-500" />}
                />
                <SummaryCardSkeleton
                  title="Aktueller Saldo"
                  icon={<Wallet className="size-4 text-muted-foreground" />}
                />
              </>
            ) : (
              <>
                <SummaryCard
                  title="Gefilterte Einnahmen"
                  value={filteredIncome}
                  description="Einnahmen basierend auf aktuellen Filtern"
                  icon={<ArrowUpCircle className="size-4 text-green-500" />}
                  isLoading={balanceLoading}
                />
                <SummaryCard
                  title="Gefilterte Ausgaben"
                  value={filteredExpenses}
                  description="Ausgaben basierend auf aktuellen Filtern"
                  icon={<ArrowDownCircle className="size-4 text-red-500" />}
                  isLoading={balanceLoading}
                />
                <SummaryCard
                  title="Aktueller Saldo"
                  value={totalBalance}
                  description="Gesamtsaldo aller Transaktionen"
                  icon={<Wallet className="size-4 text-muted-foreground" />}
                  isLoading={balanceLoading}
                />
              </>
            )}
          </div>

          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Finanzverwaltung</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Verwalten Sie hier alle Ihre Einnahmen und Ausgaben</p>
                </div>
                <div className="mt-0 sm:mt-1">
                  <ResponsiveButtonWithTooltip onClick={handleAddTransaction} icon={<PlusCircle className="size-4" />} shortText="Hinzufügen">
                    Transaktion hinzufügen
                  </ResponsiveButtonWithTooltip>
                </div>
              </div>
            </CardHeader>
            <div className="px-4 sm:px-6">
              <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
            </div>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 mt-4 sm:mt-6">
                {/* Filter Controls */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 w-full md:flex-1">
                    <CustomCombobox
                      options={apartmentOptions}
                      value={filters.selectedApartment}
                      onChange={(value) => handleFilterChange('selectedApartment', value ?? ALL_APARTMENTS_FILTER)}
                      placeholder="Wohnung auswählen"
                      searchPlaceholder="Wohnung suchen..."
                      emptyText="Keine Wohnung gefunden"
                      width="w-full"
                    />
                    <CustomCombobox
                      options={yearOptions}
                      value={filters.selectedYear}
                      onChange={(value) => handleFilterChange('selectedYear', value ?? ALL_YEARS_FILTER)}
                      placeholder="Jahr auswählen"
                      searchPlaceholder="Jahr suchen..."
                      emptyText="Kein Jahr gefunden"
                      width="w-full"
                    />
                    <CustomCombobox
                      options={[
                        { value: "Alle Transaktionen", label: "Alle Transaktionen" },
                        { value: "Einnahme", label: "Einnahme" },
                        { value: "Ausgabe", label: "Ausgabe" }
                      ]}
                      value={filters.selectedType}
                      onChange={(value) => handleFilterChange('selectedType', value ?? 'Alle Transaktionen')}
                      placeholder="Transaktionstyp auswählen"
                      searchPlaceholder="Typ suchen..."
                      emptyText="Kein Typ gefunden"
                      width="w-full"
                    />
                    <div className="col-span-1 sm:col-span-2 md:col-span-1">
                      <TagInput
                        value={filters.selectedTags}
                        onChange={(tags) => setFilters({ ...filters, selectedTags: tags })}
                        placeholder="Tags filtern..."
                      />
                    </div>
                    <SearchInput
                      placeholder="Transaktion suchen..."
                      wrapperClassName="col-span-1 sm:col-span-2 md:col-span-1"
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      onClear={() => handleFilterChange('searchQuery', '')}
                    />
                  </div>
                </div>

                <FinanceBulkActionBar
                  selectedFinances={selectedFinances}
                  wohnungsMap={wohnungsMap}
                  onClearSelection={() => setSelectedFinances(new Set())}
                  onExport={handleBulkExport}
                  onDelete={handleBulkDelete}
                  onUpdate={handleBulkUpdateSuccess}
                />
              </div>
              <FinanceTable
                finances={finData}
                wohnungen={wohnungen}
                filter={filters.selectedType}
                searchQuery={filters.searchQuery}
                onEdit={handleEdit}
                onRefresh={refreshFinances}
                selectedFinances={selectedFinances}
                onSelectionChange={setSelectedFinances}
                isFilterLoading={isFilterLoading}
                hasMore={hasMore}
                isLoading={isLoading}
                error={error}
                loadFinances={() => loadMoreTransactions(false)}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Einnahmen"
              value={financeStats.totalIncome}
              unit="€"
              decimals
              icon={<ArrowUpCircle className="size-4 text-emerald-500" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ausgaben"
              value={financeStats.totalExpenses}
              unit="€"
              decimals
              icon={<ArrowDownCircle className="size-4 text-red-500" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Netto-Cashflow"
              value={financeStats.netCashflow}
              unit="€"
              decimals
              icon={<Wallet className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø pro Transaktion"
              value={financeStats.avgTransaction}
              unit="€"
              decimals
              icon={<Euro className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>

          {/* Row 1: Flow-Quote and Tag Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Box: Flow-Quote */}
            <div className="lg:col-span-5 p-6 rounded-[2rem] border border-gray-200 dark:border-[#3C4251] bg-gray-50 dark:bg-[#22272e] shadow-xs flex flex-col gap-6 h-full min-h-[300px] justify-between">
              <div>
                <h3 className="font-bold text-base font-semibold text-zinc-950 dark:text-zinc-50">Flow-Quote</h3>
                <p className="text-xs text-muted-foreground mt-1">Verhältnis von Netto-Überschuss zu Gesamteinnahmen</p>
              </div>

              {/* Mini horizontal bars for Income & Expenses */}
              <div className="flex flex-col gap-3.5 bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-2xl p-4 select-none">
                {/* Income Row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Einnahmen</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-500">
                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(financeStats.totalIncome)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full transition-all duration-700" 
                      style={{ 
                        width: `${financeStats.totalIncome > 0 ? 100 : 0}%` 
                      }} 
                    />
                  </div>
                </div>

                {/* Expenses Row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Ausgaben</span>
                    <span className="font-bold text-rose-600 dark:text-rose-500">
                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(financeStats.totalExpenses)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-rose-500 rounded-full transition-all duration-700" 
                      style={{ 
                        width: `${financeStats.totalIncome > 0 ? Math.min(100, Math.round((financeStats.totalExpenses / financeStats.totalIncome) * 100)) : 0}%` 
                      }} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  <span>Überschuss-Verhältnis</span>
                  <span className="text-accent text-lg">{financeStats.cashflowRatio}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-200/50 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(0, financeStats.cashflowRatio))}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1">
                  Der Netto-Überschuss Ihres Portfolios beträgt aktuell {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(financeStats.netCashflow)}.
                </div>
              </div>
            </div>

            {/* Right Box: Donut Chart Distribution */}
            <div className="lg:col-span-7 p-6 rounded-[2rem] border border-gray-200 dark:border-[#3C4251] bg-gray-50 dark:bg-[#22272e] shadow-xs min-h-[300px]">
              <div className="mb-4">
                <h3 className="font-bold text-base font-semibold text-zinc-950 dark:text-zinc-50">Ausgaben-Verteilung</h3>
                <p className="text-xs text-muted-foreground mt-1">Verteilung der Transaktions-Tags über Ihre Einnahmen und Ausgaben</p>
              </div>
              <div className="w-full flex items-center justify-center p-2">
                <div className="w-full max-w-[340px] h-[280px]">
                  <FinanceDonutChart 
                    finanzen={monthlyChartSource} 
                    isLoading={isChartLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Comparative Seasonal Trend AreaChart */}
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px]">
            <CardHeader className="px-0 pt-0 shrink-0 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold">Saisonale Einnahmen- & Ausgaben-Trends (€)</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Verteilungsvergleich der monatlichen Einnahmen (Miete) und Betriebsausgaben
                </CardDescription>
              </div>

              {/* Timeframe selector pill */}
              <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-200/20 dark:border-zinc-800/20 p-1 rounded-full relative w-full sm:w-auto self-start sm:self-center select-none overflow-hidden">
                {(["1", "2", "5"] as const).map((timeframe) => {
                  const label = timeframe === "1" ? "1 Jahr" : timeframe === "2" ? "2 Jahre" : "5 Jahre";
                  const isActive = financeTimeframe === timeframe;
                  return (
                    <button
                      key={timeframe}
                      onClick={() => setFinanceTimeframe(timeframe)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 relative cursor-pointer min-w-[70px] text-center z-10",
                        isActive
                          ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="finance-timeframe-pill"
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
            <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 relative">
              {isChartLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center animate-pulse h-full min-h-[280px]">
                  <Activity className="size-6 text-accent/50 animate-bounce mb-2" />
                  <span className="text-xs text-muted-foreground">Lade Transaktionshistorie (5 Jahre)...</span>
                </div>
              ) : monthlyChartData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-zinc-100/50 dark:bg-zinc-800/10 rounded-3xl border border-zinc-200/20 dark:border-zinc-800/40 animate-in fade-in duration-300 h-full">
                  <div className="p-3 bg-zinc-200/30 dark:bg-zinc-800/30 rounded-full mb-3">
                    <Activity className="size-6 text-muted-foreground/50 animate-pulse" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Keine Trenddaten verfügbar
                  </span>
                </div>
              ) : (
                <div className="w-full h-[280px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorEinnahmen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success, 142.1 76.2% 36.3%))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--success, 142.1 76.2% 36.3%))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAusgaben" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive, 0 84.2% 60.2%))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--destructive, 0 84.2% 60.2%))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(228, 228, 231, 0.1)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={45} tickFormatter={(val) => `${val} €`} />
                      <RechartsTooltip
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0] && payload[0].payload) {
                            return payload[0].payload.fullName || label;
                          }
                          return label;
                        }}
                        formatter={(value: any) => [`${value.toLocaleString('de-DE')} €`]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e4e4e7',
                          borderRadius: '1rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Area type="monotone" dataKey="Einnahmen" stroke="hsl(var(--success, 142.1 76.2% 36.3%))" strokeWidth={2} fillOpacity={1} fill="url(#colorEinnahmen)" />
                      <Area type="monotone" dataKey="Ausgaben" stroke="hsl(var(--destructive, 0 84.2% 60.2%))" strokeWidth={2} fillOpacity={1} fill="url(#colorAusgaben)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 3: Unit Breakdown Leaderboard and Yield ROI Slider Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Unit Profitability Leaderboard */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Rentabilität nach Wohnung</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Netto-Ertrag (Einnahmen abzüglich Ausgaben) gruppiert nach Wohneinheiten
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0">
                {/* Compact Search */}
                <div className="mb-4 shrink-0">
                  <SearchInput
                    placeholder="Wohnung suchen..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    onClear={() => setUnitSearch("")}
                    sizeVariant="sm"
                    wrapperClassName="w-full"
                  />
                </div>

                {/* List Container */}
                <div className="space-y-2.5 overflow-y-auto pr-2 custom-scrollbar h-[250px]">
                  {unitProfitability
                    .filter(u => u.name.toLowerCase().includes(unitSearch.toLowerCase()))
                    .map((unit, idx) => {
                      const isProfitable = unit.netProfit >= 0;
                      return (
                        <div 
                          key={idx}
                          className="group flex items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 hover:shadow-xs transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                              <Building2 className="size-4.5" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block transition-colors duration-200">
                                {unit.name}
                              </span>
                              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                Einnahmenquote: {unit.ratio}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* mini progress bar */}
                            <div className="hidden sm:block h-1.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                              <div 
                                className={cn("h-full rounded-full", isProfitable ? "bg-emerald-500" : "bg-rose-500")}
                                style={{ width: `${unit.ratio}%` }}
                              />
                            </div>
                            <span className={cn(
                              "text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs transition-colors duration-200 shrink-0",
                              isProfitable 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            )}>
                              {isProfitable ? '+' : ''}{unit.netProfit.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Right Box: Enhanced Rent Collection & Speed Analysis */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Mieteingang & Zahlungsmoral</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Echtzeit-Mieteingang und Fälligkeits-Verfolgung
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 justify-between gap-6">
                <div className="flex-1 flex flex-col justify-between gap-5">
                  {/* Centered Donut Chart */}
                  <div className="flex justify-center items-center py-2 shrink-0">
                    <div className="relative w-full h-[220px] flex items-center justify-center">
                      <BaseDonutChart
                        data={[
                          { name: "Bezahlt", value: collectionMetrics.paidCount },
                          { name: "Offen", value: collectionMetrics.unpaidCount }
                        ]}
                        colors={[
                          "hsl(var(--success, 142.1 76.2% 36.3%))",
                          collectionMetrics.unpaidCount > 0 ? "hsl(var(--destructive, 0 84.2% 60.2%))" : "rgba(228, 228, 231, 0.1)"
                        ]}
                        innerRadius={70}
                        outerRadius={90}
                        showLegend={false}
                        showTooltip={false}
                        onHoverSegment={setHoveredPieIndex}
                      />
                      
                      {/* Interactive Center Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center mt-0.5 px-3">
                        {hoveredPieIndex === null ? (
                          <>
                            <span className={cn(
                              "font-black tracking-tight leading-none transition-all duration-200",
                              collectionMetrics.totalOutstandingMoney > 0 ? "text-rose-600 dark:text-rose-400 text-lg" : "text-emerald-600 dark:text-emerald-400 text-base"
                            )}>
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(collectionMetrics.totalOutstandingMoney)}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">
                              {collectionMetrics.totalOutstandingMoney > 0 ? "Offen" : "Miete erledigt"}
                            </span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                              Diesen Monat
                            </span>
                          </>
                        ) : hoveredPieIndex === 0 ? (
                          <>
                            <span className="text-lg font-black tracking-tight leading-none text-emerald-600 dark:text-emerald-400 transition-all duration-200">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(collectionMetrics.totalCurrentMonthCollected)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1.5">
                              Ist-Miete
                            </span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                              {collectionMetrics.paidCount} von {collectionMetrics.currentMonthRentStatus.length} bezahlt
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg font-black tracking-tight leading-none text-rose-600 dark:text-rose-400 transition-all duration-200">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(collectionMetrics.totalOutstandingMoney)}
                            </span>
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-1.5">
                              Offen
                            </span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                              {collectionMetrics.unpaidCount} von {collectionMetrics.currentMonthRentStatus.length} offen
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spacious 3-Column Statistics Bar */}
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-2xl p-4 text-center shrink-0">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="flex items-center gap-1">
                        <Coins className="size-3.5 text-muted-foreground" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Soll-Ertrag</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(collectionMetrics.totalCurrentMonthExpected)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-1 border-x border-zinc-200/50 dark:border-zinc-800/30 px-1">
                      <div className="flex items-center gap-1">
                        <ArrowUpCircle className="size-3.5 text-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Ist-Miete</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(collectionMetrics.totalCurrentMonthCollected)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="flex items-center gap-1">
                        <Activity className="size-3.5 text-accent" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Status</span>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5 truncate">
                        {collectionMetrics.paidCount} / {collectionMetrics.currentMonthRentStatus.length} Bezahlt
                      </span>
                    </div>
                  </div>
                </div>


              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
