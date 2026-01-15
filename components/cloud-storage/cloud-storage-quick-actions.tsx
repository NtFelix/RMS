"use client"

import { useState } from "react"
import {
  Upload,
  FolderPlus,
  Star,
  Clock,
  Archive,
  Trash2,
  Download,
  Share2,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  Image,
  FileText,
  Plus,
  Lock
} from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DeleteConfirmationDialog } from "@/components/modals/delete-confirmation-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface QuickActionsProps {
  onUpload: () => void
  onCreateFolder: () => void
  onCreateFile: () => void
  onSearch: (query: string) => void
  onSort: (sortBy: string) => void
  onViewMode: (mode: 'grid' | 'list') => void
  onFilter: (filter: string) => void
  viewMode: 'grid' | 'list'
  searchQuery: string
  selectedCount?: number
  onBulkDownload?: () => void
  onBulkDelete?: () => void
  onBulkArchive?: () => void
  isUploadDisabled?: boolean
  storageDisabledMessage?: string
}

export function CloudStorageQuickActions({
  onUpload,
  onCreateFolder,
  onCreateFile,
  onSearch,
  onSort,
  onViewMode,
  onFilter,
  viewMode,
  searchQuery,
  selectedCount = 0,
  onBulkDownload,
  onBulkDelete,
  onBulkArchive,
  isUploadDisabled = false,
  storageDisabledMessage = "Speicherlimit erreicht oder nicht in Ihrem Tarif enthalten"
}: QuickActionsProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const createFileEnabled = useFeatureFlagEnabled('create-file-option')

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    onFilter(filter)
  }

  return (
    <div className="space-y-4">
      {/* Search and primary actions row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input and sort button on the left */}
        <div className="flex flex-wrap gap-2">
          <SearchInput
            placeholder="Dateien und Ordner durchsuchen..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onClear={() => onSearch('')}
            className="rounded-full"
            wrapperClassName="w-full sm:w-auto sm:min-w-[300px]"
            mode="table"
          />

          {/* Sort dropdown next to search */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 rounded-full">
                <SortAsc className="h-4 w-4 mr-2" />
                Sortieren
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onSort('name')}>
                Nach Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort('date')}>
                Nach Datum (neueste zuerst)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort('size')}>
                Nach Größe (größte zuerst)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort('type')}>
                Nach Dateityp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Categories dropdown next to sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 rounded-full">
                <Filter className="h-4 w-4 mr-2" />
                Kategorien
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                <span className="flex items-center">
                  Alle
                  {activeFilter === 'all' && <span className="ml-2 text-xs">✓</span>}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleFilterChange('folders')}>
                <span className="flex items-center">
                  <FolderPlus className="h-3 w-3 mr-2" />
                  Ordner
                  {activeFilter === 'folders' && <span className="ml-2 text-xs">✓</span>}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('images')}>
                <span className="flex items-center">
                  <Image className="h-3 w-3 mr-2" />
                  Bilder
                  {activeFilter === 'images' && <span className="ml-2 text-xs">✓</span>}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('documents')}>
                <span className="flex items-center">
                  <FileText className="h-3 w-3 mr-2" />
                  Dokumente
                  {activeFilter === 'documents' && <span className="ml-2 text-xs">✓</span>}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('recent')}>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-2" />
                  Kürzlich
                  {activeFilter === 'recent' && <span className="ml-2 text-xs">✓</span>}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary action buttons and view controls on the right */}
        <div className="flex items-center gap-2 mt-1">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewMode('grid')}
              className="h-8 px-3 rounded-full"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewMode('list')}
              className="h-8 px-3 rounded-full"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Unified add/upload dropdown */}
          {isUploadDisabled ? (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button className="sm:w-auto opacity-60 cursor-not-allowed">
                    <Lock className="h-4 w-4 mr-2" />
                    Hinzufügen
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[250px]">
                  <p className="text-sm">{storageDisabledMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  Dateien hochladen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateFolder}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Ordner erstellen
                </DropdownMenuItem>
                {createFileEnabled && (
                  <DropdownMenuItem onClick={onCreateFile}>
                    <FileText className="h-4 w-4 mr-2" />
                    Datei erstellen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk actions when items are selected */}
      {selectedCount > 0 && (
        <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              {selectedCount} ausgewählt
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {onBulkDownload && (
              <Button variant="outline" size="sm" onClick={onBulkDownload} className="h-8 gap-2">
                <Download className="h-4 w-4" />
                Herunterladen
              </Button>
            )}

            {onBulkArchive && (
              <Button variant="outline" size="sm" onClick={onBulkArchive} className="h-8 gap-2">
                <Archive className="h-4 w-4" />
                Archivieren
              </Button>
            )}

            {onBulkDelete && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="h-8 gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </Button>
                <DeleteConfirmationDialog
                  isOpen={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                  onConfirm={onBulkDelete}
                  itemCount={selectedCount}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}