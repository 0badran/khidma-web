"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { clearSessionCookies, getAccessToken, refreshSession } from "@/lib/session";
import type { ActionResult } from "@/lib/auth-actions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authed(
  method: string,
  path: string,
  body: unknown,
  locale: string,
  fallback: string,
) {
  let token = (await getAccessToken()) ?? (await refreshSession());
  if (!token) return { ok: false as const, message: fallback, expired: true };

  const send = async (accessToken: string) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": locale,
        Authorization: `Bearer ${accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

  try {
    let res = await send(token);
    if (res.status === 401) {
      const renewed = await refreshSession();
      if (renewed) {
        token = renewed;
        res = await send(token);
      }
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true as const, data };
    const error = (data as { error?: { message?: string; fields?: Record<string, string[]> } })
      .error;
    return {
      ok: false as const,
      message: error?.message ?? fallback,
      fields: error?.fields,
      expired: res.status === 401,
    };
  } catch {
    return { ok: false as const, message: fallback };
  }
}

export async function updateProfileAction(
  role: "customer" | "provider",
  body: Record<string, unknown>,
  fallback: string,
): Promise<ActionResult> {
  const locale = await getLocale();
  const path = role === "provider" ? "/api/providers/me" : "/api/customers/me";
  const out = await authed("PATCH", path, body, locale, fallback);
  if (!out.ok) return { ok: false, message: out.message, fields: out.fields };
  revalidatePath("/", "layout");
  return { ok: true };
}

export type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  signature: string;
  params: Record<string, string>;
};

export async function signPhotoUpload(
  fallback: string,
): Promise<{ ok: true; sign: UploadSignature } | { ok: false; message: string }> {
  const locale = await getLocale();
  const out = await authed("POST", "/api/uploads/sign", { purpose: "provider" }, locale, fallback);
  if (!out.ok) return { ok: false, message: out.message };
  return { ok: true, sign: out.data as UploadSignature };
}

export async function deleteAccountAction(fallback: string): Promise<ActionResult> {
  const locale = await getLocale();
  const out = await authed("DELETE", "/api/auth/me", undefined, locale, fallback);
  if (!out.ok) return { ok: false, message: out.message };
  await clearSessionCookies();
  return redirect({ href: "/", locale });
}

export async function submitRatingAction(
  providerId: number,
  body: { stars: number; comment?: string; name?: string; phone?: string },
  fallback: string,
): Promise<ActionResult> {
  const locale = await getLocale();
  const token = (await getAccessToken()) ?? (await refreshSession()) ?? undefined;
  try {
    const res = await fetch(`${API_URL}/api/providers/${providerId}/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = (data as { error?: { message?: string; fields?: Record<string, string[]> } })
        .error;
      return { ok: false, message: error?.message ?? fallback, fields: error?.fields };
    }
  } catch {
    return { ok: false, message: fallback };
  }
  revalidatePath(`/${locale}/providers/${providerId}`);
  return { ok: true };
}

type SimpleResult = Promise<ActionResult>;

async function simplePost(
  path: string,
  body: Record<string, unknown>,
  fallback: string,
  refresh = false,
): SimpleResult {
  const locale = await getLocale();
  const out = await authed("POST", path, body, locale, fallback);
  if (!out.ok) return { ok: false, message: out.message, fields: out.fields };
  if (refresh) revalidatePath("/", "layout");
  return { ok: true, message: (out.data as { message?: string }).message };
}

export async function changePasswordAction(
  body: { currentPassword: string; newPassword: string },
  fallback: string,
): SimpleResult {
  return simplePost("/api/auth/change-password", body, fallback);
}

export async function changeEmailRequestAction(
  body: { newEmail: string; password: string },
  fallback: string,
): SimpleResult {
  return simplePost("/api/auth/change-email/request-otp", body, fallback);
}

export async function changeEmailAction(
  body: { newEmail: string; otp: string },
  fallback: string,
): SimpleResult {
  return simplePost("/api/auth/change-email", body, fallback, true);
}

export async function changePhoneAction(
  body: { newPhone: string; password: string },
  fallback: string,
): SimpleResult {
  return simplePost("/api/auth/change-phone", body, fallback, true);
}
