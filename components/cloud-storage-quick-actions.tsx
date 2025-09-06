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
  FileText
} from "lucide-react"
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

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    onFilter(filter)
  }

  return (
    <div className="space-y-4">
      {/* Search and primary actions row */}
      <div className="flex items-center justify-between gap-4">
        {/* Search input on the left */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Dateien und Ordner durchsuchen..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 h-9 w-80"
          />
        </div>

        {/* Primary action buttons on the right */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onCreateFolder} className="h-9">
            <FolderPlus className="h-4 w-4 mr-2" />
            Ordner erstellen
          </Button>
          
          <Button onClick={onUpload} className="h-9">
            <Upload className="h-4 w-4 mr-2" />
            Hochladen
          </Button>
        </div>
      </div>

      {/* Secondary actions and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Filter buttons */}
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
            className="h-8"
          >
            Alle
          </Button>
          
          <Button
            variant={activeFilter === 'folders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('folders')}
            className="h-8"
          >
            <FolderPlus className="h-3 w-3 mr-1" />
            Ordner
          </Button>
          
          <Button
            variant={activeFilter === 'images' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('images')}
            className="h-8"
          >
            <Image className="h-3 w-3 mr-1" />
            Bilder
          </Button>
          
          <Button
            variant={activeFilter === 'documents' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('documents')}
            className="h-8"
          >
            <FileText className="h-3 w-3 mr-1" />
            Dokumente
          </Button>
          
          <Button
            variant={activeFilter === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('recent')}
            className="h-8"
          >
            <Clock className="h-3 w-3 mr-1" />
            Kürzlich
          </Button>

          {/* Bulk actions when items are selected */}
          {selectedCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-6" />
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
            </>
          )}
        </div>

        {/* View controls on the right */}
        <div className="flex items-center space-x-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                Sortieren
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewMode('grid')}
              className="rounded-r-none h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewMode('list')}
              className="rounded-l-none h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}