// Spotify API type definitions
export interface SpotifyImage {
	url: string;
	height: number;
	width: number;
}

export interface SpotifyArtist {
	id: string;
	name: string;
	uri: string;
	external_urls?: {
		spotify: string;
	};
}

export interface SpotifyAlbum {
	id: string;
	name: string;
	images: SpotifyImage[];
	release_date?: string;
	uri: string;
}

export interface SpotifyTrack {
	id: string;
	name: string;
	uri: string;
	artists: SpotifyArtist[];
	album: SpotifyAlbum;
	duration_ms: number;
	external_urls?: {
		spotify: string;
	};
	audio_features?: SpotifyAudioFeatures;
}

export interface SpotifyAudioFeatures {
	id: string;
	danceability: number;
	energy: number;
	key: number;
	loudness: number;
	mode: number;
	speechiness: number;
	acousticness: number;
	instrumentalness: number;
	liveness: number;
	valence: number;
	tempo: number;
	duration_ms: number;
	time_signature: number;
}

export interface SpotifyPlaylistItem {
	track: SpotifyTrack | null;
	added_at: string;
}

export interface SpotifyPlaylist {
	id: string;
	name: string;
	description: string | null;
	images: SpotifyImage[];
	owner: {
		id: string;
		display_name: string;
	};
	tracks: {
		total: number;
		items?: SpotifyPlaylistItem[];
	};
	external_urls?: {
		spotify: string;
	};
	uri: string;
}

// Spotify API Response Types
export interface SpotifyPlaylistTracksResponse {
	items: Array<{
		track: SpotifyTrack | null;
		added_at: string;
	}>;
}

export interface SpotifyAudioFeaturesResponse {
	audio_features: Array<SpotifyAudioFeatures | null>;
}

export interface SpotifyPlaylistsResponse {
	items: SpotifyPlaylist[];
}
