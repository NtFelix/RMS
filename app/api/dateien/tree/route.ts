import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface TreeNode {
  id: string
  name: string
  path: string
  type: 'folder' | 'file'
  displayName?: string
  children?: TreeNode[]
  isEmpty?: boolean
  fileCount?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const path = searchParams.get('path')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (path) {
      // Load children for a specific path
      const children = await loadFolderChildren(supabase, userId, path)
      return NextResponse.json({ children })
    } else {
      // Load root tree structure
      const tree = await loadRootTree(supabase, userId)
      return NextResponse.json({ tree })
    }

  } catch (error) {
    console.error('Unexpected error loading folder tree:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function loadRootTree(supabase: any, userId: string): Promise<TreeNode[]> {
  const rootPath = `user_${userId}`
  const tree: TreeNode[] = []

  // Add root folder
  tree.push({
    id: rootPath,
    name: 'Cloud Storage',
    path: rootPath,
    type: 'folder',
    displayName: 'Cloud Storage',
    children: [],
    isEmpty: false,
    fileCount: 0 // Root folder file count not needed for tree display
  })

  try {
    // First, discover all folders in storage to determine what exists
    const { data: rootContents } = await supabase.storage
      .from('documents')
      .list(rootPath, { limit: 1000 })

    const discoveredFolders = new Set<string>()
    const folderContents = new Map<string, any[]>()
    
    // Analyze storage contents to find all folders
    if (rootContents) {
      for (const item of rootContents) {
        if (item.name && item.name.includes('/')) {
          const folderName = item.name.split('/')[0]
          discoveredFolders.add(folderName)
        } else if (item.name && !item.metadata && !item.name.includes('.') && item.name !== '.keep') {
          discoveredFolders.add(item.name)
        }
      }
      
      // Get contents for each discovered folder
      for (const folderName of discoveredFolders) {
        try {
          const { data: contents } = await supabase.storage
            .from('documents')
            .list(`${rootPath}/${folderName}`, { limit: 100 })
          folderContents.set(folderName, contents || [])
        } catch (error) {
          folderContents.set(folderName, [])
        }
      }
    }

    // Get houses and apartments from database for comparison
    const { data: houses } = await supabase
      .from('Haeuser')
      .select('id, name')
      .eq('user_id', userId)
      .order('name')

    const { data: apartments } = await supabase
      .from('Wohnungen')
      .select('id, name, haus_id')
      .eq('user_id', userId)
      .order('name')

    const houseIds = new Set(houses?.map((h: any) => h.id) || [])
    const apartmentIds = new Set(apartments?.map((a: any) => a.id) || [])

    // Process discovered folders
    for (const folderName of discoveredFolders) {
      const folderPath = `${rootPath}/${folderName}`
      const contents = folderContents.get(folderName) || []
      
      // Count direct files only
      const fileCount = await countDirectFiles(supabase, folderPath)
      const isEmpty = fileCount === 0

      if (houseIds.has(folderName)) {
        // This is a house folder
        const house = houses?.find((h: any) => h.id === folderName)
        tree.push({
          id: folderName,
          name: folderName,
          path: folderPath,
          type: 'folder',
          displayName: house?.name || folderName,
          children: [],
          isEmpty,
          fileCount
        })
      } else if (folderName === 'Miscellaneous') {
        // Miscellaneous folder
        tree.push({
          id: 'Miscellaneous',
          name: 'Miscellaneous',
          path: folderPath,
          type: 'folder',
          displayName: 'Sonstiges',
          children: [],
          isEmpty,
          fileCount
        })
      } else {
        // This is a custom folder - check if it contains any house/apartment structure
        const hasHouseStructure = contents.some((item: any) => {
          if (item.name && !item.name.includes('.') && !item.metadata) {
            // Check if this subfolder name matches a house ID
            return houseIds.has(item.name)
          }
          return false
        })

        if (!hasHouseStructure) {
          // This is a pure custom folder, not containing house structure
          tree.push({
            id: folderName,
            name: folderName,
            path: folderPath,
            type: 'folder',
            displayName: folderName,
            children: [],
            isEmpty,
            fileCount
          })
        }
      }
    }

    // Add any houses that exist in database but not in storage yet
    if (houses) {
      for (const house of houses) {
        if (!discoveredFolders.has(house.id)) {
          const housePath = `${rootPath}/${house.id}`
          tree.push({
            id: house.id,
            name: house.id,
            path: housePath,
            type: 'folder',
            displayName: house.name,
            children: [],
            isEmpty: true,
            fileCount: 0
          })
        }
      }
    }

    // Add Miscellaneous folder if it doesn't exist yet
    if (!discoveredFolders.has('Miscellaneous')) {
      const miscPath = `${rootPath}/Miscellaneous`
      tree.push({
        id: 'Miscellaneous',
        name: 'Miscellaneous',
        path: miscPath,
        type: 'folder',
        displayName: 'Sonstiges',
        children: [],
        isEmpty: true,
        fileCount: 0
      })
    }

  } catch (error) {
    console.error('Error loading root tree:', error)
  }

  // Sort tree: houses first (by display name), then custom folders, then Miscellaneous
  return tree.sort((a, b) => {
    // Root folder always first
    if (a.name === 'Cloud Storage') return -1
    if (b.name === 'Cloud Storage') return 1
    
    // Miscellaneous always last
    if (a.name === 'Miscellaneous') return 1
    if (b.name === 'Miscellaneous') return -1
    
    // Sort by display name
    return (a.displayName || a.name).localeCompare(b.displayName || b.name)
  })
}

async function loadFolderChildren(supabase: any, userId: string, folderPath: string): Promise<TreeNode[]> {
  const children: TreeNode[] = []

  try {
    const pathSegments = folderPath.split('/')
    const folderName = pathSegments[pathSegments.length - 1]
    
    // Get database entities for comparison
    const { data: houses } = await supabase
      .from('Haeuser')
      .select('id, name')
      .eq('user_id', userId)

    const { data: apartments } = await supabase
      .from('Wohnungen')
      .select('id, name, haus_id')
      .eq('user_id', userId)

    const { data: tenants } = await supabase
      .from('Mieter')
      .select('id, name, wohnung_id')
      .eq('user_id', userId)

    const houseIds = new Set(houses?.map((h: any) => h.id) || [])
    const apartmentIds = new Set(apartments?.map((a: any) => a.id) || [])
    const tenantIds = new Set(tenants?.map((t: any) => t.id) || [])

    // Check if this is a house folder (and it exists in database)
    const isHouseFolder = pathSegments.length === 2 && 
                         pathSegments[1] !== 'Miscellaneous' && 
                         houseIds.has(pathSegments[1])
    
    // Check if this is an apartment folder (and both house and apartment exist in database)
    const isApartmentFolder = pathSegments.length === 3 && 
                             pathSegments[1] !== 'Miscellaneous' && 
                             houseIds.has(pathSegments[1]) && 
                             apartmentIds.has(pathSegments[2])

    if (isHouseFolder) {
      const houseId = pathSegments[1]
      
      // Add house documents folder
      const houseDocsPath = `${folderPath}/house_documents`
      const { data: houseDocsContents } = await supabase.storage
        .from('documents')
        .list(houseDocsPath, { limit: 1 })
      
      children.push({
        id: 'house_documents',
        name: 'house_documents',
        path: houseDocsPath,
        type: 'folder',
        displayName: 'Hausdokumente',
        children: [],
        isEmpty: !houseDocsContents || houseDocsContents.filter((item: any) => item.name !== '.keep').length === 0
      })

      // Get apartments for this house
      const houseApartments = apartments?.filter((a: any) => a.haus_id === houseId) || []

      for (const apartment of houseApartments) {
        const apartmentPath = `${folderPath}/${apartment.id}`
        
        // Count direct files in apartment folder
        const fileCount = await countDirectFiles(supabase, apartmentPath)
        
        children.push({
          id: apartment.id,
          name: apartment.id,
          path: apartmentPath,
          type: 'folder',
          displayName: apartment.name,
          children: [],
          isEmpty: fileCount === 0
        })
      }
    } else if (isApartmentFolder) {
      const apartmentId = pathSegments[2]
      
      // Add apartment documents folder
      const apartmentDocsPath = `${folderPath}/apartment_documents`
      const { data: apartmentDocsContents } = await supabase.storage
        .from('documents')
        .list(apartmentDocsPath, { limit: 1 })
      
      children.push({
        id: 'apartment_documents',
        name: 'apartment_documents',
        path: apartmentDocsPath,
        type: 'folder',
        displayName: 'Wohnungsdokumente',
        children: [],
        isEmpty: !apartmentDocsContents || apartmentDocsContents.filter((item: any) => item.name !== '.keep').length === 0
      })

      // Get tenants for this apartment
      const apartmentTenants = tenants?.filter((t: any) => t.wohnung_id === apartmentId) || []

      for (const tenant of apartmentTenants) {
        const tenantPath = `${folderPath}/${tenant.id}`
        
        // Count direct files in tenant folder
        const fileCount = await countDirectFiles(supabase, tenantPath)
        
        children.push({
          id: tenant.id,
          name: tenant.id,
          path: tenantPath,
          type: 'folder',
          displayName: tenant.name,
          children: [],
          isEmpty: fileCount === 0
        })
      }
    } else {
      // This is either a custom folder, Miscellaneous, or a subfolder
      // Load storage contents directly
      const { data: contents } = await supabase.storage
        .from('documents')
        .list(folderPath, { limit: 100 })

      if (contents) {
        const discoveredFolders = new Set<string>()
        
        // First pass: find direct subfolders
        for (const item of contents) {
          if (item.name === '.keep') continue
          
          const isFolder = (item.metadata === null || item.metadata === undefined) && 
                          !item.name.includes('.') && 
                          item.name !== '.keep'
          
          if (isFolder) {
            discoveredFolders.add(item.name)
          }
        }

        // Second pass: find nested folders from file paths
        for (const item of contents) {
          if (item.name && item.name.includes('/')) {
            const nestedFolderName = item.name.split('/')[0]
            discoveredFolders.add(nestedFolderName)
          }
        }

        // Create tree nodes for discovered folders
        for (const folderName of discoveredFolders) {
          const childPath = `${folderPath}/${folderName}`
          
          try {
            // Count direct files in this folder
            const fileCount = await countDirectFiles(supabase, childPath)
            const isEmpty = fileCount === 0
            
            // Determine display name based on context
            let displayName = folderName
            
            // If this folder name matches a house ID, use house name
            if (houseIds.has(folderName)) {
              const house = houses?.find((h: any) => h.id === folderName)
              displayName = house?.name || folderName
            }
            // If this folder name matches an apartment ID, use apartment name
            else if (apartmentIds.has(folderName)) {
              const apartment = apartments?.find((a: any) => a.id === folderName)
              displayName = apartment?.name || folderName
            }
            // If this folder name matches a tenant ID, use tenant name
            else if (tenantIds.has(folderName)) {
              const tenant = tenants?.find((t: any) => t.id === folderName)
              displayName = tenant?.name || folderName
            }
            // Special folder names
            else if (folderName === 'house_documents') {
              displayName = 'Hausdokumente'
            }
            else if (folderName === 'apartment_documents') {
              displayName = 'Wohnungsdokumente'
            }
            
            children.push({
              id: folderName,
              name: folderName,
              path: childPath,
              type: 'folder',
              displayName,
              children: [],
              isEmpty,
              fileCount
            })
          } catch (error) {
            // Skip problematic folders
            console.warn(`Could not access folder ${childPath}:`, error)
            continue
          }
        }
      }
    }

  } catch (error) {
    console.error('Error loading folder children:', error)
  }

  return children.sort((a, b) => {
    // Sort by display name, with special folders first
    const aName = a.displayName || a.name
    const bName = b.displayName || b.name
    
    // Documents folders first
    if (aName.includes('dokumente') && !bName.includes('dokumente')) return -1
    if (!aName.includes('dokumente') && bName.includes('dokumente')) return 1
    
    return aName.localeCompare(bName)
  })
}

// Helper function to count direct files only (not recursive)
async function countDirectFiles(supabase: any, path: string): Promise<number> {
  try {
    const { data: contents, error } = await supabase.storage
      .from('documents')
      .list(path, { limit: 100 })
    
    if (error || !contents) return 0
    
    let fileCount = 0
    
    for (const item of contents) {
      if (item.name === '.keep') continue
      
      if (item.metadata?.size) {
        // It's a file - count it
        fileCount++
      }
      // Don't count folders or recurse into them
    }
    
    return fileCount
  } catch (error) {
    return 0
  }
}