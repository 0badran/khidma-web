import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const t = await getTranslations("Login");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <LoginForm />
    </main>
  );
}
