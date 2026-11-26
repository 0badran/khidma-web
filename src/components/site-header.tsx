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
  // The API logo wins; the bundled copy is the fallback when it is missing.
  const logoUrl = settings?.logoUrl || "/logo.png";
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center flex-wrap justify-between gap-x-4 gap-y-2 p-4">
        <Link href="/" className="text-lg font-bold">
          <Image
            src={logoUrl}
            alt={t("brand")}
            width={96}
            height={96}
            unoptimized
            className="-my-1 size-10 sm:-my-3 sm:size-14"
          />
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
