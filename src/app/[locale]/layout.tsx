import type { Metadata, Viewport } from "next";
import { Cairo, Geist } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import { DirectionProvider } from "@/components/ui/direction";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getTheme, themeToCss } from "@/lib/theme";
import "../globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Khidma", template: "%s | Khidma" },
  description: "Book home services with trusted providers",
  appleWebApp: { capable: true, title: "Khidma", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0F4C81",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const direction = locale === "ar" ? "rtl" : "ltr";
  const theme = await getTheme();

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={`${geist.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {theme ? (
          <style
            id="khidma-theme"
            dangerouslySetInnerHTML={{ __html: themeToCss(theme) }}
          />
        ) : null}
        <ThemeProvider>
          <DirectionProvider direction={direction}>
            <NextIntlClientProvider>
              <SiteHeader />
              {children}
            </NextIntlClientProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
