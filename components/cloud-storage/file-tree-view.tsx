"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home, Building, Users, FileText, AlertCircle, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCloudStorageStore, VirtualFolder, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { buildUserPath, buildHousePath, buildApartmentPath, buildTenantPath } from "@/lib/path-utils"
import { usePropertyHierarchy } from "@/hooks/use-property-hierarchy"
import { useFolderNavigation } from "@/components/common/navigation-interceptor"
import { useDirectoryActiveState } from "@/hooks/use-active-state-manager"

interface FileTreeViewProps {
  userId: string
  className?: string
}

interface TreeNode {
  id: string
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category' | 'archive'
  icon: React.ComponentType<{ className?: string }>
  children: TreeNode[]
  isExpanded: boolean
  fileCount: number
  isEmpty: boolean
}

export function FileTreeView({ userId, className }: FileTreeViewProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))

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
        isExpanded: expandedNodes.has('root'),
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
          isExpanded: expandedNodes.has('haeuser'),
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
          isExpanded: expandedNodes.has('miscellaneous'),
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
          isExpanded: expandedNodes.has('archive'),
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
          isExpanded: expandedNodes.has(`house-${house.id}`),
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
          isExpanded: false,
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
            isExpanded: expandedNodes.has(`apartment-${apartment.id}`),
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
            isExpanded: false,
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
              isExpanded: false,
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
        isExpanded: expandedNodes.has(`custom-${folder.name}`),
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
  }, [userId, houses, apartments, tenants, expandedNodes, isLoading, error, folders])

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
      await handleFolderClick(node.path)
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

  // Render tree node
  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = currentPath === node.path
    const isActiveDirectory = isDirectoryActive(node.path)
    const Icon = node.icon

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
            isSelected && "bg-accent font-medium",
            isActiveDirectory && getDirectoryActiveClasses(node.path),
            level > 0 && "ml-4",
            isNavigating && "opacity-50 pointer-events-none"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          data-folder-path={node.path}
          data-active-directory={isActiveDirectory}
          aria-current={isActiveDirectory ? "page" : undefined}
        >
          {hasChildren && (
            <button
              className="mr-1 p-0.5 hover:bg-accent-foreground/10 rounded"
              onClick={(e) => {
                e.stopPropagation()
                handleNodeExpand(node.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4 mr-1" />}

          <Icon className={cn(
            "h-4 w-4 mr-2 flex-shrink-0",
            node.type === 'house' && "text-blue-500",
            node.type === 'apartment' && "text-green-500",
            node.type === 'tenant' && "text-purple-500",
            node.type === 'category' && "text-orange-500",
            node.type === 'archive' && "text-gray-500"
          )} />

          <span className="text-sm truncate flex-1">{node.name}</span>

          {node.fileCount > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              {node.fileCount}
            </span>
          )}

          {node.isEmpty && (
            <span className="text-xs text-muted-foreground ml-2">
              leer
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
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
      <div className={cn("flex items-center space-x-2 text-sm text-destructive", className)}>
        <AlertCircle className="h-4 w-4" />
        <span>Fehler beim Laden der Ordnerstruktur</span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {treeData.map(node => renderTreeNode(node))}
    </div>
  )
}