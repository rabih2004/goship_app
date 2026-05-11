import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfig } from "./auth.config";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

const PUBLIC_PATTERNS = [
  /^\/(en|ar)?\/?$/,
  /^\/(en|ar)\/sign-in(\/.*)?$/,
  /^\/(en|ar)\/sign-up(\/.*)?$/,
];

const isPublic = (pathname: string): boolean =>
  PUBLIC_PATTERNS.some((re) => re.test(pathname));

export default auth((request: NextRequest & { auth: unknown }) => {
  const { pathname } = request.nextUrl;
  const isAuthed = !!(request as { auth?: { user?: unknown } }).auth?.user;

  if (!isPublic(pathname) && !isAuthed) {
    const locale = pathname.startsWith("/ar") ? "ar" : "en";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
