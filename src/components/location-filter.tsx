"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CityCombobox } from "@/components/city-combobox";

type Named = { id: number; nameAr: string; nameEn: string };

export function LocationFilter({
  governorates,
  initialGovernorateId,
  initialCityId,
  selectClass,
}: {
  governorates: Named[];
  initialGovernorateId: string;
  initialCityId: string;
  selectClass: string;
}) {
  const t = useTranslations("Providers");
  const locale = useLocale();
  const [governorateId, setGovernorateId] = useState(initialGovernorateId);
  const [cityId, setCityId] = useState(initialCityId);

  return (
    <>
      <select
        name="governorateId"
        value={governorateId}
        onChange={(e) => {
          setGovernorateId(e.target.value);
          if (e.target.value && cityId) setCityId("");
        }}
        className={selectClass}
        aria-label={t("governorate")}
      >
        <option value="">{t("allGovernorates")}</option>
        {governorates.map((g) => (
          <option key={g.id} value={g.id}>
            {locale === "ar" ? g.nameAr : g.nameEn}
          </option>
        ))}
      </select>
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
