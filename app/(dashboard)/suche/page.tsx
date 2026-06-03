"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useSearch } from "@/hooks/use-search"
import { useModalStore } from "@/hooks/use-modal-store"
import { useSearchModalIntegration } from "@/hooks/use-search-modal-integration"
import { toast } from "@/hooks/use-toast"
import { ActionMenu } from "@/components/ui/action-menu"
import { SearchResult } from "@/types/search"
import { 
  Search, 
  Users, 
  Building2, 
  Home, 
  Wallet, 
  CheckSquare, 
  X, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  ChevronRight,
  WifiOff,
  History
} from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export default function SuchePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    executionTime,
    clearSearch,
    retry,
    isOffline,
    recentSearches,
    suggestions,
    addToRecentSearches
  } = useSearch({
    limit: 20
  })



  // Centralized entity data fetching & caching logic
  const entityCache = useRef<Record<string, { data: any[], timestamp: number }>>({})
  const ENTITY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  const fetchEntityData = useCallback(async (entityType: string, forceRefresh = false) => {
    const cacheKey = entityType
    const cached = entityCache.current[cacheKey]

    if (!forceRefresh && cached && Date.now() - cached.timestamp < ENTITY_CACHE_DURATION) {
      return cached.data
    }

    try {
      const response = await fetch(`/api/${entityType}`)
      if (!response.ok) throw new Error(`Failed to fetch ${entityType}`)
      const data = await response.json()
      entityCache.current[cacheKey] = {
        data,
        timestamp: Date.now()
      }
      return data
    } catch (error) {
      console.error(`Error fetching ${entityType}:`, error)
      throw error
    }
  }, [])

  const invalidateEntityCache = useCallback((entityType?: string) => {
    if (entityType) {
      delete entityCache.current[entityType]
    } else {
      entityCache.current = {}
    }
  }, [])

  const refreshSearchResults = useCallback(() => {
    if (query.trim()) {
      const currentQuery = query
      clearSearch()
      setTimeout(() => setQuery(currentQuery), 100)
    }
  }, [query, clearSearch, setQuery])

  const createModalSuccessCallback = useCallback((entityName: string, entityType?: string) => {
    return () => {
      if (entityType) {
        invalidateEntityCache(entityType)
        switch (entityType) {
          case 'mieter':
            invalidateEntityCache('wohnungen')
            break
          case 'wohnungen':
            invalidateEntityCache('mieter')
            invalidateEntityCache('haeuser')
            break
          case 'haeuser':
            invalidateEntityCache('wohnungen')
            break
          case 'finanzen':
            invalidateEntityCache('wohnungen')
            break
        }
      } else {
        entityCache.current = {}
      }

      refreshSearchResults()

      toast({
        title: 'Erfolg',
        description: `${entityName} wurde erfolgreich aktualisiert.`,
      })
    }
  }, [refreshSearchResults, invalidateEntityCache])

  useSearchModalIntegration({
    onEntityUpdated: (entityType, entityName) => {
      refreshSearchResults()
      if (query.trim()) {
        toast({
          title: 'Suche aktualisiert',
          description: `${entityName} wurde aktualisiert. Suchergebnisse wurden aktualisiert.`,
        })
      }
    },
    onCacheInvalidate: (entityType) => {
      invalidateEntityCache(entityType)
      switch (entityType) {
        case 'mieter':
          invalidateEntityCache('wohnungen')
          break
        case 'wohnungen':
          invalidateEntityCache('mieter')
          invalidateEntityCache('haeuser')
          break
        case 'haeuser':
          invalidateEntityCache('wohnungen')
          break
        case 'finanzen':
          invalidateEntityCache('wohnungen')
          break
      }
    }
  })

  // Edit/Delete handlers matching CommandMenu
  const handleEditTenant = async (tenantId: string, searchResult?: SearchResult) => {
    try {
      const tenantResponse = await fetch(`/api/mieter/${tenantId}`)
      if (!tenantResponse.ok) throw new Error('Tenant not found')
      const tenant = await tenantResponse.json()
      const wohnungen = await fetchEntityData('wohnungen')

      const tenantWithContext = searchResult ? {
        ...tenant,
        _searchContext: {
          query,
          resultType: searchResult.type,
          resultTitle: searchResult.title
        }
      } : tenant

      useModalStore.getState().openTenantModal(tenantWithContext, wohnungen)
    } catch (error) {
      console.error('Error loading tenant for edit:', error)
      toast({
        title: 'Fehler',
        description: 'Mieter konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditHouse = async (houseId: string, searchResult?: SearchResult) => {
    try {
      const response = await fetch(`/api/haeuser/${houseId}`)
      if (!response.ok) throw new Error('House not found')
      const house = await response.json()
      const onSuccess = createModalSuccessCallback('Haus', 'haeuser')

      const houseWithContext = searchResult ? {
        ...house,
        _searchContext: {
          query,
          resultType: searchResult.type,
          resultTitle: searchResult.title
        }
      } : house

      useModalStore.getState().openHouseModal(houseWithContext, onSuccess)
    } catch (error) {
      console.error('Error loading house for edit:', error)
      toast({
        title: 'Fehler',
        description: 'Haus konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditApartment = async (apartmentId: string, searchResult?: SearchResult) => {
    try {
      const [apartments, houses] = await Promise.all([
        fetchEntityData('wohnungen'),
        fetchEntityData('haeuser')
      ])
      const apartment = apartments.find((a: any) => a.id === apartmentId)

      if (apartment) {
        const onSuccess = createModalSuccessCallback('Wohnung', 'wohnungen')
        const apartmentWithContext = searchResult ? {
          ...apartment,
          _searchContext: {
            query,
            resultType: searchResult.type,
            resultTitle: searchResult.title
          }
        } : apartment

        useModalStore.getState().openWohnungModal(
          apartmentWithContext,
          houses,
          onSuccess
        )
      } else {
        toast({
          title: 'Fehler',
          description: 'Wohnung nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error loading apartment for edit:', error)
      toast({
        title: 'Fehler',
        description: 'Wohnung konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditFinance = async (financeId: string, searchResult?: SearchResult) => {
    try {
      const [finances, wohnungen] = await Promise.all([
        fetchEntityData('finanzen'),
        fetchEntityData('wohnungen')
      ])
      const finance = finances.find((f: any) => f.id === financeId)

      if (finance) {
        const onSuccess = createModalSuccessCallback('Finanzeintrag', 'finanzen')
        const financeWithContext = searchResult ? {
          ...finance,
          _searchContext: {
            query,
            resultType: searchResult.type,
            resultTitle: searchResult.title
          }
        } : finance

        useModalStore.getState().openFinanceModal(financeWithContext, wohnungen, onSuccess)
      } else {
        toast({
          title: 'Fehler',
          description: 'Finanzeintrag nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error loading finance record for edit:', error)
      toast({
        title: 'Fehler',
        description: 'Finanzeintrag konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditTask = async (taskId: string, searchResult?: SearchResult) => {
    try {
      const tasks = await fetchEntityData('todos')
      const task = tasks.find((t: any) => t.id === taskId)

      if (task) {
        const onSuccess = createModalSuccessCallback('Aufgabe', 'todos')
        const taskWithContext = searchResult ? {
          ...task,
          _searchContext: {
            query,
            resultType: searchResult.type,
            resultTitle: searchResult.title
          }
        } : task

        useModalStore.getState().openAufgabeModal(taskWithContext, onSuccess)
      } else {
        toast({
          title: 'Fehler',
          description: 'Aufgabe nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error loading task for edit:', error)
      toast({
        title: 'Fehler',
        description: 'Aufgabe konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteFinanceRecord = (result: SearchResult) => {
    useModalStore.getState().openConfirmationModal({
      title: 'Finanzeintrag löschen',
      description: `Möchten Sie den Finanzeintrag "${result.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/finanzen/${result.id}`, {
            method: 'DELETE',
          })
          if (response.ok) {
            invalidateEntityCache('finanzen')
            invalidateEntityCache('wohnungen')
            toast({
              title: 'Erfolg',
              description: 'Finanzeintrag wurde gelöscht.',
            })
            refreshSearchResults()
          } else {
            throw new Error('Fehler beim Löschen')
          }
        } catch (error) {
          console.error('Error deleting finance record:', error)
          toast({
            title: 'Fehler',
            description: 'Finanzeintrag konnte nicht gelöscht werden.',
            variant: 'destructive',
          })
        }
      }
    })
  }

  const handleToggleTaskCompletion = async (result: SearchResult) => {
    const isCompleted = result.metadata?.completed
    try {
      const response = await fetch(`/api/todos/${result.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ist_erledigt: !isCompleted
        })
      })

      if (response.ok) {
        invalidateEntityCache('todos')
        toast({
          title: 'Erfolg',
          description: `Aufgabe wurde als ${!isCompleted ? 'erledigt' : 'offen'} markiert.`,
        })
        refreshSearchResults()
      } else {
        throw new Error('Fehler beim Aktualisieren')
      }
    } catch (error) {
      console.error('Error toggling task completion:', error)
      toast({
        title: 'Fehler',
        description: 'Aufgabe konnte nicht aktualisiert werden.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTask = (result: SearchResult) => {
    useModalStore.getState().openConfirmationModal({
      title: 'Aufgabe löschen',
      description: `Möchten Sie die Aufgabe "${result.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/todos/${result.id}`, {
            method: 'DELETE',
          })
          if (response.ok) {
            invalidateEntityCache('todos')
            toast({
              title: 'Erfolg',
              description: 'Aufgabe wurde gelöscht.',
            })
            refreshSearchResults()
          } else {
            throw new Error('Fehler beim Löschen')
          }
        } catch (error) {
          console.error('Error deleting task:', error)
          toast({
            title: 'Fehler',
            description: 'Aufgabe konnte nicht gelöscht werden.',
            variant: 'destructive',
          })
        }
      }
    })
  }

  const handleSearchResultAction = (result: SearchResult, actionIndex: number) => {
    const action = result.actions?.[actionIndex]
    if (!action) return

    switch (result.type) {
      case 'tenant':
        if (action.label === 'Bearbeiten') handleEditTenant(result.id, result)
        break
      case 'house':
        if (action.label === 'Bearbeiten') handleEditHouse(result.id, result)
        break
      case 'apartment':
        if (action.label === 'Bearbeiten') handleEditApartment(result.id, result)
        break
      case 'finance':
        if (action.label === 'Bearbeiten') {
          handleEditFinance(result.id, result)
        } else if (action.label === 'Löschen') {
          handleDeleteFinanceRecord(result)
        }
        break
      case 'task':
        if (action.label === 'Bearbeiten') {
          handleEditTask(result.id, result)
        } else if (action.label.includes('markieren')) {
          handleToggleTaskCompletion(result)
        } else if (action.label === 'Löschen') {
          handleDeleteTask(result)
        }
        break
      default:
        break
    }
  }

  // Filter results client-side based on the selectedCategory button
  const filteredResults = results.filter(item => {
    if (selectedCategory === "all") return true
    if (selectedCategory === "tenants") return item.type === "tenant"
    if (selectedCategory === "houses") return item.type === "house"
    if (selectedCategory === "apartments") return item.type === "apartment"
    if (selectedCategory === "finances") return item.type === "finance"
    if (selectedCategory === "tasks") return item.type === "task"
    return true
  })

  const getIcon = (type: string) => {
    switch (type) {
      case "tenant": return Users
      case "house": return Building2
      case "apartment": return Home
      case "finance": return Wallet
      case "task": return CheckSquare
      default: return Search
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "tenant": return "Mieter"
      case "house": return "Haus"
      case "apartment": return "Wohnung"
      case "finance": return "Finanzen"
      case "task": return "Aufgabe"
      default: return "Eintrag"
    }
  }

  const getTypeBadgeStyles = (type: string) => {
    switch (type) {
      case "tenant": 
        return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-150/40 dark:border-indigo-900/30"
      case "house": 
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-150/40 dark:border-amber-900/30"
      case "apartment": 
        return "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-150/40 dark:border-sky-900/30"
      case "finance": 
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-150/40 dark:border-emerald-900/30"
      case "task": 
        return "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-150/40 dark:border-rose-900/30"
      default: 
        return "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
    }
  }

  const getLink = (item: { type: string }) => {
    switch (item.type) {
      case "tenant": return "/mieter"
      case "house": return "/haeuser"
      case "apartment": return "/wohnungen"
      case "finance": return "/finanzen"
      case "task": return "/todos"
      default: return "/dashboard"
    }
  }

  const categories = useMemo(() => {
    const counts = results.reduce((acc, r) => {
      const type = r.type as string;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { id: "all", label: "Alle", count: results.length },
      { id: "tenants", label: "Mieter", count: counts["tenant"] || 0 },
      { id: "houses", label: "Häuser", count: counts["house"] || 0 },
      { id: "apartments", label: "Wohnungen", count: counts["apartment"] || 0 },
      { id: "finances", label: "Finanzen", count: counts["finance"] || 0 },
      { id: "tasks", label: "Aufgaben", count: counts["task"] || 0 },
    ];
  }, [results]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] w-full bg-zinc-50/30 dark:bg-zinc-950/10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden select-none relative">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 size-96 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 size-80 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
      
      <div className="flex-1 flex flex-col w-full relative z-10">
        {/* Main section that animates padding/layout to shift position */}
        <motion.div 
          layout
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
          className={cn(
            "w-full flex flex-col items-center px-6 md:px-12 transition-all duration-300",
            hasQuery ? "pt-8 md:pt-12 pb-4" : "pt-[25vh] pb-10"
          )}
        >
          <motion.div 
            layout="position"
            className="w-full max-w-2xl flex flex-col gap-4"
          >
            {/* Search Box */}
            <div className="relative flex items-center group w-full">
              <div className="absolute left-5 text-zinc-400 group-focus-within:text-accent transition-colors duration-300">
                <Search className="size-5.5 group-focus-within:scale-105 transition-transform duration-300" />
              </div>
              <input
                id="global-search-input"
                type="text"
                autoFocus
                placeholder="Mieter, Haus, Betrag, Wohnung oder Stichwort suchen..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(
                  "w-full h-15 pl-13 pr-24 text-sm sm:text-base font-semibold rounded-2xl bg-white dark:bg-zinc-900/60",
                  "border border-zinc-200 dark:border-zinc-800/80 shadow-md",
                  "focus:shadow-lg focus:shadow-accent/5 dark:focus:shadow-none focus:ring-4 focus:ring-accent/10 focus:border-accent/40 focus:outline-none",
                  "transition-all duration-300"
                )}
              />
              
              <div className="absolute right-4 flex items-center gap-2">
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Suche löschen"
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer"
                  >
                    <X className="size-4.5" />
                  </button>
                )}
                {query && !isLoading && (
                  <span className="hidden sm:inline-block text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-550 dark:text-zinc-400 px-2 py-1 rounded-md shrink-0 select-none">
                    {filteredResults.length} {filteredResults.length === 1 ? "Treffer" : "Treffer"}
                  </span>
                )}
              </div>
            </div>

            {/* Inline Category Pills when query exists */}
            <AnimatePresence>
              {hasQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-97 select-none border",
                        selectedCategory === cat.id
                          ? "bg-accent text-white shadow-xs border-accent"
                          : "bg-white/40 dark:bg-zinc-900/40 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 border-zinc-250/60 dark:border-zinc-800/80"
                      )}
                    >
                      <span>{cat.label}</span>
                      {cat.count > 0 && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[9px] font-extrabold",
                          selectedCategory === cat.id 
                            ? "bg-white/20 text-white" 
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        )}>
                          {cat.count}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggestions helper tags */}
            <AnimatePresence>
              {hasQuery && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-semibold"
                >
                  <span className="flex items-center gap-1 font-bold text-zinc-400 dark:text-zinc-500">
                    <TrendingUp className="size-3.5 text-accent" /> Vorschläge:
                  </span>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion)
                        addToRecentSearches(suggestion)
                      }}
                      className="px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 hover:border-accent/40 hover:text-accent dark:hover:text-accent transition-all duration-200 cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clean Recent Searches dropdown under input ONLY when query is empty and recentSearches exists */}
            {!hasQuery && recentSearches.length > 0 && (
              <div className="flex flex-col gap-2 mt-2 w-full">
                <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 px-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <History className="size-3" /> Letzte Suchanfragen
                  </h3>
                </div>
                <div className="flex flex-col border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xs shadow-xs">
                  {recentSearches.map((search, index) => (
                    <button
                      key={search}
                      type="button"
                      onClick={() => {
                        setQuery(search)
                        addToRecentSearches(search)
                      }}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 text-left font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-355 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group",
                        index !== recentSearches.length - 1 && "border-b border-zinc-100 dark:border-zinc-850/50"
                      )}
                    >
                      <span className="truncate group-hover:text-zinc-950 dark:group-hover:text-zinc-50 transition-colors">{search}</span>
                      <ChevronRight className="size-4 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Results Container (Only rendered when query exists) */}
        <AnimatePresence mode="wait">
          {hasQuery && (
            <motion.main
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.1 }}
              className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto px-6 md:px-12 pb-10 min-h-0 custom-scrollbar"
            >
              <AnimatePresence mode="wait">
                {/* Offline Panel */}
                {isOffline ? (
                  <motion.div
                    key="offline"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="flex flex-col items-center justify-center py-16 text-center gap-4 max-w-sm mx-auto"
                  >
                    <div className="p-4.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shadow-inner">
                      <WifiOff className="size-8" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Offline</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                      Keine aktive Internetverbindung. Bitte überprüfe Deine Netzwerk-Einstellungen und versuche es erneut.
                    </p>
                    <button
                      type="button"
                      onClick={retry}
                      className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
                    >
                      Erneut verbinden
                    </button>
                  </motion.div>
                  
                ) : error ? (
                  
                  /* Error Panel */
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center gap-4 max-w-sm mx-auto"
                  >
                    <div className="p-4.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                      <AlertCircle className="size-8" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Fehler aufgetreten</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{error}</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
                    >
                      Suche wiederholen
                    </button>
                  </motion.div>
                  
                ) : isLoading ? (
                  
                  /* Loading Skeletons */
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 dark:text-zinc-500 font-semibold px-2 mb-1">
                      <Loader2 className="size-4 animate-spin text-accent" />
                      <span>Mietevo-Datenbank wird durchsucht...</span>
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-20 w-full bg-white dark:bg-[#181818]/60 border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl animate-pulse" />
                    ))}
                  </motion.div>
                  
                ) : filteredResults.length === 0 ? (
                  
                  /* No Results Panel */
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-sm mx-auto"
                  >
                    <div className="p-4.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40">
                      <Search className="size-8 text-zinc-400/80" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Keine Ergebnisse gefunden</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-medium">
                      Für &quot;{query}&quot; konnte kein passender Eintrag in dieser Kategorie gefunden werden. Überprüfe Deine Filter.
                    </p>
                  </motion.div>
                  
                ) : (
                  
                  /* Results Display Stream */
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-3"
                  >
                    {/* Search Performance Indicators */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 dark:text-zinc-500 px-2.5 mb-1 select-none">
                      <span>ERGEBNISSE ({filteredResults.length})</span>
                      {executionTime > 0 && (
                        <span className="bg-zinc-150/40 dark:bg-zinc-900 px-2 py-0.5 rounded-full font-mono text-[10px]">
                          Gefunden in {(executionTime * 1000).toFixed(0)} ms
                        </span>
                      )}
                    </div>

                    {filteredResults.map((item) => {
                      const ItemIcon = getIcon(item.type)
                      const badgeClasses = getTypeBadgeStyles(item.type)
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group"
                        >
                          <Link href={getLink(item)}>
                            <Card className={cn(
                              "bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xs border border-zinc-200/60 dark:border-zinc-800/55 shadow-2xs rounded-2xl relative",
                              "hover:shadow-md hover:border-accent/30 dark:hover:border-accent/30 hover:bg-white dark:hover:bg-zinc-900 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden"
                            )}>
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {/* Icon Indicator */}
                                  <div className="p-3 bg-zinc-50 dark:bg-zinc-850/80 rounded-xl text-zinc-400 dark:text-zinc-500 group-hover:text-accent group-hover:bg-accent/5 transition-all duration-300 shrink-0">
                                    <ItemIcon className="size-5 transition-transform duration-300 group-hover:scale-105" />
                                  </div>

                                  {/* Main Information */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm md:text-base truncate group-hover:text-accent transition-colors duration-200">
                                        {item.title}
                                      </span>
                                      {item.subtitle && (
                                        <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 truncate max-w-[12rem] sm:max-w-none">
                                          {item.subtitle}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-455 font-semibold">
                                      <span className={cn(
                                        "px-2 py-0.5 border rounded-md text-[9px] uppercase tracking-wider font-extrabold",
                                        badgeClasses
                                      )}>
                                        {getTypeLabel(item.type)}
                                      </span>
                                      {item.context && (
                                        <span className="truncate max-w-[15rem] md:max-w-sm">
                                          {item.context}
                                        </span>
                                      )}
                                      {item.type === "house" && item.metadata?.address && (
                                        <span className="truncate max-w-[15rem] md:max-w-sm text-zinc-450">
                                          {item.metadata.address}
                                        </span>
                                      )}
                                      {item.type === "apartment" && item.metadata?.house_name && (
                                        <span className="truncate max-w-[15rem] md:max-w-sm text-zinc-450">
                                          {item.metadata.house_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Specific metadata / pricing tag displayed on right */}
                                  <div className="text-right shrink-0">
                                    {item.type === "finance" && item.metadata?.amount && (
                                      <span className={cn(
                                        "px-2.5 py-1 rounded-xl text-xs font-bold shadow-3xs",
                                        item.metadata.type === "income"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                      )}>
                                        {item.metadata.type === "income" ? "+" : "-"}{item.metadata.amount} €
                                      </span>
                                    )}
                                    {item.type === "apartment" && item.metadata?.rent && (
                                      <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                                        {item.metadata.rent} €
                                      </span>
                                    )}
                                    {item.type === "house" && item.metadata?.apartment_count && (
                                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-850 px-2 py-1 rounded-lg border border-zinc-200/20">
                                        {item.metadata.apartment_count} Einheiten
                                      </span>
                                    )}
                                    {item.type === "tenant" && item.metadata?.status && (
                                      <span className={cn(
                                        "text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                        item.metadata.status === "active" 
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                          : "bg-zinc-100/80 dark:bg-zinc-850 text-zinc-450 border-zinc-200/30"
                                      )}>
                                        {item.metadata.status === "active" ? "Aktiv" : "Inaktiv"}
                                      </span>
                                    )}
                                    {item.type === "task" && item.metadata?.due_date && (
                                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-850 px-2 py-0.5 rounded-md border border-zinc-200/20">
                                        Fällig {new Date(item.metadata.due_date).toLocaleDateString('de-DE')}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Actions Section */}
                                  {item.actions && item.actions.length > 0 && (
                                    <div 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="relative z-20 shrink-0 ml-2"
                                    >
                                      <ActionMenu
                                        actions={item.actions.map((action, index) => ({
                                          id: `action-${item.id}-${index}`,
                                          icon: action.icon,
                                          label: action.label,
                                          onClick: () => handleSearchResultAction(item as any, index),
                                          variant: action.variant || 'default',
                                        }))}
                                        shape="pill"
                                        visibility="always"
                                        stopPropagation={true}
                                      />
                                    </div>
                                  )}

                                  {/* Hover Arrow (shown if no actions) */}
                                  {(!item.actions || item.actions.length === 0) && (
                                    <div className="hidden sm:block text-zinc-300 dark:text-zinc-700 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 pl-1 shrink-0">
                                      <ChevronRight className="size-5" />
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
