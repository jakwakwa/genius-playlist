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

const prompt = `You are a playlist generator. Respond ONLY with valid strict JSON as described below.
Do not include ANY markdown, prose, code blocks, explanations, comments, or extra text. Start with { and end with }. Each array and key MUST be present.

Format your reply as:
{
  "theme": string,
  "mood": string,
  "energy_level": number, // 1-10
  "genres": string[],
  "recommended_tracks": [
    {
      "name": string,
      "artist": string,
      "reason": string,
      "energy_score": number // 1-10
    }
  ],
  "playlist_name": string,
  "playlist_description": string
}

Repeat: DO NOT explain your answer. No prose, markdown, or extra characters—ONLY valid JSON.

User has selected these Spotify playlists:
${JSON.stringify(playlistData, null, 2)}

User Request: 
use 30 tracks, mixed vibe 
- 60% recent similar releases,
- ~40% adjacent/similar artists for discovery
- Exclude songs already in my selected playlists
- scan selected playlists 
- Scan playlist only 
            
${userPrompt}
`;

	try {
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
			max_completion_tokens: 4096,
		});

		let rawContent = response.choices[0].message.content || "{}";
		try {
			// Try parsing full response
			return JSON.parse(rawContent) as PlaylistAnalysis;
		} catch {
			// Fallback: Extract first JSON object in the response (handles rare Markdown output)
			const match = rawContent.match(/\{([\s\S]*?)\}/);
			if (match) {
				try {
					return JSON.parse(match[0]) as PlaylistAnalysis;
				} catch (err2) {
					throw new Error(`OpenAI returned an invalid JSON block in response: ${rawContent}`);
				}
			} else {
				throw new Error(`OpenAI did not return valid JSON. Response: ${rawContent}`);
			}
		}
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
			max_completion_tokens: 8048,
		});

		return response.choices[0].message.content || "I'm having trouble responding right now. Please try again.";
	} catch (error) {
		throw new Error(`Failed to generate chat response: ${error}`);
	}
}
