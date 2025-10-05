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
	console.log("Source playlists count:", sourcePlaylists.length);
	console.log("First playlist tracks count:", sourcePlaylists[0]?.tracks?.length || 0);
	
	// Simplify track data - only send name, artist, album (no audio features or extra data)
	const playlistData = sourcePlaylists.map(playlist => ({
		name: playlist.name,
		tracks: playlist.tracks.slice(0, 50).map(track => ({ // Limit to 50 tracks max per playlist
			name: track.name,
			artist: track.artists.map(a => a.name).join(", "),
			album: track.album.name,
		})),
	}));

	const prompt = `Analyze the playlist below and recommend 25 NEW songs (NOT from the list below).

IMPORTANT: Recommend NEW songs based on style/artists. NO songs from the list below.

Playlist: ${playlistData[0]?.name}
Tracks:
${playlistData[0]?.tracks.map((t: any) => `${t.artist} - ${t.name}`).join('\n')}

User request: ${userPrompt}

Respond ONLY with valid JSON (no markdown):
{
  "theme": string,
  "mood": string,
  "energy_level": number,
  "genres": [string],
  "recommended_tracks": [
    {"name": string, "artist": string, "reason": string, "energy_score": number}
  ],
  "playlist_name": string,
  "playlist_description": string
}`;

	try {
		console.log("Calling OpenAI with prompt length:", prompt.length);
		console.log("Playlist data has", playlistData.length, "playlists with", playlistData[0]?.tracks?.length, "tracks");
		
		const response = await openai().chat.completions.create({
			model: "gpt-5",
			messages: [
				{
					role: "system",
					content: "You are an expert music curator and playlist generator. Analyze music data and create a cohesive playlist based on instructions.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			response_format: { type: "json_object" },
			max_completion_tokens: 16000,
		});
		
		console.log("OpenAI response received, finish_reason:", response.choices[0]?.finish_reason);

		const rawContent = response.choices[0].message.content || "{}";
		console.log("Raw OpenAI response:", rawContent.substring(0, 500));
		
		try {
			// Try parsing full response
			return JSON.parse(rawContent) as PlaylistAnalysis;
		} catch (parseError) {
			console.error("Failed to parse OpenAI response:", parseError);
			// Fallback: Extract first JSON object in the response (handles rare Markdown output)
			const match = rawContent.match(/\{([\s\S]*?)\}/);
			if (match) {
				try {
					return JSON.parse(match[0]) as PlaylistAnalysis;
				} catch (_err2) {
					console.error("Failed to parse matched JSON:", _err2);
					throw new Error(`OpenAI returned an invalid JSON block in response: ${rawContent}`);
				}
			} else {
				throw new Error(`OpenAI did not return valid JSON. Response: ${rawContent}`);
			}
		}
	} catch (error) {
		console.error("Error in analyzePlaylistsAndGenerate:", error);
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
			max_completion_tokens: 16000,
		});

		return response.choices[0].message.content || "I'm having trouble responding right now. Please try again.";
	} catch (error) {
		throw new Error(`Failed to generate chat response: ${error}`);
	}
}
