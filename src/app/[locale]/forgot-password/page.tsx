import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Forgot");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ForgotPasswordForm />
    </main>
  );
}
