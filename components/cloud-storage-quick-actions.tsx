"use client"

import { useState } from "react"
import { 
  Upload, 
  FolderPlus, 
  Search, 
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
  Plus
} from "lucide-react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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
  onBulkArchive
}: QuickActionsProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const createFileEnabled = useFeatureFlagEnabled('create-file-option')

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    onFilter(filter)
  }

  return (
    <div className="space-y-4">
      {/* Search and primary actions row */}
      <div className="flex items-center justify-between gap-4">
        {/* Search input and sort button on the left */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Dateien und Ordner durchsuchen..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10 h-9 w-80"
            />
          </div>
          
          {/* Sort dropdown next to search */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
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
              <Button variant="outline" size="sm" className="h-9">
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
        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewMode('grid')}
              className="rounded-r-none h-9 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewMode('list')}
              className="rounded-l-none h-9 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Unified add/upload dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9">
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
        </div>
      </div>

      {/* Bulk actions when items are selected */}
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="px-3 py-1">
            {selectedCount} ausgewählt
          </Badge>
          
          <div className="flex items-center space-x-1">
            {onBulkDownload && (
              <Button variant="outline" size="sm" onClick={onBulkDownload}>
                <Download className="h-4 w-4 mr-1" />
                Herunterladen
              </Button>
            )}
            
            {onBulkArchive && (
              <Button variant="outline" size="sm" onClick={onBulkArchive}>
                <Archive className="h-4 w-4 mr-1" />
                Archivieren
              </Button>
            )}
            
            {onBulkDelete && (
              <Button variant="outline" size="sm" onClick={onBulkDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Löschen
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}