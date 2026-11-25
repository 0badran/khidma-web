import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  const t = useTranslations("HomePage");
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
      </div>
    </main>
  );
}
