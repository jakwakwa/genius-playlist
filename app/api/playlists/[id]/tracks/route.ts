export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { spotifyFetch } from "@/lib/spotify-client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const playlistId = params.id;
		const userId = session.user.id;

		// Fetch tracks from Spotify
		const res = await spotifyFetch(userId, `https://api.spotify.com/v1/playlists/${playlistId}/tracks`);

		if (!res.ok) {
			const errorText = await res.text();
			console.error("Spotify API error:", errorText);
			return new Response(JSON.stringify({ error: "Failed to fetch tracks from Spotify" }), {
				status: 502,
				headers: { "Content-Type": "application/json" },
			});
		}

		const data = await res.json();

		// Get audio features for tracks (optional, for richer data)
		const trackIds = data.items
			?.filter((item: any) => item?.track?.type === "track")
			.map((item: any) => item.track.id)
			.filter(Boolean)
			.slice(0, 100); // Spotify API limit

		let audioFeatures = null;
		if (trackIds && trackIds.length > 0) {
			const featuresRes = await spotifyFetch(userId, `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(",")}`);
			if (featuresRes.ok) {
				const featuresData = await featuresRes.json();
				audioFeatures = featuresData.audio_features;
			}
		}

		// Enrich tracks with audio features if available
		const enrichedTracks = data.items?.map((item: any, index: number) => {
			if (item?.track && audioFeatures && audioFeatures[index]) {
				return {
					...item,
					track: {
						...item.track,
						audio_features: audioFeatures[index],
					},
				};
			}
			return item;
		});

		return Response.json({
			items: enrichedTracks ?? data.items ?? [],
			total: data.total,
			next: data.next,
			previous: data.previous,
		});
	} catch (error) {
		console.error("Error fetching playlist tracks:", error);
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
