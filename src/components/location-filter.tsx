"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type Option = { id: string; label: string };
type Named = { id: number; nameAr: string; nameEn: string };

export function LocationFilter({
  governorates,
  initialGovernorateId,
  initialCity,
  selectClass,
}: {
  governorates: Named[];
  initialGovernorateId: string;
  initialCity: Option | null;
  selectClass: string;
}) {
  const t = useTranslations("Providers");
  const locale = useLocale();
  const pick = (n: Named) => (locale === "ar" ? n.nameAr : n.nameEn);

  const [governorateId, setGovernorateId] = useState(initialGovernorateId);
  const [city, setCity] = useState<Option | null>(initialCity);
  const [query, setQuery] = useState(initialCity?.label ?? "");
  const [items, setItems] = useState<Option[]>(initialCity ? [initialCity] : []);
  const [loading, setLoading] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (!governorateId) return;
    // Skip the lookup that only echoes the already selected city.
    const searching = city === null || query !== city.label;
    if (firstRun.current && !searching) {
      firstRun.current = false;
      return;
    }
    firstRun.current = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          governorateId,
          locale,
          q: searching ? query : "",
        });
        const res = await fetch(`/api/cities?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("lookup failed");
        const data = (await res.json()) as { cities: Named[] };
        setItems(data.cities.map((c) => ({ id: String(c.id), label: pick(c) })));
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
  }, [governorateId, query, locale]);

  return (
    <>
      <select
        name="governorateId"
        value={governorateId}
        onChange={(e) => {
          setGovernorateId(e.target.value);
          setCity(null);
          setQuery("");
        }}
        className={selectClass}
        aria-label={t("governorate")}
      >
        <option value="">{t("allGovernorates")}</option>
        {governorates.map((g) => (
          <option key={g.id} value={g.id}>
            {pick(g)}
          </option>
        ))}
      </select>
      <input type="hidden" name="cityId" value={governorateId && city ? city.id : ""} />
      <Combobox
        items={governorateId ? items : []}
        filter={null}
        value={city}
        onValueChange={(value) => {
          setCity(value);
          setQuery(value?.label ?? "");
        }}
        inputValue={query}
        onInputValueChange={(value) => setQuery(value)}
        itemToStringLabel={(item: Option) => item.label}
        isItemEqualToValue={(a: Option, b: Option) => a.id === b.id}
        disabled={!governorateId}
      >
        <ComboboxInput
          placeholder={governorateId ? t("citySearch") : t("cityPickGovernorate")}
          aria-label={t("city")}
          showClear={Boolean(city)}
          className="h-9"
        />
        <ComboboxContent>
          <ComboboxEmpty>{loading ? "..." : t("cityEmpty")}</ComboboxEmpty>
          <ComboboxList>
            {(item: Option) => (
              <ComboboxItem key={item.id} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </>
  );
}
