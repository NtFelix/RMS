"use client";

import React from "react";
import { DatePicker } from "./date-picker";
import { LabelWithTooltip } from "./label-with-tooltip";
import { validateDateRange, formatPeriodDuration, germanToIsoDate, isoToGermanDate } from "@/utils/date-calculations";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  disabled?: boolean;
  className?: string;
  showPeriodInfo?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  className = "",
  showPeriodInfo = true
}: DateRangePickerProps) {
  const validation = validateDateRange(startDate, endDate);
  const hasError = !validation.isValid;
  
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      // Convert Date to German format string
      const germanDate = date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      onStartDateChange(germanDate);
    } else {
      onStartDateChange('');
    }
  };
  
  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      // Convert Date to German format string
      const germanDate = date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      onEndDateChange(germanDate);
    } else {
      onEndDateChange('');
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            htmlFor="startdatum" 
            infoText="Das Startdatum des Abrechnungszeitraums. Klicken Sie auf das Kalender-Icon für die Datumsauswahl."
          >
            Startdatum *
          </LabelWithTooltip>
          <DatePicker
            id="startdatum"
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="Startdatum auswählen"
            disabled={disabled}
            className={hasError && validation.errors.startdatum ? "border-red-500" : ""}
          />
          {validation.errors.startdatum && (
            <p className="text-sm text-red-600">{validation.errors.startdatum}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <LabelWithTooltip 
            htmlFor="enddatum" 
            infoText="Das Enddatum des Abrechnungszeitraums. Klicken Sie auf das Kalender-Icon für die Datumsauswahl."
          >
            Enddatum *
          </LabelWithTooltip>
          <DatePicker
            id="enddatum"
            value={endDate}
            onChange={handleEndDateChange}
            placeholder="Enddatum auswählen"
            disabled={disabled}
            className={hasError && validation.errors.enddatum ? "border-red-500" : ""}
          />
          {validation.errors.enddatum && (
            <p className="text-sm text-red-600">{validation.errors.enddatum}</p>
          )}
        </div>
      </div>
      
      {/* Period information and validation messages */}
      {showPeriodInfo && (
        <div className="space-y-2">
          {validation.isValid && validation.periodDays && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Abrechnungszeitraum:</strong> {formatPeriodDuration(startDate, endDate)}
            </div>
          )}
          
          {validation.errors.range && (
            <p className={`text-sm ${validation.errors.range.startsWith('Warnung') ? 'text-yellow-600' : 'text-red-600'}`}>
              {validation.errors.range}
            </p>
          )}
        </div>
      )}
    </div>
  );
}