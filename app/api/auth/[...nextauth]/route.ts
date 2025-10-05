import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

export const runtime = "nodejs";

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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Persist the OAuth access_token and user info to the token right after signin
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.spotifyId = account.providerAccountId;
        token.expiresAt = account.expires_at;
        
        // Update user in database with Spotify tokens
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              spotifyId: account.providerAccountId,
              spotifyAccessToken: account.access_token ?? null,
              spotifyRefreshToken: account.refresh_token ?? null,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              displayName: profile?.name ?? user.name ?? user.email ?? "",
              email: user.email ?? "",
            },
          });
        } catch (error) {
          console.error("Error updating user tokens in jwt callback:", error);
        }
      }
      if (profile) {
        token.displayName = profile.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.name = (token.displayName as string) ?? session.user.email ?? null;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!account) return false;
      
      // Allow the sign in - Prisma Adapter will create the user
      // We'll update tokens in the jwt callback
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
