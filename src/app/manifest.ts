import type { MetadataRoute } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type PublicSettings = {
  appName?: string;
  theme?: { light?: Record<string, string> };
};

async function getSettings(): Promise<PublicSettings | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/settings/public`, {
      next: { revalidate: 300 },
    });
    return res.ok ? ((await res.json()) as PublicSettings) : null;
  } catch {
    return null;
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const name = settings?.appName || "خدمة";
  const themeColor = settings?.theme?.light?.primary || "#0F4C81";

  return {
    name,
    short_name: name,
    description: "احجز خدمات الصيانة المنزلية بسهولة",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "ar",
    dir: "rtl",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
