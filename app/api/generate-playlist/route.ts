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

    // Normalize AI response and build recommendations list safely
    const recommendedRaw = Array.isArray((analysis as any)?.recommended_tracks)
      ? (analysis as any).recommended_tracks
      : Array.isArray((analysis as any)?.recommendedTracks)
      ? (analysis as any).recommendedTracks
      : [];

    // If AI returned nothing useful, fall back to top tracks from selected playlists
    const matchedTracks: any[] = [];
    if (recommendedRaw.length > 0) {
      for (const recommendation of recommendedRaw) {
        const recName = (recommendation?.name ?? "").toString().toLowerCase();
        const recArtist = (recommendation?.artist ?? "").toString().toLowerCase();
        for (const sourcePlaylist of sourcePlaylists) {
          const matchingTrack = sourcePlaylist.tracks.find((track: any) => {
            const nameOk = track?.name?.toLowerCase?.().includes(recName);
            const artistOk = Array.isArray(track?.artists)
              ? track.artists.some((artist: any) =>
                  artist?.name?.toLowerCase?.().includes(recArtist)
                )
              : false;
            return Boolean(nameOk || artistOk);
          });

          if (
            matchingTrack &&
            !matchedTracks.find((t: any) => t.id === matchingTrack.id)
          ) {
            matchedTracks.push(matchingTrack);
            break;
          }
        }
      }
    }

    // Fallback: if still empty, take the first N tracks from the source playlists
    if (matchedTracks.length === 0) {
      for (const sourcePlaylist of sourcePlaylists) {
        for (const item of sourcePlaylist.tracks) {
          if (!matchedTracks.find((t: any) => t.id === item.id)) {
            matchedTracks.push(item);
          }
          if (matchedTracks.length >= 25) break;
        }
        if (matchedTracks.length >= 25) break;
      }
    }

    const playlistName = (analysis as any)?.playlist_name || (analysis as any)?.playlistName ||
      (sourcePlaylists.length > 0 ? `AI Mix · ${sourcePlaylists[0].name}` : "AI Generated Playlist");
    const playlistDescription = (analysis as any)?.playlist_description || (analysis as any)?.playlistDescription ||
      (prompt ? `Generated by AI • ${prompt}` : "Generated by PlaylistGenius AI");

    // Build a normalized analysis object for frontend stability
    const energyRaw = (analysis as any)?.energy_level ?? (analysis as any)?.energyLevel;
    const energyLevel = Number.isFinite(Number(energyRaw)) ? Number(energyRaw) : 6;
    const normalizedAnalysis = {
      theme: (analysis as any)?.theme || "Mixed",
      mood: (analysis as any)?.mood || "mixed",
      energy_level: energyLevel,
      genres: Array.isArray((analysis as any)?.genres) ? (analysis as any).genres : [],
      recommended_tracks: recommendedRaw,
      playlist_name: playlistName,
      playlist_description: playlistDescription,
    };

    // Save generated playlist to database
    const generatedPlaylist = await prisma.generatedPlaylist.create({
      data: {
        userId: user.id,
        name: playlistName,
        description: playlistDescription,
        sourcePlaylistIds: selectedPlaylistIds,
        tracks: matchedTracks,
        aiPrompt: prompt || null,
      },
    });

    return Response.json({
      ...generatedPlaylist,
      analysis: normalizedAnalysis,
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
