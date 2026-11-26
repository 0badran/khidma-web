"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SelectOption = { value: string; label: string };

export function FormSelect({
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  ariaLabel,
  className,
}: {
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      items={options}
      onValueChange={(next) => onValueChange?.(next ?? "")}
    >
      <SelectTrigger className={className ?? "h-9 w-full"} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
