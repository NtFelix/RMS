import { createClient } from '@/utils/supabase/server'
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

    const supabase = await createClient()
    
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
    isEmpty: false
  })

  try {
    // Get houses from database
    const { data: houses } = await supabase
      .from('Haeuser')
      .select('id, name')
      .eq('user_id', userId)
      .order('name')

    // Add house folders
    if (houses && houses.length > 0) {
      for (const house of houses) {
        const housePath = `${rootPath}/${house.id}`
        
        // Check if house folder has content
        const { data: houseContents } = await supabase.storage
          .from('documents')
          .list(housePath, { limit: 1 })
        
        tree.push({
          id: house.id,
          name: house.id,
          path: housePath,
          type: 'folder',
          displayName: house.name,
          children: [],
          isEmpty: !houseContents || houseContents.length === 0
        })
      }
    }

    // Add miscellaneous folder
    const miscPath = `${rootPath}/Miscellaneous`
    const { data: miscContents } = await supabase.storage
      .from('documents')
      .list(miscPath, { limit: 1 })
    
    tree.push({
      id: 'Miscellaneous',
      name: 'Miscellaneous',
      path: miscPath,
      type: 'folder',
      displayName: 'Sonstiges',
      children: [],
      isEmpty: !miscContents || miscContents.length === 0
    })

    // Discover custom folders
    const { data: rootContents } = await supabase.storage
      .from('documents')
      .list(rootPath, { limit: 1000 })

    if (rootContents) {
      const customFolders = new Set<string>()
      
      for (const item of rootContents) {
        if (item.name && item.name.includes('/')) {
          const folderName = item.name.split('/')[0]
          if (!tree.some(t => t.name === folderName)) {
            customFolders.add(folderName)
          }
        } else if (item.name && !item.metadata && !item.name.includes('.')) {
          if (!tree.some(t => t.name === item.name)) {
            customFolders.add(item.name)
          }
        }
      }

      // Add custom folders
      for (const folderName of customFolders) {
        const folderPath = `${rootPath}/${folderName}`
        
        try {
          const { data: folderContents } = await supabase.storage
            .from('documents')
            .list(folderPath, { limit: 1 })
          
          tree.push({
            id: folderName,
            name: folderName,
            path: folderPath,
            type: 'folder',
            displayName: folderName,
            children: [],
            isEmpty: !folderContents || folderContents.filter((item: any) => item.name !== '.keep').length === 0
          })
        } catch (error) {
          // Skip problematic folders
          continue
        }
      }
    }

  } catch (error) {
    console.error('Error loading root tree:', error)
  }

  return tree
}

async function loadFolderChildren(supabase: any, userId: string, folderPath: string): Promise<TreeNode[]> {
  const children: TreeNode[] = []

  try {
    // Check if this is a house folder
    const pathSegments = folderPath.split('/')
    const isHouseFolder = pathSegments.length === 2 && pathSegments[1] !== 'Miscellaneous'
    const isApartmentFolder = pathSegments.length === 3 && pathSegments[1] !== 'Miscellaneous'

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
      const { data: apartments } = await supabase
        .from('Wohnungen')
        .select('id, name')
        .eq('haus_id', houseId)
        .eq('user_id', userId)
        .order('name')

      if (apartments && apartments.length > 0) {
        for (const apartment of apartments) {
          const apartmentPath = `${folderPath}/${apartment.id}`
          
          // Count files in apartment folder
          const fileCount = await countFilesRecursively(supabase, apartmentPath)
          
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
      }
    } else if (isApartmentFolder) {
      const houseId = pathSegments[1]
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
      const { data: tenants } = await supabase
        .from('Mieter')
        .select('id, name')
        .eq('wohnung_id', apartmentId)
        .eq('user_id', userId)
        .order('name')

      if (tenants && tenants.length > 0) {
        for (const tenant of tenants) {
          const tenantPath = `${folderPath}/${tenant.id}`
          
          // Count files in tenant folder
          const fileCount = await countFilesRecursively(supabase, tenantPath)
          
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
      }
    } else {
      // Load storage contents for other folders
      const { data: contents } = await supabase.storage
        .from('documents')
        .list(folderPath, { limit: 100 })

      if (contents) {
        // Process folders
        for (const item of contents) {
          if (item.name === '.keep') continue
          
          const isFolder = (item.metadata === null || item.metadata === undefined) && 
                          !item.name.includes('.') && 
                          item.name !== '.keep'
          
          if (isFolder) {
            const childPath = `${folderPath}/${item.name}`
            
            // Check if folder has contents
            const { data: childContents } = await supabase.storage
              .from('documents')
              .list(childPath, { limit: 1 })
            
            children.push({
              id: item.name,
              name: item.name,
              path: childPath,
              type: 'folder',
              displayName: item.name,
              children: [],
              isEmpty: !childContents || childContents.filter((child: any) => child.name !== '.keep').length === 0
            })
          }
        }

        // Discover nested folders
        const discoveredFolders = new Set<string>()
        
        for (const item of contents) {
          if (item.name && item.name.includes('/')) {
            const nestedFolderName = item.name.split('/')[0]
            if (!children.some(c => c.name === nestedFolderName)) {
              discoveredFolders.add(nestedFolderName)
            }
          }
        }

        // Add discovered folders
        for (const folderName of discoveredFolders) {
          const childPath = `${folderPath}/${folderName}`
          
          try {
            const { data: childContents } = await supabase.storage
              .from('documents')
              .list(childPath, { limit: 1 })
            
            children.push({
              id: folderName,
              name: folderName,
              path: childPath,
              type: 'folder',
              displayName: folderName,
              children: [],
              isEmpty: !childContents || childContents.filter((child: any) => child.name !== '.keep').length === 0
            })
          } catch (error) {
            // Skip problematic folders
            continue
          }
        }
      }
    }

  } catch (error) {
    console.error('Error loading folder children:', error)
  }

  return children.sort((a, b) => a.displayName?.localeCompare(b.displayName || '') || a.name.localeCompare(b.name))
}

// Helper function to count files recursively
async function countFilesRecursively(supabase: any, path: string): Promise<number> {
  try {
    const { data: contents, error } = await supabase.storage
      .from('documents')
      .list(path, { limit: 100 })
    
    if (error || !contents) return 0
    
    let fileCount = 0
    
    for (const item of contents) {
      if (item.name === '.keep') continue
      
      if (item.metadata?.size) {
        fileCount++
      } else if (!item.name.includes('.')) {
        // It's a folder, count recursively (with depth limit)
        const depth = (path.match(/\//g) || []).length
        if (depth < 10) {
          const subPath = `${path}/${item.name}`
          fileCount += await countFilesRecursively(supabase, subPath)
        }
      }
    }
    
    return fileCount
  } catch (error) {
    return 0
  }
}