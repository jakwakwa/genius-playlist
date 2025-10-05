//  CHANGE BELOW TO PRISMA SCHEMA

// export const users = pgTable("users", {
// 	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
// 	spotifyId: text("spotify_id").notNull().unique(),
// 	email: text("email").notNull(),
// 	displayName: text("display_name").notNull(),
// 	spotifyAccessToken: text("spotify_access_token"),
// 	spotifyRefreshToken: text("spotify_refresh_token"),
// 	tokenExpiresAt: timestamp("token_expires_at"),
// 	createdAt: timestamp("created_at").defaultNow(),
// });

// export const playlists = pgTable("playlists", {
// 	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
// 	userId: varchar("user_id")
// 		.notNull()
// 		.references(() => users.id),
// 	spotifyId: text("spotify_id").notNull(),
// 	name: text("name").notNull(),
// 	description: text("description"),
// 	imageUrl: text("image_url"),
// 	trackCount: text("track_count").notNull(),
// 	isOwner: boolean("is_owner").notNull().default(false),
// 	createdAt: timestamp("created_at").defaultNow(),
// });

// export const generatedPlaylists = pgTable("generated_playlists", {
// 	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
// 	userId: varchar("user_id")
// 		.notNull()
// 		.references(() => users.id),
// 	name: text("name").notNull(),
// 	description: text("description"),
// 	spotifyPlaylistId: text("spotify_playlist_id"),
// 	sourcePlaylistIds: json("source_playlist_ids").$type<string[]>().notNull(),
// 	tracks: json("tracks").$type<any[]>().notNull(),
// 	aiPrompt: text("ai_prompt"),
// 	createdAt: timestamp("created_at").defaultNow(),
// });

// export const chatMessages = pgTable("chat_messages", {
// 	id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
// 	userId: varchar("user_id")
// 		.notNull()
// 		.references(() => users.id),
// 	role: text("role").notNull(), // 'user' or 'assistant'
// 	content: text("content").notNull(),
// 	playlistGenerationId: varchar("playlist_generation_id"),
// 	createdAt: timestamp("created_at").defaultNow(),
// });

// export const insertUserSchema = createInsertSchema(users).omit({
// 	id: true,
// 	createdAt: true,
// });

// export const insertPlaylistSchema = createInsertSchema(playlists).omit({
// 	id: true,
// 	createdAt: true,
// });

// export const insertGeneratedPlaylistSchema = createInsertSchema(generatedPlaylists).omit({
// 	id: true,
// 	createdAt: true,
// });

// export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
// 	id: true,
// 	createdAt: true,
// });

// export type InsertUser = z.infer<typeof insertUserSchema>;
// export type User = typeof users.$inferSelect;

// export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
// export type Playlist = typeof playlists.$inferSelect;

// export type InsertGeneratedPlaylist = z.infer<typeof insertGeneratedPlaylistSchema>;
// export type GeneratedPlaylist = typeof generatedPlaylists.$inferSelect;

// export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
// export type ChatMessage = typeof chatMessages.$inferSelect;
