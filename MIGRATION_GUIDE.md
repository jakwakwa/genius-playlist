# Express to Next.js App Router Migration Guide

## Overview

This guide will help you migrate your OpenAI Assistants Quickstart app from Express + in-memory storage to a pure Next.js App Router application using Prisma with PostgreSQL.

## Current Status

✅ **Completed:**
- Created Git branch: `migration/next-app-router-prisma`
- Created Prisma schema (`prisma/schema.prisma`)
- Created Prisma Client singleton (`lib/prisma.ts`)
- Updated Spotify client with Prisma-based token management (`lib/spotify-client.ts`)

## Prerequisites

- Node.js 18+ installed
- pnpm installed
- PostgreSQL 14+ running locally
- Spotify Developer Account (for OAuth credentials)

## Migration Steps

### Step 1: Set Up PostgreSQL Database

```bash
# Create database (use psql or your preferred tool)
createdb playlistgenius

# Or using psql:
psql postgres
CREATE DATABASE playlistgenius;
\q
```

### Step 2: Configure Environment Variables

Update your `.env` file:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/playlistgenius?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"

# Spotify OAuth
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"

# OpenAI (if using AI features)
OPENAI_API_KEY="sk-..."
OPENAI_ASSISTANT_ID="asst_..."
```

**To get Spotify credentials:**
1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
4. Copy Client ID and Client Secret

### Step 3: Install Dependencies

```bash
# Install required packages
pnpm add @prisma/client next-auth @auth/prisma-adapter

# Install dev dependencies
pnpm add -D prisma

# Remove legacy packages
pnpm remove express express-session connect-pg-simple memorystore passport passport-local wouter
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Create Database Tables

```bash
npx prisma migrate dev --name init
```

This will create all the tables defined in your Prisma schema.

### Step 6: Create NextAuth Configuration

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
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
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!account || !user) return false;
      
      // Store Spotify tokens in User table for API calls
      await prisma.user.update({
        where: { id: user.id },
        data: {
          spotifyId: account.providerAccountId,
          spotifyAccessToken: account.access_token,
          spotifyRefreshToken: account.refresh_token,
          tokenExpiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
          email: user.email ?? "",
          displayName: user.name ?? user.email ?? "",
        },
      });
      
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
```

### Step 7: Create Auth Helper

Create `lib/auth.ts`:

```typescript
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function auth() {
  return await getServerSession();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function getCurrentUserOrThrow() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    throw new Response("User not found", { status: 404 });
  }
  return user;
}
```

### Step 8: Create API Routes

Create the following Next.js API routes to replace Express routes:

#### `app/api/user/route.ts`
```typescript
export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      spotifyId: true,
      createdAt: true,
    },
  });

  return Response.json({ user });
}
```

#### `app/api/playlists/route.ts`
```typescript
export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify-client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  const res = await spotifyFetch(userId, "https://api.spotify.com/v1/me/playlists?limit=50");
  if (!res.ok) {
    return new Response("Failed to fetch playlists from Spotify", { status: 502 });
  }
  const data = await res.json();

  // Sync playlists to database
  const upserts = (data.items ?? []).map((p: any) =>
    prisma.playlist.upsert({
      where: { userId_spotifyId: { userId, spotifyId: p.id } },
      update: {
        name: p.name,
        description: p.description ?? null,
        imageUrl: p.images?.[0]?.url ?? null,
        trackCount: String(p.tracks?.total ?? 0),
        isOwner: p.owner?.id === userId,
      },
      create: {
        userId,
        spotifyId: p.id,
        name: p.name,
        description: p.description ?? null,
        imageUrl: p.images?.[0]?.url ?? null,
        trackCount: String(p.tracks?.total ?? 0),
        isOwner: p.owner?.id === userId,
      },
    })
  );
  await prisma.$transaction(upserts);

  const playlists = await prisma.playlist.findMany({ where: { userId } });
  return Response.json({ playlists });
}
```

#### `app/api/playlists/[id]/tracks/route.ts`
```typescript
export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { spotifyFetch } from "@/lib/spotify-client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  
  const res = await spotifyFetch(
    session.user.id,
    `https://api.spotify.com/v1/playlists/${params.id}/tracks`
  );
  
  if (!res.ok) {
    return new Response("Failed to fetch tracks", { status: 502 });
  }
  
  const data = await res.json();
  return Response.json({ tracks: data.items ?? [] });
}
```

### Step 9: Create Providers Component

Create `app/providers.tsx`:

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### Step 10: Update Root Layout

Update `app/layout.tsx`:

```typescript
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PlaylistGenius",
  description: "AI-powered playlist generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 11: Update Home Page

Update `app/page.tsx`:

```typescript
import Home from "@/components/pages/home";

export default function Page() {
  return <Home />;
}
```

Update `components/pages/home.tsx`:
- Remove `wouter` imports and usage
- Replace with `next-auth/react` `useSession`
- Use `signIn()` and `signOut()` from next-auth/react
- Update API calls to use new endpoints

### Step 12: Update Next.js Config

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["i.scdn.co", "mosaic.scdn.co", "image-cdn-ak.spotifycdn.com"],
  },
};

export default nextConfig;
```

### Step 13: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "type-check": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "prisma:generate": "prisma generate"
  }
}
```

### Step 14: Clean Up

Delete obsolete files:
```bash
rm -rf prisma/schema.ts  # Old commented-out schema
rm -rf shared/           # If empty
# Remove any Express-specific server files
```

### Step 15: Test the Migration

```bash
# Start development server
pnpm dev

# In another terminal, open Prisma Studio
npx prisma studio
```

**Testing checklist:**
- [ ] Visit http://localhost:3000
- [ ] Sign in with Spotify
- [ ] Check that user is created in database (Prisma Studio)
- [ ] Verify playlists load from Spotify
- [ ] Test playlist track fetching
- [ ] Test AI playlist generation (if implemented)
- [ ] Test saving playlist to Spotify

## Troubleshooting

### Issue: "PrismaClient is unable to be run in the browser"
**Solution:** Make sure all API routes have `export const runtime = "nodejs"` at the top.

### Issue: NextAuth session not persisting
**Solution:** 
1. Check that `NEXTAUTH_SECRET` is set
2. Verify database tables were created (`Session`, `Account`, `User`)
3. Clear browser cookies and try again

### Issue: Spotify token refresh fails
**Solution:**
1. Verify `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are correct
2. Check that user has `spotifyRefreshToken` in database
3. Review token expiry logic in `lib/spotify-client.ts`

### Issue: Cannot find module '@/lib/...'
**Solution:** Check `tsconfig.json` has correct path mapping:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Next Steps

After successful migration:

1. **Test thoroughly** - Run through all user flows
2. **Update documentation** - Update README with new setup instructions
3. **Deploy** - Set up production database and environment variables
4. **Monitor** - Watch for any runtime errors in production

## Rollback Plan

If you need to rollback:
```bash
git checkout main
pnpm install
```

The old code is preserved in the `main` branch.

## Additional Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)

## Questions or Issues?

If you encounter any problems during migration, check:
1. Environment variables are set correctly
2. Database connection is working
3. All dependencies are installed
4. Prisma client is generated (`npx prisma generate`)
