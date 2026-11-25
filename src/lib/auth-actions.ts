"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fields?: Record<string, string[]> };

type Tokens = { token: string; refreshToken: string; expiresIn: number };

async function post(path: string, body: unknown, locale: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch {
    return null;
  }
}

function failure(
  out: Awaited<ReturnType<typeof post>>,
  fallback: string,
): ActionResult {
  if (!out) return { ok: false, message: fallback };
  const error = (out.data as { error?: { message?: string; fields?: Record<string, string[]> } })
    .error;
  return {
    ok: false,
    message: error?.message ?? fallback,
    fields: error?.fields ?? (out.data as { fields?: Record<string, string[]> }).fields,
  };
}

export async function requestRegisterOtp(
  email: string,
  fallback: string,
): Promise<ActionResult> {
  const locale = await getLocale();
  const out = await post("/api/auth/register/request-otp", { email }, locale);
  if (!out?.res.ok) return failure(out, fallback);
  return { ok: true, message: (out.data as { message?: string }).message };
}

export async function registerAction(
  body: Record<string, unknown>,
  fallback: string,
): Promise<ActionResult> {
  const locale = await getLocale();
  const out = await post("/api/auth/register", body, locale);
  if (!out?.res.ok) return failure(out, fallback);
  await setSessionCookies(out.data as Tokens);
  return redirect({ href: "/", locale });
}

export async function loginAction(
  body: { identifier: string; password: string },
  fallback: string,
): Promise<ActionResult> {
  const locale = await getLocale();
  const out = await post("/api/auth/login", body, locale);
  if (!out?.res.ok) return failure(out, fallback);
  await setSessionCookies(out.data as Tokens);
  return redirect({ href: "/", locale });
}

export async function logoutAction() {
  const locale = await getLocale();
  const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: JSON.stringify(refresh ? { refreshToken: refresh } : {}),
      cache: "no-store",
    });
  } catch {
    // The cookies are cleared either way.
  }
  await clearSessionCookies();
  return redirect({ href: "/", locale });
}
