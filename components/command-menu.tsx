"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSearchStore } from "@/hooks/use-search-store"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, LayoutDashboard, CreditCard, Search, Loader2, AlertCircle, Folder } from "lucide-react"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { useSearch } from "@/hooks/use-search"
import { useSearchModalIntegration } from "@/hooks/use-search-modal-integration"
import { SearchResultGroup } from "@/components/search-result-group"
import { SearchErrorBoundary } from "@/components/search-error-boundary"
import {
  SearchLoadingIndicator,
  SearchEmptyState,
  SearchStatusBar,
  NetworkStatusIndicator
} from "@/components/search-loading-states"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { SearchResult } from "@/types/search"

const GLOBAL_SEARCH_RESULT_LIMIT = 15;

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
  {
    title: "Cloud Storage",
    href: "/dateien",
    icon: Folder,
  },
]

export function CommandMenu() {
  const router = useRouter()
  const { open, setOpen } = useCommandMenu()
  const [isLoadingWohnungContext, setIsLoadingWohnungContext] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    lastSuccessfulQuery,
    suggestions,
    recentSearches,
    addToRecentSearches
  } = useSearch({
    debounceMs: 300,
    limit: GLOBAL_SEARCH_RESULT_LIMIT
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
      // Quick search shortcuts when menu is open
      if (open && !query.trim()) {
        if (e.key === "m" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          setQuery("M-")
        }
        if (e.key === "h" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          setQuery("H-")
        }
        if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          setQuery("T-")
        }
        if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          setQuery("F-")
        }
        if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          setQuery("W-")
        }
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen, open, query, clearSearch, setQuery])

  // Auto-focus input when command menu opens and clear search when closed
  useEffect(() => {
    if (open) {
      // Auto-focus the input when command menu opens
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus()
          // Set cursor to end if there's existing text
          const len = inputRef.current.value.length
          inputRef.current.setSelectionRange(len, len)
        }
      }

      // Try focusing immediately and again after the next frame to handle race conditions
      focusInput()
      requestAnimationFrame(focusInput)

      // Also try after a short delay to ensure the dialog is fully rendered
      setTimeout(focusInput, 50)
    } else if (query.trim().length > 0) {
      // Clear search when menu is closed
      clearSearch()
    }
  }, [open, query, clearSearch])

  // Extracted handler: open Add Apartment modal with subscription checks
  const handleAddApartment = useCallback(async () => {
    setIsLoadingWohnungContext(true)
    toast({ title: "Lade...", description: "Wohnungslimit wird geprüft." })

    let apartmentLimit: number | typeof Infinity | undefined = undefined
    let isActiveSubscription: boolean | undefined = undefined
    let apartmentCount: number | undefined = undefined

    try {
      const subContext = await getUserSubscriptionContext()

      if (
        subContext.error ||
        !subContext.stripe_price_id ||
        !subContext.stripe_subscription_status
      ) {
        isActiveSubscription = false
        toast({
          title: "Fehler",
          description:
            "Abonnementdetails konnten nicht vollständig geladen werden. Modal wird geöffnet.",
          variant: "destructive",
        })
      } else {
        isActiveSubscription = subContext.stripe_subscription_status === "active"
        if (isActiveSubscription && subContext.stripe_price_id) {
          const limitResult = await getPlanApartmentLimit(subContext.stripe_price_id)
          if (
            limitResult.error ||
            limitResult.limitWohnungen === undefined ||
            limitResult.limitWohnungen === null
          ) {
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
        description:
          "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setOpen(false)
      useModalStore
        .getState()
        .openWohnungModal(
          undefined,
          [],
          undefined,
          apartmentCount,
          apartmentLimit,
          isActiveSubscription
        )
      setIsLoadingWohnungContext(false)
    }
  }, [setOpen])

  // Get the current query from the store
  const storeQuery = useSearchStore((state) => state.query);

  // Update local query when store query changes
  useEffect(() => {
    if (storeQuery && storeQuery !== query) {
      setQuery(storeQuery);
      // Focus the search input after updating the query
      const searchInput = document.querySelector('input[cmdk-input]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [storeQuery, query, setQuery]);

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
      // First fetch the specific tenant directly by ID
      const tenantResponse = await fetch(`/api/mieter/${tenantId}`);
      if (!tenantResponse.ok) throw new Error('Tenant not found');
      const tenant = await tenantResponse.json();

      // Only fetch wohnungen if we need them for the modal
      const wohnungen = await fetchEntityData('wohnungen');

      // Add search context to the modal data if available
      const tenantWithContext = searchResult ? {
        ...tenant,
        _searchContext: {
          query,
          resultType: searchResult.type,
          resultTitle: searchResult.title
        }
      } : tenant;

      useModalStore.getState().openTenantModal(tenantWithContext, wohnungen);

      // Success handling is done through the useSearchModalIntegration hook
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
      // Fetch only the specific house by ID
      const response = await fetch(`/api/haeuser/${houseId}`);
      if (!response.ok) throw new Error('House not found');
      const house = await response.json();

      const onSuccess = createModalSuccessCallback('Haus', 'haeuser');

      // Add search context to the modal data if available
      const houseWithContext = searchResult ? {
        ...house,
        _searchContext: {
          query,
          resultType: searchResult.type,
          resultTitle: searchResult.title
        }
      } : house;

      useModalStore.getState().openHouseModal(houseWithContext, onSuccess);
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
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Suchen Sie nach Mietern, Häusern, Wohnungen..."
            value={query}
            onValueChange={setQuery}
            data-dialog-ignore-interaction
          />

          {/* Network Status Indicator */}
          <NetworkStatusIndicator
            isOffline={isOffline}
            onRetry={retrySearch}
          />

          <CommandList>
            {/* Search Results */}
            {showSearchResults && (
              <>
                {/* Loading State */}
                {isSearchLoading && (
                  <SearchLoadingIndicator
                    query={query}
                    isLoading={isSearchLoading}
                    retryCount={retryCount}
                    maxRetries={3}
                  />
                )}

                {/* Search Status Bar */}
                {!isSearchLoading && hasSearchResults && (
                  <SearchStatusBar
                    totalCount={totalCount}
                    executionTime={executionTime}
                    query={query}
                    isLoading={isSearchLoading}
                    retryCount={retryCount}
                    isOffline={isOffline}
                    resultBreakdown={{
                      tenant: groupedResults.tenant?.length || 0,
                      house: groupedResults.house?.length || 0,
                      apartment: groupedResults.apartment?.length || 0,
                      finance: groupedResults.finance?.length || 0,
                      task: groupedResults.task?.length || 0
                    }}
                  />
                )}

                {/* Quick Search Tips - Removed as per user request */}

                {/* Search Results */}
                {!isSearchLoading && !searchError && hasSearchResults && (
                  <>


                    {/* Grouped Results */}
                    {groupedResults.tenant && (
                      <SearchResultGroup
                        title="Mieter"
                        type="tenant"
                        results={groupedResults.tenant}
                        onSelect={handleSearchResultSelect}
                        onAction={handleSearchResultAction}
                        searchQuery={query}
                      />
                    )}

                    {groupedResults.house && (
                      <SearchResultGroup
                        title="Häuser"
                        type="house"
                        results={groupedResults.house}
                        onSelect={handleSearchResultSelect}
                        onAction={handleSearchResultAction}
                        showSeparator={!!groupedResults.tenant}
                        searchQuery={query}
                      />
                    )}

                    {groupedResults.apartment && (
                      <SearchResultGroup
                        title="Wohnungen"
                        type="apartment"
                        results={groupedResults.apartment}
                        onSelect={handleSearchResultSelect}
                        onAction={handleSearchResultAction}
                        showSeparator={!!(groupedResults.tenant || groupedResults.house)}
                        searchQuery={query}
                      />
                    )}

                    {groupedResults.finance && (
                      <SearchResultGroup
                        title="Finanzen"
                        type="finance"
                        results={groupedResults.finance}
                        onSelect={handleSearchResultSelect}
                        onAction={handleSearchResultAction}
                        showSeparator={!!(groupedResults.tenant || groupedResults.house || groupedResults.apartment)}
                        searchQuery={query}
                      />
                    )}

                    {groupedResults.task && (
                      <SearchResultGroup
                        title="Aufgaben"
                        type="task"
                        results={groupedResults.task}
                        onSelect={handleSearchResultSelect}
                        onAction={handleSearchResultAction}
                        showSeparator={!!(groupedResults.tenant || groupedResults.house || groupedResults.apartment || groupedResults.finance)}
                        searchQuery={query}
                      />
                    )}

                  </>
                )}

                {/* Error State */}
                {searchError && !isSearchLoading && (
                  <SearchEmptyState
                    query={query}
                    hasError={true}
                    isOffline={isOffline}
                    onRetry={retrySearch}
                    suggestions={lastSuccessfulQuery ? [lastSuccessfulQuery] : []}
                  />
                )}

                {/* No Results */}
                {!isSearchLoading && !searchError && !hasSearchResults && (
                  <CommandEmpty>
                    <SearchEmptyState
                      query={query}
                      hasError={false}
                      isOffline={isOffline}
                      suggestions={['Mieter', 'Wohnung', 'Haus', 'Finanzen']}
                    />
                  </CommandEmpty>
                )}
              </>
            )}

            {/* Search Suggestions and Recent Searches */}
            {query.trim().length > 0 && query.trim().length < 3 && !isSearchLoading && (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Letzte Suchen">
                    {recentSearches.slice(0, 3).map((recentQuery, index) => (
                      <CommandItem
                        key={`recent-${index}`}
                        onSelect={() => {
                          setQuery(recentQuery)
                        }}
                      >
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        {recentQuery}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Search Suggestions */}
                {suggestions.length > 0 && (
                  <CommandGroup heading="Vorschläge">
                    {suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={`suggestion-${index}`}
                        onSelect={() => {
                          setQuery(suggestion)
                        }}
                      >
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        {suggestion}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

              </>
            )}

            {/* Navigation and Actions (shown when not searching) */}
            {!showSearchResults && query.trim().length === 0 && (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Letzte Suchen">
                    {recentSearches.slice(0, 3).map((recentQuery, index) => (
                      <CommandItem
                        key={`recent-nav-${index}`}
                        onSelect={() => {
                          setQuery(recentQuery)
                        }}
                      >
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        {recentQuery}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <CommandGroup heading="Schnellsuche">
                  <CommandItem
                    onSelect={() => {
                      setQuery("M-")
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Mieter suchen</span>
                    <CommandShortcut>⌘M</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setQuery("H-")
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Häuser suchen</span>
                    <CommandShortcut>⌘H</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setQuery("W-")
                    }}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    <span>Wohnungen suchen</span>
                    <CommandShortcut>⌘J</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setQuery("F-")
                    }}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>Finanzen suchen</span>
                    <CommandShortcut>⌘F</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setQuery("T-")
                    }}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>Aufgaben suchen</span>
                    <CommandShortcut>⌘A</CommandShortcut>
                  </CommandItem>
                </CommandGroup>

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
                    onSelect={handleAddApartment}
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


          {/* Footer with shortcuts */}
          <div className="hidden h-10 items-center justify-between border-t border-border/40 bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground sm:flex">
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">↵</span>
                </kbd>
                <span className="font-medium">Auswählen</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">esc</span>
                </kbd>
                <span className="font-medium">Schließen</span>
              </div>
            </div>
            <div className="font-medium opacity-50">Mietfluss</div>
          </div>
        </Command>
      </CommandDialog>
    </SearchErrorBoundary>
  )
}
