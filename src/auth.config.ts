import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe shared Auth.js config (used by middleware).
 * No DB access here — that lives in src/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthed = !!auth?.user;

      const isPublicRoute =
        pathname === "/" ||
        pathname.startsWith("/sign-in") ||
        pathname.startsWith("/sign-up");

      if (isPublicRoute) return true;
      return isAuthed;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.locale = (user as { locale?: string }).locale ?? "en";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { locale?: string }).locale = token.locale as string;
      }
      return session;
    },
  },
  providers: [], // populated in src/auth.ts
};
