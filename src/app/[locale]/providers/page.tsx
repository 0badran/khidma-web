import { getLocale, getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProviderCard } from "@/components/provider-card";
import {
  getCategories,
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
    page?: string;
  }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Providers");
  const { q, categoryId, governorateId, page } = await searchParams;
  const pageNumber = Math.max(1, Number(page) || 1);

  let categories, governorates, result;
  try {
    [categories, governorates, result] = await Promise.all([
      getCategories(locale),
      getGovernorates(locale),
      getProviders(locale, {
        q,
        categoryId,
        governorateId,
        page: pageNumber,
        limit: PAGE_SIZE,
      }),
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
    params.set("page", String(target));
    return `/providers?${params}`;
  };
  const hasNext = result.providers.length === PAGE_SIZE;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="h-9" />
        <select name="categoryId" defaultValue={categoryId ?? ""} className={selectClass} aria-label={t("category")}>
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(locale, c.nameAr, c.nameEn)}
            </option>
          ))}
        </select>
        <select name="governorateId" defaultValue={governorateId ?? ""} className={selectClass} aria-label={t("governorate")}>
          <option value="">{t("allGovernorates")}</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>
              {pick(locale, g.nameAr, g.nameEn)}
            </option>
          ))}
        </select>
        <Button type="submit" size="lg">
          {t("apply")}
        </Button>
      </form>

      {result.providers.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
