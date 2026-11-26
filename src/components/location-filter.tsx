"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CityCombobox } from "@/components/city-combobox";
import { FormSelect } from "@/components/form-select";

type Named = { id: number; nameAr: string; nameEn: string };

export function LocationFilter({
  governorates,
  initialGovernorateId,
  initialCityId,
}: {
  governorates: Named[];
  initialGovernorateId: string;
  initialCityId: string;
}) {
  const t = useTranslations("Providers");
  const locale = useLocale();
  const [governorateId, setGovernorateId] = useState(initialGovernorateId);
  const [cityId, setCityId] = useState(initialCityId);

  const items = [
    { value: "", label: t("allGovernorates") },
    ...governorates.map((g) => ({ value: String(g.id), label: locale === "ar" ? g.nameAr : g.nameEn })),
  ];

  return (
    <>
      <FormSelect
        name="governorateId"
        value={governorateId}
        options={items}
        ariaLabel={t("governorate")}
        className="h-9 w-full sm:min-w-40"
        onValueChange={(next) => {
          setGovernorateId(next);
          if (next && cityId) setCityId("");
        }}
      />
      <input type="hidden" name="cityId" value={cityId} />
      <CityCombobox
        cityId={cityId}
        governorateId={governorateId}
        onSelect={(city) => {
          setCityId(city?.id ?? "");
          if (city) {
            setGovernorateId(city.governorateId);
          }
        }}
        placeholder={t("citySearch")}
        emptyText={t("cityEmpty")}
        ariaLabel={t("city")}
        className="h-9"
      />
    </>
  );
}
