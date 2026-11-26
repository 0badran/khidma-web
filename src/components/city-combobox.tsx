"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type CityChoice = { id: string; governorateId: string; label: string };

type ApiCity = {
  id: number;
  governorateId: number;
  nameAr: string;
  nameEn: string;
  governorateNameAr: string;
  governorateNameEn: string;
};

// Live city search against the API. The label carries the governorate name
// unless the list is already narrowed to one governorate.
export function CityCombobox({
  cityId,
  governorateId,
  onSelect,
  placeholder,
  emptyText,
  ariaLabel,
  className,
}: {
  cityId: string;
  governorateId?: string;
  onSelect: (city: CityChoice | null) => void;
  placeholder: string;
  emptyText: string;
  ariaLabel: string;
  className?: string;
}) {
  const locale = useLocale();
  const [selected, setSelected] = useState<CityChoice | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CityChoice[]>([]);
  const [loading, setLoading] = useState(false);

  const toChoice = (c: ApiCity, withGovernorate: boolean): CityChoice => {
    const city = locale === "ar" ? c.nameAr : c.nameEn;
    const gov = locale === "ar" ? c.governorateNameAr : c.governorateNameEn;
    return {
      id: String(c.id),
      governorateId: String(c.governorateId),
      label: withGovernorate ? `${city}${locale === "ar" ? "،" : ","} ${gov}` : city,
    };
  };

  // The parent cleared the city: reset the field.
  if (!cityId && selected) {
    setSelected(null);
    setQuery("");
  }

  // The parent set a city this field has not seen (a restored draft or the saved profile): look up its name.
  useEffect(() => {
    if (!cityId || selected?.id === cityId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const params = new URLSearchParams({ id: cityId, locale });
        const res = await fetch(`/api/cities?${params}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { cities: ApiCity[] };
        const found = data.cities[0];
        if (!found) return;
        const choice = toChoice(found, true);
        setSelected(choice);
        setQuery(choice.label);
      } catch {
        // The field stays empty; the user can pick again.
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, locale]);

  const searching = !selected || query !== selected.label;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ locale });
        if (governorateId) params.set("governorateId", governorateId);
        if (searching && query) params.set("q", query);
        const res = await fetch(`/api/cities?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("lookup failed");
        const data = (await res.json()) as { cities: ApiCity[] };
        setItems(data.cities.map((c) => toChoice(c, !governorateId)));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, governorateId, locale]);

  return (
    <Combobox
      items={items}
      filter={null}
      value={cityId ? selected : null}
      onValueChange={(value: CityChoice | null) => {
        setSelected(value);
        setQuery(value?.label ?? "");
        onSelect(value);
      }}
      inputValue={query}
      onInputValueChange={(value) => setQuery(value)}
      open={open}
      onOpenChange={setOpen}
      itemToStringLabel={(item: CityChoice) => item.label}
      isItemEqualToValue={(a: CityChoice, b: CityChoice) => a.id === b.id}
    >
      <ComboboxInput
        placeholder={placeholder}
        aria-label={ariaLabel}
        showClear={Boolean(cityId)}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>{loading ? "..." : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: CityChoice) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
