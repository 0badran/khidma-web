import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AccountForm } from "@/components/account-form";
import { getAllCities, getCategories, getGovernorates } from "@/lib/api";
import { getMe } from "@/lib/session";

export default async function AccountPage() {
  const locale = await getLocale();
  const t = await getTranslations("Account");
  const me = await getMe();
  if (!me || me.user.role === "admin") {
    return redirect({ href: "/login", locale });
  }

  const [categories, governorates] = await Promise.all([
    getCategories(locale),
    getGovernorates(locale),
  ]);

  const cities = me.provider ? await getAllCities(locale, governorates) : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {me.provider ? (
        <>
          {me.provider.isActive ? null : (
            <p role="alert" className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("inactive")}
            </p>
          )}
          <Link href={`/providers/${me.user.id}`} className="w-fit text-sm text-primary underline-offset-4 hover:underline">
            {t("viewPublic")}
          </Link>
        </>
      ) : null}
      <AccountForm
        data={{
          role: me.user.role,
          name: me.user.name,
          email: me.user.email,
          phone: me.user.phone,
          birthDate: me.user.birthDate ?? "",
          provider: me.provider,
        }}
        categories={categories}
        governorates={governorates}
        cities={cities}
      />
    </main>
  );
}
