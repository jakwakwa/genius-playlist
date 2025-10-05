export const runtime = "nodejs";

import { getCurrentUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify-client";
import { analyzePlaylistsAndGenerate } from "@/lib/open-client";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserOrThrow();
    const body = await req.json();
    const { selectedPlaylistIds, prompt } = body;

    if (!selectedPlaylistIds || selectedPlaylistIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one playlist must be selected" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch tracks from selected playlists
    const sourcePlaylists = [];
    for (const playlistId of selectedPlaylistIds) {
      const playlist = await prisma.playlist.findFirst({
        where: {
          userId: user.id,
          spotifyId: playlistId,
        },
      });

      if (playlist) {
        const tracksRes = await spotifyFetch(
          user.id,
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`
        );

        if (tracksRes.ok) {
          const tracksData = await tracksRes.json();
          const trackIds = tracksData.items
            ?.filter((item: any) => item?.track?.type === "track")
            .map((item: any) => item.track.id)
            .filter(Boolean)
            .slice(0, 50);

          let audioFeatures = null;
          if (trackIds && trackIds.length > 0) {
            const featuresRes = await spotifyFetch(
              user.id,
              `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(",")}`
            );
            if (featuresRes.ok) {
              const featuresData = await featuresRes.json();
              audioFeatures = featuresData.audio_features;
            }
          }

          const tracksWithFeatures = tracksData.items
            ?.map((item: any, index: number) => {
              if (item?.track && item.track.type === "track") {
                return {
                  ...item.track,
                  audio_features: audioFeatures?.[index] || null,
                };
              }
              return null;
            })
            .filter(Boolean);

          sourcePlaylists.push({
            name: playlist.name,
            tracks: tracksWithFeatures,
          });
        }
      }
    }

    if (sourcePlaylists.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid playlists found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate playlist using AI
    const analysis = await analyzePlaylistsAndGenerate(
      sourcePlaylists,
      prompt || "Create an energetic playlist perfect for a road trip"
    );

    // Find matching tracks from source playlists
    const matchedTracks: any[] = [];
    for (const recommendation of analysis.recommended_tracks) {
      for (const sourcePlaylist of sourcePlaylists) {
        const matchingTrack = sourcePlaylist.tracks.find(
          (track: any) =>
            track.name.toLowerCase().includes(recommendation.name.toLowerCase()) ||
            track.artists?.some((artist: any) =>
              artist.name
                .toLowerCase()
                .includes(recommendation.artist.toLowerCase())
            )
        );

        if (
          matchingTrack &&
          !matchedTracks.find((t: any) => t.id === matchingTrack.id)
        ) {
          matchedTracks.push(matchingTrack);
          break;
        }
      }
    }

    // Save generated playlist to database
    const generatedPlaylist = await prisma.generatedPlaylist.create({
      data: {
        userId: user.id,
        name: analysis.playlist_name,
        description: analysis.playlist_description,
        sourcePlaylistIds: selectedPlaylistIds,
        tracks: matchedTracks,
        aiPrompt: prompt || null,
      },
    });

    return Response.json({
      ...generatedPlaylist,
      analysis,
      tracks: matchedTracks,
    });
  } catch (error) {
    console.error("Error generating playlist:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate playlist",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
