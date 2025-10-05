
// import { createServer, type Server } from "node:http";
// import { z } from "zod";
// import {
// 	generateChatResponse,rate,
// } from "./openaiClient";
import { getUncachableSpotifyClient } from "@/lib/spotify-client"
// import { storage } from "./storage";

export async function registerRoutes(app): Promise<Server> {
	// Auth check middleware
	const requireAuth = (req: any, res: any, next: any) => {
		if (!req.session?.userId) {
			return res.status(401).json({ message: "Authentication required" });
		}
		next();
	};

	// Get current user
	app.get("/api/user", requireAuth, async (req: any, res) => {
		try {
			const user = await storage.getUser(req.session.userId);
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
			res.json(user);
		} catch (_error) {
			res.status(500).json({ message: "Failed to fetch user" });
		}
	});_error

	// Get user playlists
	app.get("/api/playlists", requireAuth, async (req: any, res) => {
		try {
			const spotify = await getUncachableSpotifyClient();
			const spotifyPlaylists =
				await spotify.currentUser.playlists.playlists(50);

			// Store/update playlists in our database
			const playlists = [];
			for (const playlist of spotifyPlaylists.items) {
				const existingPlaylist = await storage.getPlaylistBySpotifyId(
					playlist.id,
				);
				if (!existingPlaylist) {
					const newPlaylist = await storage.createPlaylist({
						userId: req.session.userId,
						spotifyId: playlist.id,
						name: playlist.name,
						description: playlist.description || "",
						imageUrl: playlist.images[0]?.url || "",
						trackCount: playlist.tracks.total.toString(),
						isOwner:
							playlist.owner.id === (await spotify.currentUser.profile()).id,
					});
					playlists.push(newPlaylist);
				} else {
					playlists.push(existingPlaylist);
				}
			}

			res.json(playlists);
		} catch (error) {
			console.error("Failed to fetch playlists:", error);
			res.status(500).json({ message: "Failed to fetch playlists" });
		}
	});

	// Get playlist tracks
	app.get("/api/playlists/:id/tracks", requireAuth, async (req, res) => {
		try {
			const { id } = req.params;
			const spotify = await getUncachableSpotifyClient();

			const playlist = await storage.getPlaylistBySpotifyId(id);
			if (!playlist) {
				return res.status(404).json({ message: "Playlist not found" });
			}

			const tracks = await spotify.playlists.getPlaylistItems(
				id,
				undefined,
				undefined,
				50,
			);

			// Get audio features for tracks
			const trackIds = tracks.items
				.filter((item: any) => item.track && item.track.type === "track")
				.map((item: any) => (item.track as any).id)
				.filter(Boolean);

			const audioFeatures = await spotify.tracks.audioFeatures(trackIds);

			const tracksWithFeatures = tracks.items
				.map((item: any, _index: number) => {
					if (item.track && item.track.type === "track") {
						return {
							...item.track,_index
							audio_features:
								audioFeatures[trackIds.indexOf((item.track as any).id)],
						};
					}
					return item.track;
				})
				.filter(Boolean);

			res.json(tracksWithFeatures);
		} catch (error) {
			console.error("Failed to fetch playlist tracks:", error);
			res.status(500).json({ message: "Failed to fetch playlist tracks" });
		}
	});

	// Generate playlist using AI
	app.post("/api/generate-playlist", requireAuth, async (req: any, res) => {
		try {
			const { selectedPlaylistIds, prompt } = req.body;

			if (!selectedPlaylistIds || selectedPlaylistIds.length === 0) {
				return res
					.status(400)
					.json({ message: "At least one playlist must be selected" });
			}

			const spotify = await getUncachableSpotifyClient();

			// Fetch tracks from selected playlists
			const sourcePlaylists = [];
			for (const playlistId of selectedPlaylistIds) {
				const playlist = await storage.getPlaylistBySpotifyId(playlistId);
				if (playlist) {
					const tracks = await spotify.playlists.getPlaylistItems(
						playlistId,
						undefined,
						undefined,
						50,
					);
					const trackIds = tracks.items
						.filter((item: any) => item.track && item.track.type === "track")
						.map((item: any) => (item.track as any).id)
						.filter(Boolean);

					const audioFeatures = await spotify.tracks.audioFeatures(trackIds);

					const tracksWithFeatures = tracks.items
						.map((item: any, _index: number) => {
							if (item.track && item.track.type === "track") {
								return {
									...item.track,_index
									audio_features:
										audioFeatures[trackIds.indexOf((item.track as any).id)],
								};
							}
							return item.track;
						})
						.filter(Boolean);

					sourcePlaylists.push({
						name: playlist.name,
						tracks: tracksWithFeatures,
					});
				}
			}

			// Generate playlist using AI
			const analysis = await analyzePlaylistsAndGenerate(
				sourcePlaylists,
				prompt || "Create an energetic playlist perfect for a road trip",
			);

			// Find matching tracks from source playlists
			const matchedTracks: any[] = [];
			for (const recommendation of analysis.recommended_tracks) {
				for (const sourcePlaylist of sourcePlaylists) {
					const matchingTrack = sourcePlaylist.tracks.find(
						(track: any) =>
							track.name
								.toLowerCase()
								.includes(recommendation.name.toLowerCase()) ||
							track.artists.some((artist: any) =>
								artist.name
									.toLowerCase()
									.includes(recommendation.artist.toLowerCase()),
							),
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

			// Save generated playlist
			const generatedPlaylist = await storage.createGeneratedPlaylist({
				userId: req.session.userId,
				name: analysis.playlist_name,
				description: analysis.playlist_description,
				sourcePlaylistIds: selectedPlaylistIds,
				tracks: matchedTracks,
				aiPrompt: prompt,
			});

			res.json({
				...generatedPlaylist,
				analysis,
				tracks: matchedTracks,
			});
		} catch (error) {
			console.error("Failed to generate playlist:", error);
			res.status(500).json({ message: "Failed to generate playlist" });
		}
	});

	// Save generated playlist to Spotify
	app.post("/api/save-to-spotify/:id", requireAuth, async (req: any, res) => {
		try {
			const { id } = req.params;
			const generatedPlaylist = await storage.getGeneratedPlaylist(id);

			if (
				!generatedPlaylist ||
				generatedPlaylist.userId !== req.session.userId
			) {
				return res
					.status(404)
					.json({ message: "Generated playlist not found" });
			}

			if (generatedPlaylist.spotifyPlaylistId) {
				return res
					.status(400)
					.json({ message: "Playlist already saved to Spotify" });
			}

			const spotify = await getUncachableSpotifyClient();
			const user = await spotify.currentUser.profile();

			// Create playlist in Spotify
			const spotifyPlaylist = await spotify.playlists.createPlaylist(user.id, {
				name: generatedPlaylist.name,
				description: generatedPlaylist.description || "Generated by PlaylistAI",
				public: false,
			});

			// Add tracks to playlist
			const trackUris = (generatedPlaylist.tracks as any[])
				.filter((track) => track.uri)
				.map((track) => track.uri);

			if (trackUris.length > 0) {
				await spotify.playlists.addItemsToPlaylist(
					spotifyPlaylist.id,
					trackUris,
				);
			}

			// Update our record
			await storage.updateGeneratedPlaylist(id, {
				spotifyPlaylistId: spotifyPlaylist.id,
			});

			res.json({
				spotifyUrl: spotifyPlaylist.external_urls.spotify,
				playlistId: spotifyPlaylist.id,
			});
		} catch (error) {
			console.error("Failed to save playlist to Spotify:", error);
			res.status(500).json({ message: "Failed to save playlist to Spotify" });
		}
	});

	// Chat endpoint
	app.post("/api/chat", requireAuth, async (req: any, res) => {
		try {
			const { message, context } = req.body;

			// Save user message
			await storage.createChatMessage({
				userId: req.session.userId,
				role: "user",
				content: message,
				playlistGenerationId: context?.generationId,
			});

			// Get recent chat history
			const recentMessages = await storage.getChatMessages(
				req.session.userId,
				10,
			);

			const messages = recentMessages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// Generate AI response
			const aiResponse = await generateChatResponse(messages, context);

			// Save AI message
			await storage.createChatMessage({
				userId: req.session.userId,
				role: "assistant",
				content: aiResponse,
				playlistGenerationId: context?.generationId,
			});

			res.json({ response: aiResponse });
		} catch (error) {
			console.error("Failed to process chat:", error);
			res.status(500).json({ message: "Failed to process chat message" });
		}
	});

	// Get chat history
	app.get("/api/chat", requireAuth, async (req: any, res) => {
		try {
			const messages = await storage.getChatMessages(req.session.userId, 50);
			res.json(messages);
		} catch (error) {
			console.error("Failed to fetch chat history:", error);
			res.status(500).json({ message: "Failed to fetch chat history" });
		}
	});

	// Mock authentication endpoint (in real app, this would be Spotify OAuth)
	app.post("/api/auth/mock", async (req: any, res) => {
		try {
			console.log("Session object:", req.session);
			// This is a mock endpoint for development
			const mockUser = await storage.createUser({
				spotifyId: "mock_user_123",
				email: "user@example.com",
				displayName: "John Doe",
			});

			if (req.session) {
				req.session.userId = mockUser.id;
				await new Promise((resolve, reject) => {
					req.session.save((err: any) => {
						if (err) reject(err);
						else resolve(true);
					});
				});
			}
			res.json(mockUser);
		} catch (error) {
			console.error("Mock auth failed:", error);
			res.status(500).json({ message: "Authentication failed" });
		}
	});

	const httpServer = createServer(app);
	return httpServer;
}
