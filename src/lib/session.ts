import "server-only";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/session-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SessionUser = {
  id: number;
  role: "customer" | "provider" | "admin";
  name: string;
  phone: string;
  email: string;
  birthDate: string | null;
};

export async function setSessionCookies(tokens: {
  token: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.token, accessCookieOptions(tokens.expiresIn));
  store.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getAccessToken();
  if (!token || !API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: SessionUser };
    return data.user;
  } catch {
    return null;
  }
}

export type ProviderProfile = {
  categoryId: number;
  cityId: number;
  governorateId: number;
  photoUrl: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  isActive: boolean;
};

export async function getMe(): Promise<{
  user: SessionUser;
  provider: ProviderProfile | null;
} | null> {
  const token = await getAccessToken();
  if (!token || !API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user: SessionUser;
      provider?: ProviderProfile;
    };
    return { user: data.user, provider: data.provider ?? null };
  } catch {
    return null;
  }
}

// Used by server actions: the access token may have expired while the user
// sat on a form. Trade the refresh token for a new pair and store it.
export async function refreshSession(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh || !API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401) await clearSessionCookies();
      return null;
    }
    const tokens = (await res.json()) as {
      token: string;
      refreshToken: string;
      expiresIn: number;
    };
    await setSessionCookies(tokens);
    return tokens.token;
  } catch {
    return null;
  }
}
