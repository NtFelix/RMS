"use client"

import React from 'react'
import { FolderTreeNavigation } from '../folder-tree-navigation'
import { FolderNode } from '@/types/cloud-storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

const mockFolders: FolderNode[] = [
  {
    id: '1',
    name: 'Häuser',
    path: '/haeuser',
    type: 'category',
    children: [
      {
        id: '1-1',
        name: 'Haus Berlin Mitte',
        path: '/haeuser/haus-berlin-mitte',
        type: 'entity',
        entityType: 'haus',
        entityId: 'haus-1',
        children: [
          {
            id: '1-1-1',
            name: 'Verträge',
            path: '/haeuser/haus-berlin-mitte/vertraege',
            type: 'custom',
            children: [],
            fileCount: 5,
            parentPath: '/haeuser/haus-berlin-mitte',
          },
          {
            id: '1-1-2',
            name: 'Rechnungen',
            path: '/haeuser/haus-berlin-mitte/rechnungen',
            type: 'custom',
            children: [],
            fileCount: 12,
            parentPath: '/haeuser/haus-berlin-mitte',
          },
        ],
        fileCount: 17,
      },
      {
        id: '1-2',
        name: 'Haus München',
        path: '/haeuser/haus-muenchen',
        type: 'entity',
        entityType: 'haus',
        entityId: 'haus-2',
        children: [],
        fileCount: 8,
      },
    ],
    fileCount: 25,
  },
  {
    id: '2',
    name: 'Wohnungen',
    path: '/wohnungen',
    type: 'category',
    children: [
      {
        id: '2-1',
        name: 'Wohnung 1A - Berlin',
        path: '/wohnungen/wohnung-1a-berlin',
        type: 'entity',
        entityType: 'wohnung',
        entityId: 'wohnung-1',
        children: [
          {
            id: '2-1-1',
            name: 'Übergabeprotokoll',
            path: '/wohnungen/wohnung-1a-berlin/uebergabeprotokoll',
            type: 'custom',
            children: [],
            fileCount: 2,
            parentPath: '/wohnungen/wohnung-1a-berlin',
          },
        ],
        fileCount: 6,
      },
      {
        id: '2-2',
        name: 'Wohnung 2B - München',
        path: '/wohnungen/wohnung-2b-muenchen',
        type: 'entity',
        entityType: 'wohnung',
        entityId: 'wohnung-2',
        children: [],
        fileCount: 3,
      },
    ],
    fileCount: 9,
  },
  {
    id: '3',
    name: 'Mieter',
    path: '/mieter',
    type: 'category',
    children: [
      {
        id: '3-1',
        name: 'Max Mustermann',
        path: '/mieter/max-mustermann',
        type: 'entity',
        entityType: 'mieter',
        entityId: 'mieter-1',
        children: [
          {
            id: '3-1-1',
            name: 'Bewerbungsunterlagen',
            path: '/mieter/max-mustermann/bewerbungsunterlagen',
            type: 'custom',
            children: [],
            fileCount: 4,
            parentPath: '/mieter/max-mustermann',
          },
        ],
        fileCount: 7,
      },
      {
        id: '3-2',
        name: 'Anna Schmidt',
        path: '/mieter/anna-schmidt',
        type: 'entity',
        entityType: 'mieter',
        entityId: 'mieter-2',
        children: [],
        fileCount: 2,
      },
    ],
    fileCount: 9,
  },
  {
    id: '4',
    name: 'Sonstiges',
    path: '/sonstiges',
    type: 'category',
    children: [
      {
        id: '4-1',
        name: 'Steuerunterlagen',
        path: '/sonstiges/steuerunterlagen',
        type: 'custom',
        children: [],
        fileCount: 15,
        parentPath: '/sonstiges',
      },
      {
        id: '4-2',
        name: 'Versicherungen',
        path: '/sonstiges/versicherungen',
        type: 'custom',
        children: [],
        fileCount: 6,
        parentPath: '/sonstiges',
      },
    ],
    fileCount: 21,
  },
]

export const FolderTreeNavigationDemo: React.FC = () => {
  const [selectedFolderPath, setSelectedFolderPath] = React.useState<string>()
  const [folders, setFolders] = React.useState<FolderNode[]>(mockFolders)

  const handleFolderSelect = (folder: FolderNode) => {
    setSelectedFolderPath(folder.path)
    toast({
      title: "Ordner ausgewählt",
      description: `${folder.name} (${folder.fileCount} Dateien)`,
    })
  }

  const handleCreateFolder = (parentPath: string) => {
    const folderName = prompt('Ordnername eingeben:')
    if (folderName) {
      toast({
        title: "Ordner erstellen",
        description: `Neuer Ordner "${folderName}" in ${parentPath}`,
      })
    }
  }

  const handleRenameFolder = (folderPath: string, currentName: string) => {
    const newName = prompt('Neuer Ordnername:', currentName)
    if (newName && newName !== currentName) {
      toast({
        title: "Ordner umbenennen",
        description: `"${currentName}" → "${newName}"`,
      })
    }
  }

  const handleDeleteFolder = (folderPath: string, folderName: string) => {
    if (confirm(`Ordner "${folderName}" wirklich löschen?`)) {
      toast({
        title: "Ordner gelöscht",
        description: `"${folderName}" wurde gelöscht`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Folder Tree Navigation Demo</h1>
        <p className="text-muted-foreground">
          Interaktive Demo der Ordnernavigation mit verschiedenen Ordnertypen und Kontextmenüs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ordnernavigation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 border rounded-md">
              <FolderTreeNavigation
                folders={folders}
                selectedFolderPath={selectedFolderPath}
                onFolderSelect={handleFolderSelect}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funktionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Ordnertypen</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>🏠 <strong>Häuser:</strong> Kategorie-Ordner für Immobilien</li>
                <li>🏢 <strong>Wohnungen:</strong> Kategorie-Ordner für Wohneinheiten</li>
                <li>👤 <strong>Mieter:</strong> Kategorie-Ordner für Mieter</li>
                <li>📁 <strong>Benutzerdefiniert:</strong> Selbst erstellte Ordner</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Interaktionen</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Klick:</strong> Ordner auswählen und erweitern/reduzieren</li>
                <li>• <strong>Rechtsklick:</strong> Kontextmenü öffnen</li>
                <li>• <strong>Chevron:</strong> Nur erweitern/reduzieren</li>
                <li>• <strong>Plus-Button:</strong> Neuen Ordner erstellen</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Kontextmenü</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Neuer Ordner:</strong> Verfügbar für alle Ordner</li>
                <li>• <strong>Umbenennen:</strong> Nur für benutzerdefinierte Ordner</li>
                <li>• <strong>Löschen:</strong> Nur für benutzerdefinierte Ordner</li>
              </ul>
            </div>

            {selectedFolderPath && (
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-semibold mb-1">Ausgewählter Ordner</h4>
                <p className="text-sm text-muted-foreground">{selectedFolderPath}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}