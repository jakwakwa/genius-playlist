export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify-client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = session.user.id;

    // Fetch playlists from Spotify
    const res = await spotifyFetch(
      userId,
      "https://api.spotify.com/v1/me/playlists?limit=50"
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Spotify API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch playlists from Spotify" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await res.json();

    // Get current user's Spotify profile to check ownership
    const profileRes = await spotifyFetch(
      userId,
      "https://api.spotify.com/v1/me"
    );
    const profile = profileRes.ok ? await profileRes.json() : null;
    const spotifyUserId = profile?.id;

    // Upsert playlists to database
    const upsertPromises = (data.items ?? []).map((p: any) =>
      prisma.playlist.upsert({
        where: {
          userId_spotifyId: {
            userId,
            spotifyId: p.id,
          },
        },
        update: {
          name: p.name,
          description: p.description ?? null,
          imageUrl: p.images?.[0]?.url ?? null,
          trackCount: String(p.tracks?.total ?? 0),
          isOwner: spotifyUserId ? p.owner?.id === spotifyUserId : false,
        },
        create: {
          userId,
          spotifyId: p.id,
          name: p.name,
          description: p.description ?? null,
          imageUrl: p.images?.[0]?.url ?? null,
          trackCount: String(p.tracks?.total ?? 0),
          isOwner: spotifyUserId ? p.owner?.id === spotifyUserId : false,
        },
      })
    );

    await prisma.$transaction(upsertPromises);

    // Fetch updated playlists from database
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Normalize shape to what the frontend expects (Spotify-like)
    const normalized = playlists.map((p) => ({
      id: p.spotifyId,
      name: p.name,
      description: p.description ?? null,
      images: p.imageUrl ? [{ url: p.imageUrl }] : [],
      tracks: { total: Number.parseInt(p.trackCount ?? "0", 10) || 0 },
    }));

    return Response.json(normalized);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
