"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home, Building, Users, FileText, AlertCircle, Archive, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCloudStorageStore, VirtualFolder, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { buildUserPath, buildHousePath, buildApartmentPath, buildTenantPath } from "@/lib/path-utils"
import { usePropertyHierarchy } from "@/hooks/use-property-hierarchy"
import { useFolderNavigation } from "@/components/common/navigation-interceptor"
import { useDirectoryActiveState } from "@/hooks/use-active-state-manager"
interface FileTreeViewProps {
  userId: string
  className?: string
  onFolderClick?: (path: string) => void
}

interface TreeNode {
  id: string
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category' | 'archive'
  icon: React.ComponentType<{ className?: string }>
  children: TreeNode[]
  fileCount: number
  isEmpty: boolean
}

export function FileTreeView({ userId, className, onFolderClick }: FileTreeViewProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
  const [filterQuery, setFilterQuery] = useState('')

  const {
    currentPath,
    folders,
    setFolders
  } = useCloudStorageStore()

  // Helper function to get file count from cloud storage folders data
  const getFileCountFromStore = (path: string): number => {
    const folder = folders.find(f => f.path === path)
    return folder?.fileCount || 0
  }
  const { handleFolderClick, isNavigating } = useFolderNavigation(userId)
  const { isDirectoryActive, getDirectoryActiveClasses } = useDirectoryActiveState()

  // Fetch real data from API
  const { houses, apartments, tenants, isLoading, error } = usePropertyHierarchy()

  // Build tree structure from data
  useEffect(() => {
    const buildTreeStructure = (): TreeNode[] => {
      const rootNode: TreeNode = {
        id: 'root',
        name: 'Cloud Storage',
        path: buildUserPath(userId),
        type: 'root',
        icon: Home,
        children: [],
        fileCount: 0,
        isEmpty: false
      }

      // Add category folders
      const categories = [
        {
          id: 'haeuser',
          name: 'Häuser',
          path: buildUserPath(userId, 'haeuser'),
          type: 'category' as const,
          icon: Building,
          children: [] as TreeNode[],
          fileCount: 0,
          isEmpty: false
        },
        {
          id: 'miscellaneous',
          name: 'Sonstiges',
          path: buildUserPath(userId, 'Miscellaneous'),
          type: 'category' as const,
          icon: FileText,
          children: [] as TreeNode[],
          fileCount: getFileCountFromStore(buildUserPath(userId, 'Miscellaneous')),
          isEmpty: getFileCountFromStore(buildUserPath(userId, 'Miscellaneous')) === 0
        },
        {
          id: 'archive',
          name: 'Archiv',
          path: buildUserPath(userId, '__archive__'),
          type: 'archive' as const,
          icon: Archive,
          children: [] as TreeNode[],
          fileCount: getFileCountFromStore(buildUserPath(userId, '__archive__')),
          isEmpty: getFileCountFromStore(buildUserPath(userId, '__archive__')) === 0
        }
      ]

      // Build house structure
      const haeuser = categories.find(c => c.id === 'haeuser')!
      houses.forEach(house => {
        const housePath = buildHousePath(userId, house.id)
        const houseFileCount = getFileCountFromStore(housePath)
        const houseNode: TreeNode = {
          id: `house-${house.id}`,
          name: house.name,
          path: housePath,
          type: 'house',
          icon: Building,
          children: [],
          fileCount: houseFileCount,
          isEmpty: houseFileCount === 0
        }

        // Add house documents category
        const houseDocsPath = buildUserPath(userId, house.id, 'house_documents')
        const houseDocsFileCount = getFileCountFromStore(houseDocsPath)
        const houseDocsNode: TreeNode = {
          id: `house-docs-${house.id}`,
          name: 'Hausdokumente',
          path: houseDocsPath,
          type: 'category',
          icon: FileText,
          children: [],
          fileCount: houseDocsFileCount,
          isEmpty: houseDocsFileCount === 0
        }
        houseNode.children.push(houseDocsNode)

        // Add apartments for this house
        const houseApartments = apartments.filter(apt => apt.haus_id === house.id)
        houseApartments.forEach(apartment => {
          const apartmentPath = buildApartmentPath(userId, house.id, apartment.id)
          const apartmentFileCount = getFileCountFromStore(apartmentPath)
          const apartmentNode: TreeNode = {
            id: `apartment-${apartment.id}`,
            name: apartment.name,
            path: apartmentPath,
            type: 'apartment',
            icon: Home,
            children: [],
            fileCount: apartmentFileCount,
            isEmpty: apartmentFileCount === 0
          }

          // Add apartment documents category
          const apartmentDocsPath = buildUserPath(userId, house.id, apartment.id, 'apartment_documents')
          const apartmentDocsFileCount = getFileCountFromStore(apartmentDocsPath)
          const apartmentDocsNode: TreeNode = {
            id: `apartment-docs-${apartment.id}`,
            name: 'Wohnungsdokumente',
            path: apartmentDocsPath,
            type: 'category',
            icon: FileText,
            children: [],
            fileCount: apartmentDocsFileCount,
            isEmpty: apartmentDocsFileCount === 0
          }
          apartmentNode.children.push(apartmentDocsNode)

          // Add tenants for this apartment
          const apartmentTenants = tenants.filter(tenant => tenant.wohnung_id === apartment.id)
          apartmentTenants.forEach(tenant => {
            const tenantPath = buildTenantPath(userId, house.id, apartment.id, tenant.id)
            const tenantFileCount = getFileCountFromStore(tenantPath)
            const tenantNode: TreeNode = {
              id: `tenant-${tenant.id}`,
              name: tenant.name,
              path: tenantPath,
              type: 'tenant',
              icon: Users,
              children: [],
              fileCount: tenantFileCount,
              isEmpty: tenantFileCount === 0
            }
            apartmentNode.children.push(tenantNode)
          })

          houseNode.children.push(apartmentNode)
        })

        haeuser.children.push(houseNode)
      })

      // Add custom folders from the cloud storage store
      const customFolders = folders.filter(folder =>
        folder.type === 'storage' &&
        folder.path.startsWith(buildUserPath(userId)) &&
        folder.path.split('/').length === 2 // Only root level custom folders
      )

      const customFolderNodes = customFolders.map(folder => ({
        id: `custom-${folder.name}`,
        name: folder.displayName || folder.name,
        path: folder.path,
        type: 'category' as const,
        icon: Folder,
        children: [] as TreeNode[],
        fileCount: folder.fileCount,
        isEmpty: folder.isEmpty
      }))

      categories.push(...customFolderNodes)

      rootNode.children = categories
      return [rootNode]
    }

    if (!isLoading && !error) {
      setTreeData(buildTreeStructure())
    }
  }, [userId, houses, apartments, tenants, isLoading, error, folders])

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = (path: string): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Cloud Storage', path: buildUserPath(userId), type: 'root' }
    ]

    if (!path || path === buildUserPath(userId)) {
      return breadcrumbs
    }

    // Parse path to build breadcrumbs
    const userPath = buildUserPath(userId)
    const relativePath = path.startsWith(userPath) ? path.substring(userPath.length + 1) : path
    const segments = relativePath.split('/').filter(Boolean)

    if (segments.length > 0) {
      if (segments[0] === 'haeuser') {
        breadcrumbs.push({
          name: 'Häuser',
          path: buildUserPath(userId, 'haeuser'),
          type: 'category'
        })

        if (segments.length > 1) {
          const house = houses.find(h => h.id === segments[1])
          if (house) {
            breadcrumbs.push({
              name: house.name,
              path: buildHousePath(userId, house.id),
              type: 'house'
            })

            if (segments.length > 2) {
              if (segments[2] === 'house_documents') {
                breadcrumbs.push({
                  name: 'Hausdokumente',
                  path: buildUserPath(userId, house.id, 'house_documents'),
                  type: 'category'
                })
              } else {
                const apartment = apartments.find(a => a.id === segments[2])
                if (apartment) {
                  breadcrumbs.push({
                    name: apartment.name,
                    path: buildApartmentPath(userId, house.id, apartment.id),
                    type: 'apartment'
                  })

                  if (segments.length > 3) {
                    if (segments[3] === 'apartment_documents') {
                      breadcrumbs.push({
                        name: 'Wohnungsdokumente',
                        path: buildUserPath(userId, house.id, apartment.id, 'apartment_documents'),
                        type: 'category'
                      })
                    } else {
                      const tenant = tenants.find(t => t.id === segments[3])
                      if (tenant) {
                        breadcrumbs.push({
                          name: tenant.name,
                          path: buildTenantPath(userId, house.id, apartment.id, tenant.id),
                          type: 'tenant'
                        })
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else if (segments[0] === 'miscellaneous') {
        breadcrumbs.push({
          name: 'Sonstiges',
          path: buildUserPath(userId, 'miscellaneous'),
          type: 'category'
        })
      } else if (segments[0] === '__archive__') {
        breadcrumbs.push({
          name: 'Archiv',
          path: buildUserPath(userId, '__archive__'),
          type: 'category'
        })
      }
    }

    return breadcrumbs
  }

  // Handle node click with navigation interceptor
  const handleNodeClick = async (node: TreeNode) => {
    try {
      if (onFolderClick) {
        onFolderClick(node.path)
      } else {
        await handleFolderClick(node.path)
      }
    } catch (error) {
      console.error('Navigation failed in file tree:', error)
      // Error handling is managed by the navigation interceptor
    }
  }

  // Handle node expansion
  const handleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set(['root']))
  }, [])

  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>()
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        allIds.add(n.id)
        if (n.children.length > 0) collectIds(n.children)
      })
    }
    collectIds(treeData)
    setExpandedNodes(allIds)
  }, [treeData])

  // Filtered tree data based on query
  const filteredTreeData = useMemo(() => {
    if (!filterQuery.trim()) return treeData

    const query = filterQuery.toLowerCase().trim()
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map(node => {
          const matches = node.name.toLowerCase().includes(query)
          const filteredChildren = filterNodes(node.children)
          
          if (matches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren
            }
          }
          return null
        })
        .filter((n): n is TreeNode => n !== null)
    }

    return filterNodes(treeData)
  }, [treeData, filterQuery])

  // Automatic expansion when searching
  useEffect(() => {
    if (filterQuery.trim()) {
      const allIds = new Set<string>()
      const collectIds = (nodes: TreeNode[]) => {
        nodes.forEach(n => {
          allIds.add(n.id)
          if (n.children.length > 0) collectIds(n.children)
        })
      }
      collectIds(filteredTreeData)
      setExpandedNodes(allIds)
    }
  }, [filterQuery, filteredTreeData])

  // Render tree node
  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = currentPath === node.path
    const isActiveDirectory = isDirectoryActive(node.path)
    const Icon = node.icon

    return (
      <div key={node.id} className="w-full">
        <div
          className={cn(
            "group relative flex items-center gap-2 py-2.5 px-3.5 rounded-lg cursor-pointer transition-all duration-150 ease-out select-none active:scale-[0.99]",
            isSelected 
              ? "bg-accent text-white font-semibold shadow-md shadow-accent/15"
              : isActiveDirectory && !isSelected
                ? "bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-800 dark:text-zinc-300"
                : "hover:bg-white dark:hover:bg-zinc-800/50 hover:shadow-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
            isNavigating && "opacity-50 pointer-events-none"
          )}
          onClick={() => handleNodeClick(node)}
          data-folder-path={node.path}
        >
          {hasChildren ? (
            <button
              type="button"
              className={cn(
                "shrink-0 size-5 flex items-center justify-center rounded-full transition-all duration-150 ease-out z-10",
                isSelected
                  ? "hover:bg-white/20 text-white/80"
                  : "hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40 text-zinc-400 dark:text-zinc-500"
              )}
              onClick={(e) => {
                e.stopPropagation()
                handleNodeExpand(node.id)
              }}
            >
              <ChevronRight 
                className={cn(
                  "size-3 transition-transform duration-200 ease-out shrink-0", 
                  isExpanded && "rotate-90"
                )} 
              />
            </button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <Icon className={cn(
            "size-3.5 shrink-0 transition-colors",
            isSelected
              ? "text-white"
              : node.type === 'archive'
                ? "text-zinc-400 dark:text-zinc-600"
                : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300",
            !isSelected && node.type === 'house' && "text-blue-500 dark:text-blue-400",
            !isSelected && node.type === 'apartment' && "text-green-500 dark:text-green-400",
            !isSelected && node.type === 'tenant' && "text-purple-500 dark:text-purple-400",
            !isSelected && node.type === 'category' && "text-orange-500 dark:text-orange-400",
            !isSelected && node.type === 'archive' && "text-gray-500 dark:text-gray-450"
          )} />

          <span className={cn(
            "text-xs truncate flex-1 tracking-wide leading-none",
            isSelected ? "text-white" : "text-zinc-700 dark:text-zinc-300"
          )}>{node.name}</span>

          {node.fileCount > 0 && (
            <span className={cn(
              "text-[10px] ml-2 shrink-0 font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
              isSelected && "bg-white/20 text-white"
            )}>
              {node.fileCount}
            </span>
          )}

          {node.isEmpty && (
            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
              leer
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-3 pl-3.5 mt-0.5 mb-1 border-l border-zinc-200/60 dark:border-zinc-800/40 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-0.5 duration-100">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-4 bg-muted rounded w-2/3 mb-2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        <AlertCircle className="size-4" />
        <span>Fehler beim Laden der Ordnerstruktur</span>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3 relative", className)}>
      {/* File Tree Toolbar */}
      <div className="sticky top-0 bg-gray-50 dark:bg-[#22272e] z-20 pt-1 pb-2 flex items-center gap-1.5 px-0.5 border-b border-zinc-100 dark:border-zinc-800/40">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Ordner filtern..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full h-8 pl-7.5 pr-6.5 py-0 text-[10.5px] bg-zinc-50 dark:bg-[#121212] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all font-medium"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="size-2.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            title="Alle ausklappen"
            className="size-8 flex items-center justify-center rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all shrink-0"
          >
            <FolderOpen className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            title="Alle einklappen"
            className="size-8 flex items-center justify-center rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all shrink-0"
          >
            <Folder className="size-3.5" />
          </button>
        </div>
      </div>

      {/* File Tree Body */}
      <div className="flex flex-col gap-0.5">
        {filteredTreeData.length === 0 ? (
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 py-6 text-center italic">
            Keine Ordner gefunden
          </div>
        ) : (
          filteredTreeData.map(node => renderTreeNode(node))
        )}
      </div>
    </div>
  )
}