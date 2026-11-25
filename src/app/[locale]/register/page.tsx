import { getLocale, getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/register-form";
import { getCategories, getGovernorates } from "@/lib/api";

export default async function RegisterPage() {
  const locale = await getLocale();
  const t = await getTranslations("Register");
  const [categories, governorates] = await Promise.all([
    getCategories(locale),
    getGovernorates(locale),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <RegisterForm categories={categories} governorates={governorates} />
    </main>
  );
}
