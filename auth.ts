import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/lib/db";

// Auth.js v5 names take precedence. The explicit legacy mapping keeps existing
// deployments working while their Vercel variables are renamed.
const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, profile }) {
      // This callback runs only after Google has returned an authenticated identity.
      const email = (user.email ?? profile?.email)?.trim().toLocaleLowerCase("en-US");
      if (!email) return false;
      const authorizedUser = await prisma.authorizedUser.findUnique({
        where: { email },
        select: { active: true },
      });
      return authorizedUser?.active === true;
    },
    async session({ session }) {
      const email = session.user.email?.trim().toLocaleLowerCase("en-US");
      const authorizedUser = email
        ? await prisma.authorizedUser.findUnique({
            where: { email },
            select: { role: true, active: true },
          })
        : null;
      session.user.role = authorizedUser?.role ?? "VIEWER";
      session.user.active = authorizedUser?.active === true;
      return session;
    },
  },
});
