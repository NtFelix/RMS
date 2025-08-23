"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Folder, Upload, FileText, Image, Download, Trash2, RefreshCw } from "lucide-react"
import { FileTreeView } from "@/components/file-tree-view"
import { FileBreadcrumbNavigation } from "@/components/file-breadcrumb-navigation"
import { FileUploadZone } from "@/components/file-upload-zone"
import { useCloudStorageStore } from "@/hooks/use-cloud-storage-store"
import { createClient } from "@/utils/supabase/client"

interface CloudStorageTabProps {
  userId?: string
}

export function CloudStorageTab({ userId = "demo-user" }: CloudStorageTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showUploadZone, setShowUploadZone] = useState(false)
  
  const { 
    currentPath, 
    files, 
    folders, 
    isLoading, 
    error,
    breadcrumbs,
    navigateToPath,
    setBreadcrumbs,
    setFiles,
    setFolders,
    setLoading,
    setError,
    refreshCurrentPath
  } = useCloudStorageStore()

  // Initialize with root path
  useEffect(() => {
    if (!currentPath) {
      navigateToPath(`user_${userId}`)
      setBreadcrumbs([{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }])
    }
  }, [userId, currentPath, navigateToPath, setBreadcrumbs])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshCurrentPath()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get current folder name for display
  const getCurrentFolderName = () => {
    if (breadcrumbs.length === 0) return "Cloud Storage"
    return breadcrumbs[breadcrumbs.length - 1].name
  }

  // Handle upload completion
  const handleUploadComplete = () => {
    refreshCurrentPath()
    setShowUploadZone(false)
  }

  // Toggle upload zone
  const toggleUploadZone = () => {
    setShowUploadZone(!showUploadZone)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Storage</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Dokumente und Dateien zentral
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button onClick={toggleUploadZone}>
            <Upload className="mr-2 h-4 w-4" />
            {showUploadZone ? "Upload schließen" : "Dateien hochladen"}
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-muted/30 rounded-lg p-3">
        <FileBreadcrumbNavigation />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Upload Zone */}
      {showUploadZone && (
        <FileUploadZone
          targetPath={currentPath}
          onUploadComplete={handleUploadComplete}
          disabled={!currentPath}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File Tree Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Navigation</CardTitle>
            <CardDescription>
              Ordnerstruktur durchsuchen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <FileTreeView userId={userId} />
          </CardContent>
        </Card>

        {/* File List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                {getCurrentFolderName()}
                {isLoading && (
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                )}
              </CardTitle>
              <CardDescription>
                {isLoading 
                  ? "Lade Dateien..." 
                  : files.length === 0 
                    ? "Noch keine Dateien vorhanden" 
                    : `${files.length} Dateien`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex flex-col items-center space-y-2">
                            <div className="h-8 w-8 bg-muted rounded" />
                            <div className="h-4 w-16 bg-muted rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Dateien</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Laden Sie Ihre ersten Dateien hoch, um zu beginnen.
                  </p>
                  <Button className="mt-4" onClick={toggleUploadZone}>
                    <Upload className="mr-2 h-4 w-4" />
                    Dateien hochladen
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <span className="text-sm font-medium text-center truncate w-full" title={file.name}>
                          {file.name}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(file.updated_at).toLocaleDateString('de-DE')}
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" title="Herunterladen">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Löschen">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}