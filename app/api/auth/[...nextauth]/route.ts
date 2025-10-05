import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-read-email",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch the full user to get spotifyId
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { spotifyId: true, displayName: true },
        });
        if (dbUser) {
          session.user.name = dbUser.displayName ?? user.email ?? null;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!account || !user) return false;

      try {
        // Store Spotify tokens in User table for API calls
        await prisma.user.update({
          where: { id: user.id },
          data: {
            spotifyId: account.providerAccountId,
            spotifyAccessToken: account.access_token ?? null,
            spotifyRefreshToken: account.refresh_token ?? null,
            tokenExpiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
            email: user.email ?? "",
            displayName: profile?.name ?? user.name ?? user.email ?? "",
          },
        });

        return true;
      } catch (error) {
        console.error("Error updating user tokens:", error);
        return false;
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
