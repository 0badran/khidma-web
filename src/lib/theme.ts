export type Theme = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// The API returns the theme using the same variable names as globals.css
// (without the `--` prefix). On any failure we return null and the site
// falls back to the defaults baked into globals.css.
export async function getTheme(): Promise<Theme | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/settings/public`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { theme?: Theme };
    return data.theme ?? null;
  } catch {
    return null;
  }
}

export function themeToCss(theme: Theme): string {
  const toVars = (mode: Record<string, string>) =>
    Object.entries(mode)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n");
  return `:root {\n${toVars(theme.light)}\n}\n.dark {\n${toVars(theme.dark)}\n}`;
}
