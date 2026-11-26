import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 p-4">
        <Link href="/" className="text-lg font-bold">
          {t("brand")}
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/providers">{t("providers")}</Link>
          <Suspense>
            <UserMenu />
          </Suspense>
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
