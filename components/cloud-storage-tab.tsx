"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Folder, Upload, FileText, Image, Download, Trash2 } from "lucide-react"

export function CloudStorageTab() {
  const [currentPath, setCurrentPath] = useState("root")

  // Mock data for initial display
  const folders = [
    { name: "Häuser", path: "haeuser", type: "category", fileCount: 0 },
    { name: "Wohnungen", path: "wohnungen", type: "category", fileCount: 0 },
    { name: "Mieter", path: "mieter", type: "category", fileCount: 0 },
    { name: "Sonstiges", path: "sonstiges", type: "category", fileCount: 0 },
  ]

  const files: any[] = [
    // Mock files for demonstration
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Storage</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Dokumente und Dateien zentral
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Dateien hochladen
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File Tree Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Navigation</CardTitle>
            <CardDescription>
              Ordnerstruktur durchsuchen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setCurrentPath(folder.path)}
                >
                  <div className="flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{folder.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {folder.fileCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentPath === "root" ? "Alle Ordner" : currentPath}
              </CardTitle>
              <CardDescription>
                {files.length === 0 
                  ? "Noch keine Dateien vorhanden" 
                  : `${files.length} Dateien`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Dateien</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Laden Sie Ihre ersten Dateien hoch, um zu beginnen.
                  </p>
                  <Button className="mt-4">
                    <Upload className="mr-2 h-4 w-4" />
                    Dateien hochladen
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {files.map((file: any) => (
                    <div
                      key={file.id}
                      className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <span className="text-sm font-medium text-center truncate w-full">
                          {file.name}
                        </span>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
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