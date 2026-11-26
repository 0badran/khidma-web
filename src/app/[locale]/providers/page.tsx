import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationFilter } from "@/components/location-filter";
import { ProviderCard } from "@/components/provider-card";
import {
  getCategories,
  getCities,
  getGovernorates,
  getProviders,
  MaintenanceError,
  pick,
} from "@/lib/api";

const PAGE_SIZE = 12;
const selectClass =
  "h-9 w-full border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring";

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    governorateId?: string;
    cityId?: string;
    page?: string;
  }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Providers");
  const { q, categoryId, governorateId, cityId: rawCityId, page } = await searchParams;
  const cityId = governorateId ? rawCityId : undefined;
  const pageNumber = Math.max(1, Number(page) || 1);

  let categories, governorates, result, cityOptions;
  try {
    [categories, governorates, result, cityOptions] = await Promise.all([
      getCategories(locale),
      getGovernorates(locale),
      getProviders(locale, {
        q,
        categoryId,
        governorateId,
        cityId,
        page: pageNumber,
        limit: PAGE_SIZE,
      }),
      governorateId && cityId ? getCities(locale, governorateId) : Promise.resolve([]),
    ]);
  } catch (error) {
    if (error instanceof MaintenanceError) {
      return redirect({ href: "/maintenance", locale });
    }
    throw error;
  }

  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (governorateId) params.set("governorateId", governorateId);
    if (cityId) params.set("cityId", cityId);
    params.set("page", String(target));
    return `/providers?${params}`;
  };
  const found = cityOptions.find((c) => String(c.id) === cityId);
  const initialCity = found
    ? { id: String(found.id), label: pick(locale, found.nameAr, found.nameEn) }
    : null;
  const hasNext = result.providers.length === PAGE_SIZE;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="h-9" />
        <select name="categoryId" defaultValue={categoryId ?? ""} className={selectClass} aria-label={t("category")}>
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(locale, c.nameAr, c.nameEn)}
            </option>
          ))}
        </select>
        <LocationFilter
          governorates={governorates}
          initialGovernorateId={governorateId ?? ""}
          initialCity={initialCity}
          selectClass={selectClass}
        />
        <Button type="submit" size="lg">
          {t("apply")}
        </Button>
      </form>

      {result.providers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {result.providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}

      <nav className="flex justify-between">
        {pageNumber > 1 ? (
          <Link href={pageHref(pageNumber - 1)} className={buttonVariants({ variant: "outline" })}>
            {t("previous")}
          </Link>
        ) : (
          <span />
        )}
        {hasNext ? (
          <Link href={pageHref(pageNumber + 1)} className={buttonVariants({ variant: "outline" })}>
            {t("next")}
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
