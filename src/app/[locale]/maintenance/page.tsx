import { useTranslations } from "next-intl";

export default function MaintenancePage() {
  const t = useTranslations("Maintenance");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
    </main>
  );
}
