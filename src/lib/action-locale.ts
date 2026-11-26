import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

// Server Actions cannot read root params, so getLocale() fails there.
// The browser sends the page URL as the referer, and its first path
// segment is the locale.
export async function getActionLocale(): Promise<string> {
  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      const segment = new URL(referer).pathname.split("/")[1];
      if (hasLocale(routing.locales, segment)) return segment;
    } catch {
      // Fall through to the default locale.
    }
  }
  return routing.defaultLocale;
}
