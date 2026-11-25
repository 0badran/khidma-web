export const ACCESS_COOKIE = "khidma_access";
export const REFRESH_COOKIE = "khidma_refresh";

const isProd = process.env.NODE_ENV === "production";

export const accessCookieOptions = (expiresIn: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: expiresIn,
});

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
