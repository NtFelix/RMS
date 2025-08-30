"use client";

import React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { LabelWithTooltip } from "./label-with-tooltip";
import { validateDateRange, formatPeriodDuration } from "@/utils/date-calculations";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  className = ""
}: DateRangePickerProps) {
  const validation = validateDateRange(startDate, endDate);
  const hasError = !validation.isValid;
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            htmlFor="startdatum" 
            infoText="Das Startdatum des Abrechnungszeitraums"
          >
            Startdatum *
          </LabelWithTooltip>
          <Input
            id="startdatum"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
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
            infoText="Das Enddatum des Abrechnungszeitraums"
          >
            Enddatum *
          </LabelWithTooltip>
          <Input
            id="enddatum"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={disabled}
            className={hasError && validation.errors.enddatum ? "border-red-500" : ""}
          />
          {validation.errors.enddatum && (
            <p className="text-sm text-red-600">{validation.errors.enddatum}</p>
          )}
        </div>
      </div>
      
      {/* Period information and validation messages */}
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
    </div>
  );
}