'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  FileText, 
  AtSign, 
  Slash, 
  Save, 
  Sparkles,
  CheckCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  highlight?: string
  duration?: number
}

interface TemplateOnboardingProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  context: 'new-user' | 'new-template' | 'editor-features'
  className?: string
}

const onboardingSteps: Record<string, OnboardingStep[]> = {
  'new-user': [
    {
      id: 'welcome',
      title: 'Willkommen zum Template-Editor!',
      description: 'Erstellen Sie professionelle Dokumentvorlagen in wenigen Minuten.',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg">
            <FileText className="h-16 w-16 text-blue-500 animate-bounce-in" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Dieser kurze Rundgang zeigt Ihnen die wichtigsten Funktionen.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Interaktiv
              </Badge>
              <Badge variant="secondary" className="text-xs">
                3 Minuten
              </Badge>
            </div>
          </div>
        </div>
      ),
      duration: 5000
    },
    {
      id: 'title-input',
      title: 'Titel eingeben',
      description: 'Beginnen Sie mit einem aussagekräftigen Titel für Ihre Vorlage.',
      content: (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titel der Vorlage</label>
              <div className="relative">
                <input 
                  className="w-full p-2 border rounded-md bg-background animate-pulse"
                  placeholder="z.B. Mietvertrag Wohnung..."
                  disabled
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-bounce">
                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>💡 <strong>Tipp:</strong> Verwenden Sie beschreibende Namen</p>
            <p>✅ Gut: "Mietvertrag Wohnung"</p>
            <p>❌ Schlecht: "Vorlage 1"</p>
          </div>
        </div>
      ),
      highlight: '[data-testid="template-title"]',
      duration: 8000
    },
    {
      id: 'editor-basics',
      title: 'Editor verwenden',
      description: 'Schreiben Sie Ihren Text und formatieren Sie ihn nach Belieben.',
      content: (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Slash className="h-4 w-4 text-blue-500" />
                <span>Tippen Sie <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/</kbd> für Formatierungsoptionen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AtSign className="h-4 w-4 text-green-500" />
                <span>Tippen Sie <kbd className="px-1 py-0.5 bg-muted rounded text-xs">@</kbd> für Variablen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Save className="h-4 w-4 text-purple-500" />
                <span>Drücken Sie <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+S</kbd> zum Speichern</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Der Editor unterstützt alle gängigen Formatierungen wie <strong>Fett</strong>, <em>Kursiv</em> und Listen.
          </div>
        </div>
      ),
      highlight: '.ProseMirror',
      duration: 10000
    },
    {
      id: 'variables',
      title: 'Variablen hinzufügen',
      description: 'Machen Sie Ihre Vorlagen dynamisch mit Variablen.',
      content: (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AtSign className="h-5 w-5 text-green-500" />
                <span className="font-medium">Verfügbare Variablen:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Badge variant="outline" className="justify-start">
                  <span className="text-green-600">@mieter_name</span>
                </Badge>
                <Badge variant="outline" className="justify-start">
                  <span className="text-green-600">@adresse</span>
                </Badge>
                <Badge variant="outline" className="justify-start">
                  <span className="text-green-600">@datum</span>
                </Badge>
                <Badge variant="outline" className="justify-start">
                  <span className="text-green-600">@miete</span>
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Variablen werden automatisch durch echte Werte ersetzt, wenn Sie die Vorlage verwenden.
          </div>
        </div>
      ),
      duration: 8000
    },
    {
      id: 'completion',
      title: 'Geschafft! 🎉',
      description: 'Sie sind bereit, professionelle Vorlagen zu erstellen.',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg">
            <CheckCircle className="h-16 w-16 text-green-500 animate-bounce-in" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Sie haben die Grundlagen gelernt! Probieren Sie es jetzt aus.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Titel eingeben</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Text formatieren</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Variablen verwenden</span>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'Loslegen',
        onClick: () => {}
      },
      duration: 5000
    }
  ],
  'new-template': [
    {
      id: 'quick-start',
      title: 'Neue Vorlage erstellen',
      description: 'Folgen Sie diesen Schritten für eine perfekte Vorlage.',
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <span className="text-sm">Aussagekräftigen Titel wählen</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-sm">Inhalt mit Text und Variablen erstellen</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <span className="text-sm">Speichern und testen</span>
          </div>
        </div>
      ),
      duration: 6000
    }
  ],
  'editor-features': [
    {
      id: 'advanced-features',
      title: 'Erweiterte Editor-Funktionen',
      description: 'Entdecken Sie alle Möglichkeiten des Editors.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg text-center">
              <Slash className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-xs font-medium">Slash-Befehle</div>
              <div className="text-xs text-muted-foreground">Schnelle Formatierung</div>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <AtSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-xs font-medium">Variablen</div>
              <div className="text-xs text-muted-foreground">Dynamische Inhalte</div>
            </div>
          </div>
        </div>
      ),
      duration: 5000
    }
  ]
}

export function TemplateOnboarding({
  isOpen,
  onClose,
  onComplete,
  context,
  className
}: TemplateOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)

  const steps = onboardingSteps[context] || []
  const step = steps[currentStep]

  // Auto-advance steps
  useEffect(() => {
    if (!isOpen || !isPlaying || !step?.duration) return

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (step.duration! / 100))
        if (newProgress >= 100) {
          handleNext()
          return 0
        }
        return newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [currentStep, isOpen, isPlaying, step?.duration])

  // Reset progress when step changes
  useEffect(() => {
    setProgress(0)
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
      setProgress(0)
    } else {
      onComplete()
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      setProgress(0)
    }
  }

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  const handleRestart = () => {
    setCurrentStep(0)
    setProgress(0)
    setIsPlaying(true)
  }

  if (!isOpen || !step) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className={cn(
        "w-full max-w-md animate-in slide-in-from-bottom duration-500",
        "shadow-2xl border-0 bg-gradient-to-br from-background via-background to-muted/20",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                {step.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1">
              <Progress 
                value={(currentStep / (steps.length - 1)) * 100} 
                className="h-1"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1}/{steps.length}
            </span>
          </div>
          
          {/* Auto-advance progress */}
          {step.duration && isPlaying && (
            <div className="mt-2">
              <Progress value={progress} className="h-0.5" />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step content */}
          <div className="animate-in fade-in duration-500">
            {step.content}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {step.duration && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-8 w-8 p-0"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs"
              >
                Überspringen
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="h-8"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Zurück
              </Button>
              
              <Button
                onClick={step.action?.onClick || handleNext}
                size="sm"
                className="h-8"
              >
                {step.action?.label || (currentStep === steps.length - 1 ? 'Fertig' : 'Weiter')}
                {!step.action && currentStep < steps.length - 1 && (
                  <ArrowRight className="h-3 w-3 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for managing onboarding state
export function useTemplateOnboarding() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [onboardingContext, setOnboardingContext] = useState<'new-user' | 'new-template' | 'editor-features'>('new-user')

  const startOnboarding = (context: 'new-user' | 'new-template' | 'editor-features') => {
    setOnboardingContext(context)
    setIsOnboardingOpen(true)
  }

  const closeOnboarding = () => {
    setIsOnboardingOpen(false)
  }

  const completeOnboarding = () => {
    // Save completion state to localStorage
    localStorage.setItem(`template-onboarding-${onboardingContext}`, 'completed')
    setIsOnboardingOpen(false)
  }

  const shouldShowOnboarding = (context: string) => {
    return !localStorage.getItem(`template-onboarding-${context}`)
  }

  return {
    isOnboardingOpen,
    onboardingContext,
    startOnboarding,
    closeOnboarding,
    completeOnboarding,
    shouldShowOnboarding
  }
}