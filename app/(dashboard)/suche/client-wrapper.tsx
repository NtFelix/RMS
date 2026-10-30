"use client"

import { useState, useMemo } from "react"
import { useSearch } from "@/hooks/use-search"
import type { SearchResult } from "@/types/search"
import { 
  Search, 
  Users, 
  Building2, 
  Home, 
  Wallet, 
  CheckSquare, 
  Clock,
  ArrowRight, 
  X, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  TrendingUp
} from "lucide-react"
import Link from "next/link"
import { LazyMotion, m, AnimatePresence, domAnimation } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

function SearchHeader({
  query,
  setQuery,
  clearSearch,
  suggestions,
  addToRecentSearches,
}: {
  query: string;
  setQuery: (q: string) => void;
  clearSearch: () => void;
  suggestions: string[];
  addToRecentSearches: (q: string) => void;
}) {
  return (
    <div className="relative overflow-hidden px-6 py-10 md:px-12 md:py-16 border-b border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-[#181818]">
      <div className="absolute top-0 right-0 size-96 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 size-80 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
      
      <div className="relative max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Echtzeit-Suche
          </h1>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-xl font-medium">
            Durchsuche Deine Mieter, Häuser, Wohnungen, Finanzeinträge und Aufgaben an einem zentralen Ort.
          </p>
        </div>

        <div className="relative flex items-center group">
          <div className="absolute left-5 text-zinc-400 group-focus-within:text-accent transition-colors duration-300">
            <Search className="size-6 group-focus-within:scale-110 transition-transform duration-300" />
          </div>
          <input
            type="text"
            aria-label="Sucheingabe"
            placeholder="Eintrag, Betrag, Name oder Stichwort suchen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "w-full h-16 pl-14 pr-14 text-base md:text-lg font-medium rounded-2xl bg-zinc-50 dark:bg-zinc-900/60",
              "border border-zinc-200 dark:border-zinc-800",
              "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none",
              "focus:bg-white dark:focus:bg-[#181818] focus:ring-2 focus:ring-accent/20 focus:border-accent/50 focus:outline-none",
              "transition-all duration-300"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all duration-200"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {suggestions.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium"
            >
              <span className="flex items-center gap-1 font-semibold text-zinc-400 dark:text-zinc-500">
                <TrendingUp className="size-3.5" /> Vorschläge:
              </span>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion)
                    addToRecentSearches(suggestion)
                  }}
                  className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 hover:border-accent/40 hover:text-accent dark:hover:text-accent transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  query,
}: {
  categories: { id: string; label: string; count: number }[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  query: string;
}) {
  return (
    <div className="px-6 py-6 md:px-12 md:py-8 border-b md:border-b-0 md:border-r border-zinc-200/50 dark:border-zinc-800/40 w-full md:w-64 shrink-0 bg-white/40 dark:bg-transparent backdrop-blur-xs">
      <div className="flex flex-col gap-4">
        <h3 className="hidden md:block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
          Kategorien
        </h3>
        <div className="flex flex-wrap md:flex-col gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-97",
                selectedCategory === cat.id
                  ? "bg-accent text-white shadow-md shadow-accent/15"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <span>{cat.label}</span>
              {query && cat.count > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide",
                  selectedCategory === cat.id 
                    ? "bg-white/20 text-white" 
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                )}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

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

const getLink = (item: SearchResult) => {
  switch (item.type) {
    case "tenant": return "/mieter"
    case "house": return "/haeuser"
    case "apartment": return "/wohnungen"
    case "finance": return "/finanzen"
    case "task": return "/todos"
    default: return "/dashboard"
  }
}

function OfflineState({ retry }: { retry: () => void }) {
  return (
    <m.div {...fadeVariants} className="flex flex-col items-center justify-center py-16 text-center gap-4 max-w-md mx-auto">
      <div className="p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
        <AlertCircle className="size-10 animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Offline</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
        Keine Internetverbindung verfügbar. Bitte überprüfe Deine Verbindung und versuche es erneut.
      </p>
      <button
        type="button"
        onClick={retry}
        className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl shadow-md hover:bg-accent/90 transition-all active:scale-95 cursor-pointer"
      >
        Erneut versuchen
      </button>
    </m.div>
  );
}

function ErrorState({ error, retry }: { error: string; retry: () => void }) {
  return (
    <m.div {...fadeVariants} className="flex flex-col items-center justify-center py-16 text-center gap-4 max-w-md mx-auto">
      <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
        <AlertCircle className="size-10" />
      </div>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Fehler</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{error}</p>
      <button
        type="button"
        onClick={retry}
        className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl shadow-md hover:bg-accent/90 transition-all active:scale-95 cursor-pointer"
      >
        Wiederholen
      </button>
    </m.div>
  );
}

function LoadingState() {
  return (
    <m.div {...fadeVariants} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-sm text-zinc-400 dark:text-zinc-500 font-semibold px-2">
        <Loader2 className="size-4 animate-spin text-accent" />
        <span>Durchsuche Datenbank...</span>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-white dark:bg-[#181818] border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl animate-pulse" />
      ))}
    </m.div>
  );
}

function EmptyQueryState({
  recentSearches,
  onSelectRecent,
}: {
  recentSearches: string[];
  onSelectRecent: (q: string) => void;
}) {
  if (recentSearches.length > 0) {
    return (
      <m.div {...fadeVariants} className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 max-w-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
            <Clock className="size-4" /> Letzte Suchanfragen
          </h3>
          <div className="flex flex-col border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white dark:bg-[#181818] shadow-sm">
            {recentSearches.map((search, index) => (
              <button
                key={search}
                type="button"
                onClick={() => onSelectRecent(search)}
                className={cn(
                  "flex items-center justify-between px-5 py-4 text-left font-medium text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group",
                  index !== recentSearches.length - 1 && "border-b border-zinc-100 dark:border-zinc-800/50"
                )}
              >
                <span className="truncate group-hover:text-zinc-950 dark:group-hover:text-zinc-50 transition-colors">{search}</span>
                <ArrowRight className="size-4 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </button>
            ))}
          </div>
        </div>
      </m.div>
    );
  }

  return (
    <m.div {...fadeVariants} className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-md mx-auto">
      <div className="p-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 rounded-full border border-zinc-200/50 dark:border-zinc-800/40">
        <HelpCircle className="size-10" />
      </div>
      <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Bereit für Deine Suche</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-medium">
        Gib oben ein Stichwort oder einen Namen ein, um Deine Verwaltungsdaten in Echtzeit zu durchsuchen.
      </p>
    </m.div>
  );
}

function NoResultsState({ query }: { query: string }) {
  return (
    <m.div {...fadeVariants} className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-md mx-auto">
      <div className="p-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 rounded-full border border-zinc-200/50 dark:border-zinc-800/40">
        <Search className="size-10" />
      </div>
      <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Keine Ergebnisse gefunden</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-medium">
        Wir konnten für &quot;{query}&quot; in dieser Kategorie keine passenden Einträge finden. Überprüfe die Schreibweise.
      </p>
    </m.div>
  );
}

function ResultItem({ item, getIcon, getTypeLabel, getLink }: {
  item: SearchResult;
  getIcon: (type: string) => React.ElementType;
  getTypeLabel: (type: string) => string;
  getLink: (item: SearchResult) => string;
}) {
  const ItemIcon = getIcon(item.type);
  return (
    <m.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Link href={getLink(item)}>
        <Card className={cn(
          "bg-white dark:bg-[#181818] border border-zinc-200/70 dark:border-zinc-800/60 shadow-xs rounded-2xl",
          "hover:shadow-md hover:border-accent/40 dark:hover:border-accent/40 transition-all duration-300 cursor-pointer overflow-hidden"
        )}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl text-zinc-500 group-hover:text-accent group-hover:bg-accent/5 transition-all duration-300 shrink-0">
              <ItemIcon className="size-5 transition-transform duration-300 group-hover:scale-110" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-bold text-zinc-900 dark:text-zinc-50 text-base truncate">
                  {item.title}
                </span>
                {item.subtitle && (
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 truncate">
                    {item.subtitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                  {getTypeLabel(item.type)}
                </span>
                {item.context && (
                  <span className="truncate max-w-[15rem] md:max-w-sm">
                    {item.context}
                  </span>
                )}
                {item.type === "house" && item.metadata?.address && (
                  <span className="truncate max-w-[15rem] md:max-w-sm">
                    {item.metadata.address}
                  </span>
                )}
                {item.type === "apartment" && item.metadata?.house_name && (
                  <span className="truncate max-w-[15rem] md:max-w-sm">
                    {item.metadata.house_name}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              {item.type === "finance" && item.metadata?.amount && (
                <span className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-bold tracking-tight shadow-2xs",
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
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg">
                  {item.metadata.apartment_count} Einheiten
                </span>
              )}
              {item.type === "tenant" && item.metadata?.status && (
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                  item.metadata.status === "active" 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"
                )}>
                  {item.metadata.status === "active" ? "Aktiv" : "Inaktiv"}
                </span>
              )}
              {item.type === "task" && item.metadata?.due_date && (
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Bis {new Date(item.metadata.due_date).toLocaleDateString('de-DE')}
                </span>
              )}
            </div>
            
            <div className="hidden sm:block text-zinc-300 dark:text-zinc-700 group-hover:text-accent group-hover:translate-x-1.5 transition-all duration-300 pl-2 shrink-0">
              <ArrowRight className="size-5" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </m.div>
  );
}

function ResultsList({
  items,
  getIcon,
  getTypeLabel,
  getLink,
}: {
  items: SearchResult[];
  getIcon: (type: string) => React.ElementType;
  getTypeLabel: (type: string) => string;
  getLink: (item: SearchResult) => string;
}) {
  return (
    <m.div {...fadeVariants} className="flex flex-col gap-3">
      {items.map((item) => (
        <ResultItem
          key={item.id}
          item={item}
          getIcon={getIcon}
          getTypeLabel={getTypeLabel}
          getLink={getLink}
        />
      ))}
    </m.div>
  );
}

function ResultsStream({
  isOffline,
  error,
  isLoading,
  query,
  filteredResults,
  recentSearches,
  retry,
  onSelectRecent,
}: {
  isOffline: boolean;
  error: string | null;
  isLoading: boolean;
  query: string;
  filteredResults: SearchResult[];
  recentSearches: string[];
  retry: () => void;
  onSelectRecent: (q: string) => void;
}) {
  if (isOffline) return <OfflineState retry={retry} />
  if (error) return <ErrorState error={error} retry={retry} />
  if (isLoading) return <LoadingState />
  if (query === "") return <EmptyQueryState recentSearches={recentSearches} onSelectRecent={onSelectRecent} />
  if (filteredResults.length === 0) return <NoResultsState query={query} />
  return <ResultsList items={filteredResults} getIcon={getIcon} getTypeLabel={getTypeLabel} getLink={getLink} />
}

export default function SuchePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearSearch,
    retry,
    isOffline,
    recentSearches,
    suggestions,
    addToRecentSearches
  } = useSearch({
    limit: 20
  })

  const filteredResults = results.filter(item => {
    if (selectedCategory === "all") return true
    if (selectedCategory === "tenants") return item.type === "tenant"
    if (selectedCategory === "houses") return item.type === "house"
    if (selectedCategory === "apartments") return item.type === "apartment"
    if (selectedCategory === "finances") return item.type === "finance"
    if (selectedCategory === "tasks") return item.type === "task"
    return true
  })

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

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col min-h-full w-full bg-zinc-50/40 dark:bg-zinc-950/20 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
        <SearchHeader
          query={query}
          setQuery={setQuery}
          clearSearch={clearSearch}
          suggestions={suggestions}
          addToRecentSearches={addToRecentSearches}
        />

        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-zinc-50/10 dark:bg-transparent">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            query={query}
          />

          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-8 min-h-0">
            <AnimatePresence mode="wait">
              <ResultsStream
                isOffline={isOffline}
                error={error}
                isLoading={isLoading}
                query={query}
                filteredResults={filteredResults}
                recentSearches={recentSearches}
                retry={retry}
                onSelectRecent={setQuery}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </LazyMotion>
  )
}
