"use client";

import React, { useRef } from "react";
import { formatNumber } from "@/utils/format";
import { createPortal } from "react-dom";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, Trash2, GripVertical } from "lucide-react";
import { normalizeBerechnungsart } from "@/utils/betriebskosten";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Mieter } from "@/lib/types";
import { BerechnungsartValue, BERECHNUNGSART_OPTIONS } from "@/lib/constants";

export interface CostItem {
  id: string;
  art: string;
  betrag: string;
  berechnungsart: BerechnungsartValue | '';
}

export interface RechnungEinzel {
  mieterId: string;
  betrag: string;
}

export interface SortableCostItemProps {
  item: CostItem;
  index: number;
  costItems: CostItem[];
  selectedHausMieter: Mieter[];
  rechnungen: Record<string, RechnungEinzel[]>;
  isSaving: boolean;
  isLoadingDetails: boolean;
  isFetchingTenants: boolean;
  hausId: string;
  onCostItemChange: (index: number, field: keyof Omit<CostItem, 'id'>, value: string | BerechnungsartValue) => void;
  onRemoveCostItem: (index: number) => void;
  onRechnungChange: (costItemId: string, mieterId: string, newBetrag: string) => void;
  hoveredBerechnungsart: BerechnungsartValue | '';
  selectContentRect: DOMRect | null;
  hoveredItemRect: DOMRect | null;
  tooltipMap: Record<BerechnungsartValue | '', string>;
  onItemHover: (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, value: BerechnungsartValue) => void;
  onItemLeave: () => void;
  selectContentRef: React.RefObject<HTMLDivElement | null>;
}

export function SortableCostItem({
  item,
  index,
  costItems,
  selectedHausMieter,
  rechnungen,
  isSaving,
  isLoadingDetails,
  isFetchingTenants,
  hausId,
  onCostItemChange,
  onRemoveCostItem,
  onRechnungChange,
  hoveredBerechnungsart,
  selectContentRect,
  hoveredItemRect,
  tooltipMap,
  onItemHover,
  onItemLeave,
  selectContentRef,
}: SortableCostItemProps) {
  const selectTriggerRef = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-xl ${isDragging ? 'z-10 shadow-lg bg-white dark:bg-gray-800' : ''}`}
      role="group"
      aria-label={`Kostenposition ${index + 1}`}
    >
      <div className="flex flex-col sm:flex-row items-start gap-2">
        <div className="flex items-center justify-center flex-none w-8 h-10">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
            {...attributes}
            {...listeners}
            aria-label="Kostenposition verschieben"
          >
            <GripVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="w-full sm:flex-[4_1_0%]">
          <Input
            id={`art-${item.id}`}
            placeholder="Kostenart"
            value={item.art}
            onChange={(e) => onCostItemChange(index, 'art', e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="w-full sm:flex-[3_1_0%]">
          {item.berechnungsart === 'nach Rechnung' ? (
            <div className="flex items-center justify-center h-10 px-3 py-2 text-sm text-muted-foreground bg-gray-50 border rounded-md">
              Beträge pro Mieter unten
            </div>
          ) : (
            <NumberInput
              id={`betrag-${item.id}`}
              placeholder="Betrag (€)"
              value={item.betrag}
              onChange={(e) => onCostItemChange(index, 'betrag', e.target.value)}
              step="0.01"
              disabled={isSaving}
            />
          )}
        </div>
        <div className="w-full sm:flex-[4_1_0%]">
          <Select
            value={item.berechnungsart}
            onValueChange={(value) => onCostItemChange(index, 'berechnungsart', value as BerechnungsartValue)}
            onOpenChange={(open) => {
              // When the dropdown closes (e.g. after selection), ensure tooltip is cleared
              if (!open) onItemLeave();
            }}
            disabled={isSaving}
          >
            <SelectTrigger
              onMouseEnter={(e) => item.berechnungsart && onItemHover(e, item.berechnungsart as BerechnungsartValue)}
              onMouseLeave={onItemLeave}
              onFocus={(e) => item.berechnungsart && onItemHover(e, item.berechnungsart as BerechnungsartValue)}
              onBlur={onItemLeave}
              ref={selectTriggerRef}
            >
              <SelectValue placeholder="Berechnungsart" />
            </SelectTrigger>
            <SelectContent ref={selectContentRef}>
              {BERECHNUNGSART_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  onMouseEnter={(e) => onItemHover(e, option.value as BerechnungsartValue)}
                  onMouseLeave={onItemLeave}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectContentRect && hoveredBerechnungsart && hoveredItemRect && createPortal(
            <div
              className="fixed z-[60] transition-none"
              style={{
                top: `${Math.round(hoveredItemRect.top)}px`,
                right: `${window.innerWidth - Math.round(selectContentRect.left) + 8}px`,
                width: '280px',
                minHeight: `${Math.round(hoveredItemRect.height)}px`,
              }}
            >
              <div className="h-full rounded-md border bg-popover text-popover-foreground shadow-sm p-3 text-sm flex items-center">
                {tooltipMap[hoveredBerechnungsart]}
              </div>
            </div>,
            document.body
          )}
        </div>
        <div className="flex items-center justify-center flex-none w-10 h-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemoveCostItem(index)}
            disabled={costItems.length <= 1 || isLoadingDetails || isSaving}
            aria-label="Kostenposition entfernen"
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {item.berechnungsart === 'nach Rechnung' && (
        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl space-y-2">
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
            Einzelbeträge für: <span className="font-normal italic">"{item.art || 'Unbenannte Kostenart'}"</span>
          </h4>
          {isFetchingTenants ? (
            Array.from({ length: 3 }).map((_, skelIdx) => (
              <div key={`skel-tenant-${skelIdx}`} className="grid grid-cols-10 gap-2 items-center py-1">
                <Skeleton className="h-8 w-full col-span-6 sm:col-span-7" />
                <Skeleton className="h-8 w-full col-span-4 sm:col-span-3" />
              </div>
            ))
          ) : (
            <>
              {!isFetchingTenants && !hausId && (
                <p className="text-sm text-orange-600 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  Bitte wählen Sie zuerst ein Haus aus, um Mieter zu laden.
                </p>
              )}
              {!isFetchingTenants && hausId && selectedHausMieter.length === 0 && !isLoadingDetails && (
                <p className="text-sm text-orange-600 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  Für das ausgewählte Haus wurden keine Mieter gefunden.
                </p>
              )}
              {selectedHausMieter.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {selectedHausMieter.map(mieter => {
                    const rechnungForMieter = (rechnungen[item.id] || []).find(r => r.mieterId === mieter.id);
                    return (
                      <div key={mieter.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-300 dark:border-gray-600 last:border-b-0">
                        <Label htmlFor={`rechnung-${item.id}-${mieter.id}`} className="flex-1 text-sm font-medium" title={mieter.name}>
                          {mieter.name}
                        </Label>
                        <div className="flex-shrink-0 w-32">
                          <NumberInput
                            id={`rechnung-${item.id}-${mieter.id}`}
                            step="0.01"
                            placeholder="Betrag (€)"
                            value={rechnungForMieter?.betrag || ''}
                            onChange={(e) => onRechnungChange(item.id, mieter.id, e.target.value)}
                            disabled={isLoadingDetails || isSaving}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {rechnungen[item.id] && selectedHausMieter.length > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-400 dark:border-gray-500 flex justify-end">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Summe: {formatNumber((rechnungen[item.id] || []).reduce((sum, r) => sum + (parseFloat(r.betrag) || 0), 0))} €
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
