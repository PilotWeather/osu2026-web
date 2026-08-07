import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import { prisma } from "@/src/lib/db";

// Auth.js v5 names take precedence. The explicit legacy mapping keeps existing
// deployments working while their Vercel variables are renamed.
const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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
    async jwt({ token, user }) {
      if (!user) return token;
      const email = user.email?.trim().toLocaleLowerCase("en-US");
      if (!email) return token;
      const authorizedUser = await prisma.authorizedUser.findUnique({
        where: { email },
        select: { role: true, active: true },
      });
      if (!authorizedUser?.active) return token;
      token.userId = user.id;
      token.email = email;
      token.role = authorizedUser.role;
      return token;
    },
    async session({ session, token }) {
      const userId = typeof token.userId === "string" ? token.userId : "";
      const role = Object.values(UserRole).find((candidate) => candidate === token.role);
      session.user.id = userId;
      session.user.email = token.email ?? session.user.email;
      session.user.role = role ?? UserRole.VIEWER;
      session.user.active = Boolean(userId && token.email && role);
      return session;
    },
  },
});
