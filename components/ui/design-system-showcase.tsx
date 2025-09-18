"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DesignSystemShowcaseProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

const DesignSystemShowcase = React.forwardRef<HTMLDivElement, DesignSystemShowcaseProps>(
  ({ className, title = "Design System Showcase", ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState("")
    const [isChecked, setIsChecked] = React.useState(false)

    return (
      <div
        ref={ref}
        className={cn(
          "max-w-4xl mx-auto p-8 space-y-8",
          className
        )}
        {...props}
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">
            Demonstrating the enhanced design system with consistent border-radius and animations
          </p>
        </div>

        {/* Interactive Elements Section */}
        <Card className="p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Interactive Elements</CardTitle>
            <CardDescription>
              All interactive elements follow consistent animation patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buttons */}
            <div className="space-y-4">
              <h3 className="font-semibold">Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Primary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large Button</Button>
              </div>
            </div>

            {/* Form Elements */}
            <div className="space-y-4">
              <h3 className="font-semibold">Form Elements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">Input Field</Label>
                  <Input 
                    id="demo-input" 
                    placeholder="Notice the subtle focus animation..." 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-select">Select Dropdown</Label>
                  <Select value={selectedValue} onValueChange={setSelectedValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="demo-checkbox" 
                  checked={isChecked}
                  onCheckedChange={setIsChecked}
                />
                <Label htmlFor="demo-checkbox">
                  Checkbox with hover animation
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nested Radius Formula Examples */}
        <Card className="p-8 rounded-2xl shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Nested Radius Formula</CardTitle>
            <CardDescription>
              Demonstrating: Outer radius = Inner radius + Padding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Example 1: Large container */}
            <div className="p-6 bg-muted/30 border rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Container: rounded-2xl (16px) + p-6 (24px)</Badge>
              </div>
              
              <div className="p-4 bg-background border rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Child: rounded-xl (12px) + p-4 (16px)</Badge>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <Badge variant="outline" className="text-xs">
                    Grandchild: rounded-lg (8px) + p-3 (12px)
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Each nested level follows the formula: 16px → 12px → 8px
                  </p>
                </div>
              </div>
            </div>

            {/* Example 2: Medium container */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Badge>Container: rounded-xl (12px) + p-4 (16px)</Badge>
              </div>
              
              <div className="p-3 bg-background border rounded-lg">
                <Badge variant="secondary" className="text-xs">
                  Child: rounded-lg (8px) + p-3 (12px)
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Formula applied: 12px → 8px
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animation Examples */}
        <Card className="p-8 rounded-2xl shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Animation Patterns</CardTitle>
            <CardDescription>
              Consistent micro-interactions throughout the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-xl text-center space-y-2 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-full mx-auto"></div>
                <p className="text-sm font-medium">Hover Scale</p>
                <p className="text-xs text-muted-foreground">scale-[1.02]</p>
              </div>
              
              <div className="p-4 border rounded-xl text-center space-y-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="w-8 h-8 bg-secondary rounded-full mx-auto"></div>
                <p className="text-sm font-medium">Hover Lift</p>
                <p className="text-xs text-muted-foreground">-translate-y-1</p>
              </div>
              
              <div className="p-4 border rounded-xl text-center space-y-2 hover:shadow-md hover:border-ring/50 transition-all duration-200 cursor-pointer">
                <div className="w-8 h-8 bg-accent rounded-full mx-auto"></div>
                <p className="text-sm font-medium">Border Glow</p>
                <p className="text-xs text-muted-foreground">border-ring/50</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Design Principles */}
        <Card className="p-8 rounded-2xl shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Design Principles</CardTitle>
            <CardDescription>
              Key principles applied throughout the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Border Radius</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Base radius: 12px (0.75rem)</li>
                  <li>• Nested formula: Outer = Inner + Padding</li>
                  <li>• Consistent scaling: xl → lg → md</li>
                  <li>• Pill shapes for interactive elements</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Animations</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Interactive elements: 200ms duration</li>
                  <li>• Modals/overlays: 300ms duration</li>
                  <li>• Subtle scale effects: 1.02 on hover</li>
                  <li>• GPU-accelerated transforms</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
)

DesignSystemShowcase.displayName = "DesignSystemShowcase"

export { DesignSystemShowcase }