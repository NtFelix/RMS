'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface AgentBuilderNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSave: () => void;
  isSaving: boolean;
  canProceed: boolean;
}

const STEP_LABELS = [
  'Basic Info',
  'Anweisungen',
  'Berechtigungen',
  'Trigger',
  'Aktionen',
  'Benachrichtigung',
  'Zugriffsrechte',
];

export function AgentBuilderNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSave,
  isSaving,
  canProceed,
}: AgentBuilderNavigationProps) {
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-[width] duration-300 ease-in-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="grid grid-cols-7 gap-1 text-center hidden md:grid">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span className={`text-[11px] truncate max-w-[80px] ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={currentStep === 1 || isSaving}
          className="gap-2 text-xs"
        >
          <ChevronLeft className="w-4 h-4" /> Zurück
        </Button>

        {currentStep < totalSteps ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isSaving}
            className="gap-2 text-xs"
          >
            Weiter <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSave}
            disabled={!canProceed || isSaving}
            className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? 'Speichert...' : 'Agent Speichern'}
          </Button>
        )}
      </div>
    </div>
  );
}
