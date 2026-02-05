import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — used by middleware.
 * Does NOT include providers that depend on Node.js modules (bcrypt, prisma).
 */
export const authConfig: NextAuthConfig = {
  providers: [], // Providers are added in auth.ts (Node.js runtime only)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as any).role;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.organisationId = (user as any).organisationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.organisationId = token.organisationId as
          | string
          | undefined;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/enquiries") ||
        nextUrl.pathname.startsWith("/quotes") ||
        nextUrl.pathname.startsWith("/bookings") ||
        nextUrl.pathname.startsWith("/suppliers") ||
        nextUrl.pathname.startsWith("/users") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/ai-decisions") ||
        nextUrl.pathname.startsWith("/ai-costs") ||
        nextUrl.pathname.startsWith("/audit") ||
        nextUrl.pathname.startsWith("/surveys") ||
        nextUrl.pathname.startsWith("/human-review");
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/magic-link-sent");

      if (isDashboard) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
        return true;
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
