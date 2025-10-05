// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
import { openai } from "../app/openai";

export interface PlaylistAnalysis {
	theme: string;
	mood: string;
	energy_level: number;
	genres: string[];
	recommended_tracks: Array<{
		name: string;
		artist: string;
		reason: string;
		energy_score: number;
	}>;
	playlist_name: string;
	playlist_description: string;
}

export async function analyzePlaylistsAndGenerate(
	sourcePlaylists: Array<{
		name: string;
		tracks: Array<{
			name: string;
			artists: Array<{ name: string }>;
			album: { name: string };
			audio_features?: any;
		}>;
	}>,
	userPrompt: string
): Promise<PlaylistAnalysis> {
	const playlistData = sourcePlaylists.map(playlist => ({
		name: playlist.name,
		tracks: playlist.tracks.map(track => ({
			name: track.name,
			artist: track.artists.map(a => a.name).join(", "),
			album: track.album.name,
			audio_features: track.audio_features,
		})),
	}));

	const prompt = `Analyze these Spotify playlists and create a new cohesive playlist based on the user's request.

Source Playlists:
${JSON.stringify(playlistData, null, 2)}

User Request: ${userPrompt}

Create a new playlist that intelligently combines tracks from these sources. Consider:
1. Musical characteristics (tempo, energy, mood, genre)
2. Flow and transitions between songs
3. Overall cohesiveness and theme
4. User's specific request and preferences

Respond with JSON in this exact format:
{
  "theme": "Brief theme description",
  "mood": "Overall mood",
  "energy_level": 1-10,
  "genres": ["genre1", "genre2"],
  "recommended_tracks": [
    {
      "name": "Track Name",
      "artist": "Artist Name", 
      "reason": "Why this track fits",
      "energy_score": 1-10
    }
  ],
  "playlist_name": "Generated Playlist Name",
  "playlist_description": "Playlist description"
}

Recommend 20-30 tracks total, selecting the best matches from the source playlists.`;

	try {
		const response = await openai().chat.completions.create({
			model: "gpt-5",
			messages: [
				{
					role: "system",
					content: "You are an expert music curator and playlist generator. Analyze music data and create cohesive playlists based on musical characteristics.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			response_format: { type: "json_object" },
			max_completion_tokens: 4096,
		});

		const result = JSON.parse(response.choices[0].message.content || "{}");
		return result as PlaylistAnalysis;
	} catch (error) {
		throw new Error(`Failed to generate playlist analysis: ${error}`);
	}
}

export async function generateChatResponse(
	messages: Array<{ role: string; content: string }>,
	context?: {
		selectedPlaylists?: string[];
		currentGeneration?: any;
	}
): Promise<string> {
	try {
		const systemPrompt = `You are an AI music assistant helping users create perfect playlists from their Spotify library. 
    
You can help with:
- Analyzing their musical taste
- Suggesting playlist themes and moods
- Recommending track combinations
- Refining playlist generation parameters

Be conversational, helpful, and music-focused. If they have selected playlists, reference them naturally.

${context?.selectedPlaylists ? `Selected playlists: ${context.selectedPlaylists.join(", ")}` : ""}`;

		const response = await openai().chat.completions.create({
			model: "gpt-5",
			messages: [
				{ role: "system", content: systemPrompt },
				...messages.map(m => ({
					role: m.role as "user" | "assistant",
					content: m.content,
				})),
			],
			max_completion_tokens: 2048,
		});

		return response.choices[0].message.content || "I'm having trouble responding right now. Please try again.";
	} catch (error) {
		throw new Error(`Failed to generate chat response: ${error}`);
	}
}
