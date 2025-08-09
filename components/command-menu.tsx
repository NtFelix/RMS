"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import React from "react"
import { SearchErrorBoundary } from "@/components/search-error-boundary"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, LayoutDashboard, CreditCard } from "lucide-react"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { useSearch } from "@/hooks/use-search"
import { useSearchModalIntegration } from "@/hooks/use-search-modal-integration"
import { SearchEmptyState } from "@/components/search-loading-states"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { SearchResult } from "@/types/search"
import { SearchErrorBoundary } from "@/components/search-error-boundary"
import {
  getUserSubscriptionContext,
  getPlanApartmentLimit,
  getUserApartmentCount,
} from "@/app/user-actions"

// Stelle sicher, dass der Mieter-Link im Command-Menü korrekt ist
const navigationItems = [
  {
    title: "Startseite",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Dashboard",
    href: "/home",
    icon: BarChart3,
  },
  {
    title: "Häuser",
    href: "/haeuser",
    icon: Building2,
  },
  {
    title: "Mieter",
    href: "/mieter",
    icon: Users,
  },
  {
    title: "Wohnungen",
    href: "/wohnungen",
    icon: Home,
  },
  {
    title: "Finanzen",
    href: "/finanzen",
    icon: Wallet,
  },
  {
    title: "Betriebskosten",
    href: "/betriebskosten",
    icon: FileSpreadsheet,
  },
  {
    title: "Aufgaben",
    href: "/todos",
    icon: CheckSquare,
  },
]

export function CommandMenu() {
  const router = useRouter()
  const { open, setOpen } = useCommandMenu()
  const [isLoadingWohnungContext, setIsLoadingWohnungContext] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false)
  
  // Search functionality with enhanced error handling
  const {
    query,
    setQuery,
    results,
    isLoading: isSearchLoading,
    error: searchError,
    totalCount,
    executionTime,
    clearSearch,
    retry: retrySearch,
    retryCount,
    isOffline,
    lastSuccessfulQuery
  } = useSearch({
    debounceMs: 300,
    limit: 5
  })

  // Determine if we should show search results or navigation
  const showSearchResults = query.trim().length > 0
  const hasSearchResults = results.length > 0

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
      // Clear search when Escape is pressed and there's a query
      if (e.key === "Escape" && query.trim().length > 0) {
        e.preventDefault()
        clearSearch()
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen, open, query, clearSearch])

  // Clear search when menu is closed
  useEffect(() => {
    if (!open && query.trim().length > 0) {
      clearSearch()
    }
  }, [open, query, clearSearch])

  // Centralized function to refresh search results after modal actions
  const refreshSearchResults = useCallback(() => {
    if (query.trim()) {
      const currentQuery = query
      clearSearch()
      setTimeout(() => setQuery(currentQuery), 100)
    }
  }, [query, clearSearch, setQuery])

  // Function to invalidate entity cache
  const invalidateEntityCache = useCallback((entityType?: string) => {
    if (entityType) {
      delete entityCache.current[entityType]
    } else {
      // Clear all cache
      entityCache.current = {}
    }
  }, [])

  // Integrate search with modal operations
  useSearchModalIntegration({
    onEntityUpdated: (entityType, entityName) => {
      // Refresh search results when entity is updated through modal
      refreshSearchResults()
      
      // Show success toast if not already shown by modal
      if (query.trim()) {
        toast({
          title: 'Suche aktualisiert',
          description: `${entityName} wurde aktualisiert. Suchergebnisse wurden aktualisiert.`,
        })
      }
    },
    onCacheInvalidate: (entityType) => {
      // Invalidate cache when entity is updated
      invalidateEntityCache(entityType)
      
      // Also invalidate related entity caches
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

  // Centralized function to create onSuccess callbacks for modals
  const createModalSuccessCallback = useCallback((entityName: string, entityType?: string) => {
    return (updatedData?: any) => {
      // Invalidate cache for the specific entity type and related entities
      if (entityType) {
        invalidateEntityCache(entityType)
        
        // Invalidate related entity caches based on relationships
        switch (entityType) {
          case 'mieter':
            // When tenant is updated, also invalidate apartments cache
            invalidateEntityCache('wohnungen')
            break
          case 'wohnungen':
            // When apartment is updated, also invalidate tenants and houses cache
            invalidateEntityCache('mieter')
            invalidateEntityCache('haeuser')
            break
          case 'haeuser':
            // When house is updated, also invalidate apartments cache
            invalidateEntityCache('wohnungen')
            break
          case 'finanzen':
            // Finance updates might affect apartment data
            invalidateEntityCache('wohnungen')
            break
        }
      } else {
        // If no specific entity type, clear all cache
        entityCache.current = {}
      }
      
      // Refresh search results to show updated data
      refreshSearchResults()
      
      // Show success message
      toast({
        title: 'Erfolg',
        description: `${entityName} wurde erfolgreich aktualisiert.`,
      })
      
      // If we're on the relevant page, trigger a page refresh for immediate UI update
      const currentPath = window.location.pathname
      const shouldRefreshPage = (
        (entityType === 'mieter' && currentPath === '/mieter') ||
        (entityType === 'haeuser' && currentPath === '/haeuser') ||
        (entityType === 'wohnungen' && currentPath === '/wohnungen') ||
        (entityType === 'finanzen' && currentPath === '/finanzen') ||
        (entityType === 'todos' && currentPath === '/todos')
      )
      
      if (shouldRefreshPage) {
        // Use a small delay to allow modal to close first
        setTimeout(() => {
          window.location.reload()
        }, 300)
      }
    }
  }, [refreshSearchResults, invalidateEntityCache])

  // Centralized entity fetcher with caching
  const entityCache = useRef<Record<string, { data: any[], timestamp: number }>>({})
  const ENTITY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  const fetchEntityData = useCallback(async (entityType: string, forceRefresh = false) => {
    const cacheKey = entityType
    const cached = entityCache.current[cacheKey]
    
    // Return cached data if it's still valid and not forcing refresh
    if (!forceRefresh && cached && Date.now() - cached.timestamp < ENTITY_CACHE_DURATION) {
      return cached.data
    }

    try {
      const response = await fetch(`/api/${entityType}`)
      if (!response.ok) throw new Error(`Failed to fetch ${entityType}`)
      
      const data = await response.json()
      
      // Cache the data
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

  // Handle search result selection (main click)
  const handleSearchResultSelect = (result: SearchResult) => {
    setOpen(false)
    
    // Navigate to the appropriate page based on result type
    switch (result.type) {
      case 'tenant':
        router.push('/mieter')
        break
      case 'house':
        router.push('/haeuser')
        break
      case 'apartment':
        router.push('/wohnungen')
        break
      case 'finance':
        router.push('/finanzen')
        break
      case 'task':
        router.push('/todos')
        break
      default:
        break
    }
  }

  // Handle search result actions (edit, view, delete, etc.)
  const handleSearchResultAction = (result: SearchResult, actionIndex: number) => {
    const action = result.actions?.[actionIndex]
    if (!action) return

    setOpen(false)
    
    // Handle actions based on result type and action label
    switch (result.type) {
      case 'tenant':
        if (action.label === 'Bearbeiten') {
          handleEditTenant(result.id, result)
        } else if (action.label === 'Anzeigen') {
          router.push('/mieter')
        }
        break
        
      case 'house':
        if (action.label === 'Bearbeiten') {
          handleEditHouse(result.id, result)
        } else if (action.label === 'Anzeigen') {
          router.push('/haeuser')
        }
        break
        
      case 'apartment':
        if (action.label === 'Bearbeiten') {
          handleEditApartment(result.id, result)
        } else if (action.label === 'Anzeigen') {
          router.push('/wohnungen')
        }
        break
        
      case 'finance':
        if (action.label === 'Bearbeiten') {
          handleEditFinance(result.id, result)
        } else if (action.label === 'Anzeigen') {
          router.push('/finanzen')
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

  // Helper functions to fetch full entity data and open modals with search context
  const handleEditTenant = async (tenantId: string, searchResult?: SearchResult) => {
    try {
      const [tenants, wohnungen] = await Promise.all([
        fetchEntityData('mieter'),
        fetchEntityData('wohnungen')
      ])
      
      const tenant = tenants.find((t: any) => t.id === tenantId)
      
      if (tenant) {
        // Add search context to the modal data if available
        const tenantWithContext = searchResult ? {
          ...tenant,
          _searchContext: {
            query,
            resultType: searchResult.type,
            resultTitle: searchResult.title
          }
        } : tenant
        
        useModalStore.getState().openTenantModal(tenantWithContext, wohnungen)
        
        // Success handling is done through the useSearchModalIntegration hook
      } else {
        toast({
          title: 'Fehler',
          description: 'Mieter nicht gefunden.',
          variant: 'destructive',
        })
      }
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
      const houses = await fetchEntityData('haeuser')
      const house = houses.find((h: any) => h.id === houseId)
      
      if (house) {
        const onSuccess = createModalSuccessCallback('Haus', 'haeuser')
        
        // Add search context to the modal data if available
        const houseWithContext = searchResult ? {
          ...house,
          _searchContext: {
            query,
            resultType: searchResult.type,
            resultTitle: searchResult.title
          }
        } : house
        
        useModalStore.getState().openHouseModal(houseWithContext, onSuccess)
      } else {
        toast({
          title: 'Fehler',
          description: 'Haus nicht gefunden.',
          variant: 'destructive',
        })
      }
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
        
        // Add search context to the modal data if available
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
          onSuccess,
          undefined, // apartmentCount
          undefined, // apartmentLimit
          undefined  // isActiveSubscription
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
        
        // Add search context to the modal data if available
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
        
        // Add search context to the modal data if available
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

  // Helper function to handle finance record deletion
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
            // Invalidate finance cache and related caches
            invalidateEntityCache('finanzen')
            invalidateEntityCache('wohnungen')
            
            toast({
              title: 'Erfolg',
              description: 'Finanzeintrag wurde gelöscht.',
            })
            
            // Refresh search results if we have an active query
            refreshSearchResults()
            
            // Refresh the current page if we're on the finance page
            if (window.location.pathname === '/finanzen') {
              setTimeout(() => {
                window.location.reload()
              }, 300)
            }
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

  // Helper function to handle task completion toggle
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
        // Invalidate tasks cache
        invalidateEntityCache('todos')
        
        toast({
          title: 'Erfolg',
          description: `Aufgabe wurde als ${!isCompleted ? 'erledigt' : 'offen'} markiert.`,
        })
        
        // Refresh search results if we have an active query
        refreshSearchResults()
        
        // Refresh the current page if we're on the tasks page
        if (window.location.pathname === '/todos') {
          setTimeout(() => {
            window.location.reload()
          }, 300)
        }
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

  // Helper function to handle task deletion
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
            // Invalidate tasks cache
            invalidateEntityCache('todos')
            
            toast({
              title: 'Erfolg',
              description: 'Aufgabe wurde gelöscht.',
            })
            
            // Refresh search results if we have an active query
            refreshSearchResults()
            
            // Refresh the current page if we're on the tasks page
            if (window.location.pathname === '/todos') {
              setTimeout(() => {
                window.location.reload()
              }, 300)
            }
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

  const handleManageSubscription = async () => {
    setIsLoadingSubscription(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create customer portal session: ${response.status} ${response.statusText}`);
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      toast({
        title: 'Error',
        description: 'Could not open subscription management. Please try again later.',
        variant: 'destructive',
      });
      setOpen(false); // Close the menu only on error
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  // Group search results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <SearchErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Search component error:', error, errorInfo)
        toast({
          title: 'Suchfehler',
          description: 'Bei der Suche ist ein unerwarteter Fehler aufgetreten.',
          variant: 'destructive',
        })
      }}
    >
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Suchen Sie nach Mietern, Häusern, Wohnungen..."
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          {/* Loading */}
          {showSearchResults && isSearchLoading && (
            <CommandEmpty>Lade Ergebnisse …</CommandEmpty>
          )}

          {/* Error */}
          {showSearchResults && !isSearchLoading && searchError && (
            <CommandEmpty>
              <SearchEmptyState
                query={query}
                hasError
                isOffline={isOffline}
                onRetry={retrySearch}
                suggestions={lastSuccessfulQuery ? [lastSuccessfulQuery] : []}
              />
            </CommandEmpty>
          )}

          {/* No Results */}
          {showSearchResults && !isSearchLoading && !searchError && !hasSearchResults && (
            <CommandEmpty>
              <SearchEmptyState
                query={query}
                hasError={false}
                isOffline={isOffline}
                suggestions={['Mieter', 'Wohnung', 'Haus', 'Rechnung']}
              />
            </CommandEmpty>
          )}

          {/* Results */}
          {showSearchResults && !isSearchLoading && !searchError && hasSearchResults && (() => {
            const tenants = results.filter(r => r.type === "tenant");
            const houses = results.filter(r => r.type === "house");
            const apartments = results.filter(r => r.type === "apartment");
            const finances = results.filter(r => r.type === "finance");
            const tasks = results.filter(r => r.type === "task");
            return (
              <>
                {tenants.length > 0 && (
                  <CommandGroup heading={`Mieter (${tenants.length})`}>
                    {tenants.map(r => (
                      <CommandItem
                        key={`tenant:${r.id}`}
                        onSelect={() => handleSearchResultSelect(r)}
                        className="group flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{r.title}</div>
                          {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                          {r.context && <div className="text-xs text-muted-foreground/80 truncate">{r.context}</div>}
                        </div>
                        {r.actions?.length ? (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity">
                            {r.actions.slice(0, 2).map((a, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSearchResultAction(r, idx);
                                }}
                              >
                                {React.createElement(a.icon, { className: "h-3 w-3" })}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {houses.length > 0 && (
                  <CommandGroup heading={`Häuser (${houses.length})`}>
                    {houses.map(r => (
                      <CommandItem
                        key={`house:${r.id}`}
                        onSelect={() => handleSearchResultSelect(r)}
                        className="group flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{r.title}</div>
                          {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                          {r.context && <div className="text-xs text-muted-foreground/80 truncate">{r.context}</div>}
                        </div>
                        {r.actions?.length ? (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity">
                            {r.actions.slice(0, 2).map((a, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSearchResultAction(r, idx);
                                }}
                              >
                                {React.createElement(a.icon, { className: "h-3 w-3" })}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {apartments.length > 0 && (
                  <CommandGroup heading={`Wohnungen (${apartments.length})`}>
                    {apartments.map(r => (
                      <CommandItem
                        key={`apartment:${r.id}`}
                        onSelect={() => handleSearchResultSelect(r)}
                        className="group flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{r.title}</div>
                          {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                          {r.context && <div className="text-xs text-muted-foreground/80 truncate">{r.context}</div>}
                        </div>
                        {r.actions?.length ? (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity">
                            {r.actions.slice(0, 2).map((a, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSearchResultAction(r, idx);
                                }}
                              >
                                {React.createElement(a.icon, { className: "h-3 w-3" })}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {finances.length > 0 && (
                  <CommandGroup heading={`Finanzen (${finances.length})`}>
                    {finances.map(r => (
                      <CommandItem
                        key={`finance:${r.id}`}
                        onSelect={() => handleSearchResultSelect(r)}
                        className="group flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{r.title}</div>
                          {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                          {r.context && <div className="text-xs text-muted-foreground/80 truncate">{r.context}</div>}
                        </div>
                        {r.actions?.length ? (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity">
                            {r.actions.slice(0, 2).map((a, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSearchResultAction(r, idx);
                                }}
                              >
                                {React.createElement(a.icon, { className: "h-3 w-3" })}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {tasks.length > 0 && (
                  <CommandGroup heading={`Aufgaben (${tasks.length})`}>
                    {tasks.map(r => (
                      <CommandItem
                        key={`task:${r.id}`}
                        onSelect={() => handleSearchResultSelect(r)}
                        className="group flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{r.title}</div>
                          {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                          {r.context && <div className="text-xs text-muted-foreground/80 truncate">{r.context}</div>}
                        </div>
                        {r.actions?.length ? (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity">
                            {r.actions.slice(0, 2).map((a, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSearchResultAction(r, idx);
                                }}
                              >
                                {React.createElement(a.icon, { className: "h-3 w-3" })}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            );
          })()}

          {/* Navigation and Actions (shown when not searching) */}
          {!showSearchResults && (
            <>
              <CommandEmpty>Keine Befehle gefunden.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => {
                      router.push(item.href)
                      setOpen(false)
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Aktionen">
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    useModalStore.getState().openTenantModal()
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Mieter hinzufügen
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    useModalStore.getState().openHouseModal()
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Haus hinzufügen
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    useModalStore.getState().openFinanceModal()
                  }}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Rechnung erstellen
                </CommandItem>
                <CommandItem
                  disabled={isLoadingWohnungContext}
                  onSelect={async () => {
                    setIsLoadingWohnungContext(true)
                    toast({ title: "Lade...", description: "Wohnungslimit wird geprüft." })

                    let apartmentLimit: number | typeof Infinity | undefined = undefined
                    let isActiveSubscription: boolean | undefined = undefined
                    let apartmentCount: number | undefined = undefined

                    try {
                      const subContext = await getUserSubscriptionContext()

                      if (subContext.error || !subContext.stripe_price_id || !subContext.stripe_subscription_status) {
                        isActiveSubscription = false
                        toast({
                          title: "Fehler",
                          description: "Abonnementdetails konnten nicht vollständig geladen werden. Modal wird geöffnet.",
                          variant: "destructive",
                        })
                      } else {
                        isActiveSubscription = subContext.stripe_subscription_status === "active"
                        if (isActiveSubscription && subContext.stripe_price_id) {
                          const limitResult = await getPlanApartmentLimit(subContext.stripe_price_id)
                          if (limitResult.error || limitResult.limitWohnungen === undefined || limitResult.limitWohnungen === null) {
                            apartmentLimit = undefined
                            toast({
                              title: "Fehler",
                              description: "Wohnungslimit konnte nicht geladen werden.",
                              variant: "destructive",
                            })
                          } else {
                            apartmentLimit = limitResult.limitWohnungen
                          }
                        }
                      }

                      const countResult = await getUserApartmentCount()
                      if (countResult.error || countResult.count === undefined) {
                        apartmentCount = undefined
                        toast({
                          title: "Fehler",
                          description: "Aktuelle Wohnungsanzahl konnte nicht geladen werden.",
                          variant: "destructive",
                        })
                      } else {
                        apartmentCount = countResult.count
                      }
                    } catch (e) {
                      console.error("Error in Wohnung hinzufügen onSelect:", e)
                      toast({
                        title: "Unerwarteter Fehler",
                        description: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
                        variant: "destructive",
                      })
                    } finally {
                      setOpen(false)
                      useModalStore
                        .getState()
                        .openWohnungModal(undefined, [], undefined, apartmentCount, apartmentLimit, isActiveSubscription)
                      setIsLoadingWohnungContext(false)
                    }
                  }}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Wohnung hinzufügen
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    useModalStore.getState().openAufgabeModal()
                  }}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Aufgabe hinzufügen
                </CommandItem>
                <CommandItem
                  onSelect={handleManageSubscription}
                  disabled={isLoadingSubscription}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isLoadingSubscription ? 'Lade...' : 'Abonnement verwalten'}
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
    </CommandDialog>
    </SearchErrorBoundary>
  )
}
