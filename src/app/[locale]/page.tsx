import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProviderCard } from "@/components/provider-card";
import { getCategories, getProviders, MaintenanceError, pick } from "@/lib/api";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  let categories, top;
  try {
    [categories, top] = await Promise.all([
      getCategories(locale),
      getProviders(locale, { limit: 6 }),
    ]);
  } catch (error) {
    if (error instanceof MaintenanceError) {
      return redirect({ href: "/maintenance", locale });
    }
    throw error;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 p-4 py-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
        <form action={`/${locale}/providers`} className="flex gap-2">
          <Input name="q" placeholder={t("searchPlaceholder")} className="h-9" />
          <Button type="submit" size="lg">
            {t("search")}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("categories")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/providers?categoryId=${category.id}`}
              className="flex flex-col items-center gap-2 border p-3 text-center text-sm transition-colors hover:bg-muted/50"
            >
              <Image
                src={category.imageUrl}
                alt=""
                width={56}
                height={56}
                className="size-14 object-cover"
              />
              {pick(locale, category.nameAr, category.nameEn)}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("topRated")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {top.providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>
    </main>
  );
}
