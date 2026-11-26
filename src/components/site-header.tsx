import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getPublicSettings } from "@/lib/settings";

export async function SiteHeader() {
  const t = await getTranslations("Header");
  const settings = await getPublicSettings();
  const logoUrl = settings?.logoUrl;
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center flex-wrap justify-between gap-x-4 gap-y-2 p-4">
        <Link href="/" className="text-lg font-bold">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={t("brand")}
              width={160}
              height={40}
              unoptimized
              className="h-10 w-auto"
            />
          ) : (
            t("brand")
          )}
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
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
