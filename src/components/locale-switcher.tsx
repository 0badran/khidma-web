"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Translate } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { keepDraftsForLocaleSwitch } from "@/lib/draft-store";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const next = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    const rest = { ...params } as Record<string, string | string[]>;
    delete rest.locale;
    const query = Object.fromEntries(searchParams.entries());
    keepDraftsForLocaleSwitch();
    startTransition(() => {
      router.replace(
        // Dynamic segments such as the provider id stay in `params`.
        { pathname, params: rest, query } as Parameters<typeof router.replace>[0],
        { locale: next },
      );
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      disabled={pending}
      aria-label={t("label")}
      lang={next}
    >
      <Translate />
      <span className="sm:hidden" aria-hidden="true">
        {Array.from(t("name"))[0]}
      </span>
      <span className="hidden sm:inline">{t("name")}</span>
    </Button>
  );
}
