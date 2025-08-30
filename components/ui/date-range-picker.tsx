"use client";

import React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { LabelWithTooltip } from "./label-with-tooltip";
import { validateDateRange, formatPeriodDuration, germanToIsoDate } from "@/utils/date-calculations";

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
  
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStartDateChange(e.target.value);
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEndDateChange(e.target.value);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <LabelWithTooltip 
            htmlFor="startdatum" 
            infoText="Das Startdatum des Abrechnungszeitraums im Format TT.MM.JJJJ"
          >
            Startdatum *
          </LabelWithTooltip>
          <Input
            id="startdatum"
            type="text"
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="TT.MM.JJJJ (z.B. 01.01.2024)"
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
            infoText="Das Enddatum des Abrechnungszeitraums im Format TT.MM.JJJJ"
          >
            Enddatum *
          </LabelWithTooltip>
          <Input
            id="enddatum"
            type="text"
            value={endDate}
            onChange={handleEndDateChange}
            placeholder="TT.MM.JJJJ (z.B. 31.12.2024)"
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