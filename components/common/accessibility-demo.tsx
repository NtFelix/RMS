"use client"

import React, { useState } from 'react'
import { CustomCombobox, ComboboxOption } from '@/components/ui/custom-combobox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const demoOptions: ComboboxOption[] = [
  { value: 'option1', label: 'First Option' },
  { value: 'option2', label: 'Second Option' },
  { value: 'option3', label: 'Third Option (Disabled)', disabled: true },
  { value: 'option4', label: 'Fourth Option' },
  { value: 'option5', label: 'Fifth Option' },
]

export function AccessibilityDemo() {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accessible Dropdown Demo</CardTitle>
        <CardDescription>
          Try using keyboard navigation with this dropdown:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="demo-combobox" className="block text-sm font-medium mb-2">
            Select an option:
          </label>
          <CustomCombobox
            id="demo-combobox"
            options={demoOptions}
            value={selectedValue}
            onChange={setSelectedValue}
            placeholder="Choose an option..."
            searchPlaceholder="Search options..."
            emptyText="No options found"
            width="w-full"
          />
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Keyboard shortcuts:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> Navigate options</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Select option</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> Close dropdown</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Home</kbd> First option</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">End</kbd> Last option</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Tab</kbd> Close and move focus</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Type</kbd> Auto-search (no click needed!)</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Backspace</kbd> Delete search text</li>
          </ul>
          <p className="text-xs italic mt-2">
            💡 Try typing directly on the dropdown button - it will open and start searching automatically!
          </p>
        </div>

        {selectedValue && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <strong>Selected:</strong> {demoOptions.find(opt => opt.value === selectedValue)?.label}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}