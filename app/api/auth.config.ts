// import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import db from "../../src/index";
import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { User as NextAuthUser } from "next-auth";
import { compare } from 'bcryptjs';

interface User extends NextAuthUser {
  role: string;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "secr3t",
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account}) {
      if (account?.provider === 'credentials') {
        return !!user;
      }

      return !!user;
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
    error: '/auth/error',
  },
};