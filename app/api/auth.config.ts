import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import db from "../../src/index";
import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { User as NextAuthUser } from "next-auth";

interface User extends NextAuthUser {
  role: string;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "secr3t",
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user.email) return false;

        const existingUser = await db.user.findUnique({
          where: { email: user.email }
        });

        if (!existingUser) {
          const newUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name || "",
              image: user.image || "",
              role: "ADMIN" // Set role as ADMIN for all new users
            }
          });
          user.id = newUser.id;
          (user as User).role = newUser.role;
        } else {
          user.id = existingUser.id;
          (user as User).role = existingUser.role;
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as User).id = token.id as string;
        (session.user as User).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/auth',
    error: '/auth/error',
  }
};