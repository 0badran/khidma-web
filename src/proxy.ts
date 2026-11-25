import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {routing} from './i18n/routing';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './lib/session-cookies';

const intlMiddleware = createMiddleware(routing);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// The access token lives 15 minutes. When it is gone but a refresh token
// is still there, get a new pair and reload the same URL with new cookies.
export default async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!access && refresh && API_URL && request.method === 'GET') {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const response = NextResponse.redirect(request.url);
      if (res.ok) {
        const data = (await res.json()) as {
          token: string;
          refreshToken: string;
          expiresIn: number;
        };
        response.cookies.set(ACCESS_COOKIE, data.token, accessCookieOptions(data.expiresIn));
        response.cookies.set(REFRESH_COOKIE, data.refreshToken, refreshCookieOptions);
      } else if (res.status === 401) {
        response.cookies.delete(REFRESH_COOKIE);
      } else {
        return intlMiddleware(request);
      }
      return response;
    } catch {
      return intlMiddleware(request);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
