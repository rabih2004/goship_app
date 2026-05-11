import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { db } from "./lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            locale: true,
            passwordHash: true,
            suspended: true,
          },
        });
        if (!user || !user.passwordHash || user.suspended) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          locale: user.locale,
        };
      },
    }),
  ],
});
