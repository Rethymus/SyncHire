"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";

interface SelectableListProps<T> {
  items: T[];
  itemIdKey: keyof T;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  onSelectChange?: (selectedIds: string[]) => void;
  className?: string;
}

export function SelectableList<T extends Record<string, any>>({
  items,
  itemIdKey,
  renderItem,
  onSelectChange,
  className,
}: SelectableListProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleSelectAll = useCallback((checked: boolean | string) => {
    const isChecked = typeof checked === 'boolean' ? checked : checked === 'true';
    const newSelectedIds = isChecked
      ? new Set(items.map((item) => String(item[itemIdKey])))
      : new Set<string>();

    setSelectedIds(newSelectedIds);
    onSelectChange?.(Array.from(newSelectedIds));
  }, [items, itemIdKey, onSelectChange]);

  const handleSelectItem = useCallback((id: string, checked: boolean | string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      const isChecked = typeof checked === 'boolean' ? checked : checked === 'true';
      if (isChecked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      onSelectChange?.(Array.from(newSelected));
      return newSelected;
    });
  }, [onSelectChange]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    onSelectChange?.([]);
  }, [onSelectChange]);

  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Auto-show/hide bulk actions bar
  if (selectedIds.size > 0 && !showBulkActions) {
    setShowBulkActions(true);
  } else if (selectedIds.size === 0 && showBulkActions) {
    setShowBulkActions(false);
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with select all */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              aria-label={allSelected ? "Deselect all items" : "Select all items"}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer select-none"
            >
              {allSelected
                ? "All selected"
                : someSelected
                ? `${selectedIds.size} of ${items.length} selected`
                : "Select all items"}
            </label>
          </div>

          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear selection
            </Button>
          )}
        </div>
      )}

      {/* List items */}
      <div className="space-y-2">
        {items.map((item) => {
          const itemId = String(item[itemIdKey]);
          const isSelected = selectedIds.has(itemId);

          return (
            <div
              key={itemId}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                isSelected ? "bg-primary/5 border-primary" : "bg-background hover:bg-muted/50"
              )}
            >
              <Checkbox
                id={`select-${itemId}`}
                checked={isSelected}
                onCheckedChange={(checked) => handleSelectItem(itemId, !!checked)}
                className="mt-1"
                aria-label={`Select item ${itemId}`}
              />
              <div className="flex-1 min-w-0">
                {renderItem(item, isSelected)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk actions bar */}
      {showBulkActions && selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-10 p-4 bg-background border-t shadow-lg">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-sm font-medium">
                {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-8"
              >
                Cancel
              </Button>
              {/* Render additional bulk action buttons via children */}
              <div className="flex items-center gap-2">
                {/* This will be populated by parent component's children */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export a hook to use with this component
export function useSelectableList(initialItems: any[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const selectedCount = selectedIds.size;

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
  };
}