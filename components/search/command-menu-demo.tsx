"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { useCommandMenu } from '@/hooks/use-command-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Command } from 'lucide-react'

export function CommandMenuDemo() {
  const { setOpen } = useCommandMenu()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Command className="h-5 w-5" />
          Command Menu Demo
        </CardTitle>
        <CardDescription>
          Test the auto-focus functionality of the command menu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            onClick={() => setOpen(true)}
            className="w-full"
            variant="outline"
          >
            <Search className="mr-2 h-4 w-4" />
            Open Command Menu
          </Button>

          <p className="text-sm text-muted-foreground">
            Click the button above or press <kbd className="px-1 py-0.5 bg-muted rounded">⌘K</kbd> to open the command menu.
          </p>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Auto-Focus Features:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Input field automatically focused when opened</li>
            <li>Works with both button click and keyboard shortcut</li>
            <li>Cursor positioned at end of existing text</li>
            <li>Search cleared when menu is closed</li>
            <li>Multiple focus attempts to handle race conditions</li>
          </ul>
        </div>

        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm">
            <strong>Try it:</strong> Open the command menu and notice how the input field is immediately ready for typing without needing to click it first!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}