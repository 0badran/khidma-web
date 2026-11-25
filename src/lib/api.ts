const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class MaintenanceError extends Error {}

export type Category = {
  id: number;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  sortOrder: number;
};

export type Governorate = { id: number; nameAr: string; nameEn: string };

export type Provider = {
  id: number;
  name: string;
  age: number | null;
  cityId: number;
  cityNameAr: string;
  cityNameEn: string;
  governorateId: number;
  governorateNameAr: string;
  governorateNameEn: string;
  photoUrl: string;
  yearsOfExperience: number | null;
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  avgRating: number | null;
  ratingsCount: number;
};

export type ProviderDetails = Provider & {
  bio: string | null;
  phone: string;
  callUrl: string;
  whatsappUrl: string;
};

export type Rating = {
  id: number;
  raterName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
};

export type ProviderFilters = {
  q?: string;
  categoryId?: string;
  governorateId?: string;
  page?: number;
  limit?: number;
};

async function apiGet<T>(path: string, locale: string): Promise<T | null> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Accept-Language": locale },
    next: { revalidate: 60 },
  });
  if (res.status === 503) throw new MaintenanceError();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

export async function getCategories(locale: string) {
  const data = await apiGet<{ categories: Category[] }>("/api/categories", locale);
  return data?.categories ?? [];
}

export async function getGovernorates(locale: string) {
  const data = await apiGet<{ governorates: Governorate[] }>(
    "/api/governorates",
    locale,
  );
  return data?.governorates ?? [];
}

export async function getProviders(locale: string, filters: ProviderFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const data = await apiGet<{ providers: Provider[]; page: number; limit: number }>(
    `/api/providers?${params}`,
    locale,
  );
  return data ?? { providers: [], page: 1, limit: filters.limit ?? 20 };
}

export async function getProvider(locale: string, id: string) {
  const data = await apiGet<{ provider: ProviderDetails }>(
    `/api/providers/${encodeURIComponent(id)}`,
    locale,
  );
  return data?.provider ?? null;
}

export async function getRatings(locale: string, id: string) {
  const data = await apiGet<{ ratings: Rating[] }>(
    `/api/providers/${encodeURIComponent(id)}/ratings`,
    locale,
  );
  return data?.ratings ?? [];
}

export function pick(locale: string, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}
