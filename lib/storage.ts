import type { ChatMessage, GeneratedPlaylist, InsertChatMessage, InsertGeneratedPlaylist, InsertPlaylist, InsertUser, Playlist, User } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
	getUser(id: string): Promise<User | undefined>;
	getUserBySpotifyId(spotifyId: string): Promise<User | undefined>;
	createUser(user: InsertUser): Promise<User>;

	getPlaylist(id: string): Promise<Playlist | undefined>;
	getPlaylistBySpotifyId(spotifyId: string): Promise<Playlist | undefined>;
	getUserPlaylists(userId: string): Promise<Playlist[]>;
	createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;

	getGeneratedPlaylist(id: string): Promise<GeneratedPlaylist | undefined>;
	getUserGeneratedPlaylists(userId: string): Promise<GeneratedPlaylist[]>;
	createGeneratedPlaylist(playlist: InsertGeneratedPlaylist): Promise<GeneratedPlaylist>;
	updateGeneratedPlaylist(id: string, updates: Partial<GeneratedPlaylist>): Promise<void>;

	getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
	createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
	private users: Map<string, User>;
	private playlists: Map<string, Playlist>;
	private generatedPlaylists: Map<string, GeneratedPlaylist>;
	private chatMessages: Map<string, ChatMessage>;

	constructor() {
		this.users = new Map();
		this.playlists = new Map();
		this.generatedPlaylists = new Map();
		this.chatMessages = new Map();
	}

	async getUser(id: string): Promise<User | undefined> {
		return this.users.get(id);
	}

	async getUserBySpotifyId(spotifyId: string): Promise<User | undefined> {
		return Array.from(this.users.values()).find(user => user.spotifyId === spotifyId);
	}

	async createUser(insertUser: InsertUser): Promise<User> {
		const id = randomUUID();
		const user: User = {
			...insertUser,
			id,
			spotifyAccessToken: null,
			spotifyRefreshToken: null,
			tokenExpiresAt: null,
			createdAt: new Date(),
		};
		this.users.set(id, user);
		return user;
	}

	async getPlaylist(id: string): Promise<Playlist | undefined> {
		return this.playlists.get(id);
	}

	async getPlaylistBySpotifyId(spotifyId: string): Promise<Playlist | undefined> {
		return Array.from(this.playlists.values()).find(playlist => playlist.spotifyId === spotifyId);
	}

	async getUserPlaylists(userId: string): Promise<Playlist[]> {
		return Array.from(this.playlists.values()).filter(playlist => playlist.userId === userId);
	}

	async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
		const id = randomUUID();
		const playlist: Playlist = {
			...insertPlaylist,
			description: insertPlaylist.description ?? null,
			imageUrl: insertPlaylist.imageUrl ?? null,
			isOwner: insertPlaylist.isOwner ?? false,
			id,
			createdAt: new Date(),
		};
		this.playlists.set(id, playlist);
		return playlist;
	}

	async getGeneratedPlaylist(id: string): Promise<GeneratedPlaylist | undefined> {
		return this.generatedPlaylists.get(id);
	}

	async getUserGeneratedPlaylists(userId: string): Promise<GeneratedPlaylist[]> {
		return Array.from(this.generatedPlaylists.values()).filter(playlist => playlist.userId === userId);
	}

	async createGeneratedPlaylist(insertPlaylist: InsertGeneratedPlaylist): Promise<GeneratedPlaylist> {
		const id = randomUUID();
		const playlist: GeneratedPlaylist = {
			...insertPlaylist,
			description: insertPlaylist.description ?? null,
			aiPrompt: insertPlaylist.aiPrompt ?? null,
			sourcePlaylistIds: insertPlaylist.sourcePlaylistIds as string[],
			tracks: insertPlaylist.tracks as any[],
			id,
			spotifyPlaylistId: null,
			createdAt: new Date(),
		};
		this.generatedPlaylists.set(id, playlist);
		return playlist;
	}

	async updateGeneratedPlaylist(id: string, updates: Partial<GeneratedPlaylist>): Promise<void> {
		const playlist = this.generatedPlaylists.get(id);
		if (playlist) {
			this.generatedPlaylists.set(id, { ...playlist, ...updates });
		}
	}

	async getChatMessages(userId: string, limit = 50): Promise<ChatMessage[]> {
		return Array.from(this.chatMessages.values())
			.filter(message => message.userId === userId)
			.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
			.slice(0, limit)
			.reverse();
	}

	async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
		const id = randomUUID();
		const message: ChatMessage = {
			...insertMessage,
			id,
			playlistGenerationId: insertMessage.playlistGenerationId || null,
			createdAt: new Date(),
		};
		this.chatMessages.set(id, message);
		return message;
	}
}

export const storage = new MemStorage();
