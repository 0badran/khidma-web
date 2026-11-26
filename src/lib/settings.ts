const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type PublicSettings = {
  appName?: string;
  logoUrl?: string | null;
};

export async function getPublicSettings(): Promise<PublicSettings | null> {
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
