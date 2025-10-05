import type { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			spotifyId?: string;
		} & DefaultSession["user"];
	}

	interface User {
		spotifyId?: string;
		spotifyAccessToken?: string;
		spotifyRefreshToken?: string;
		displayName?: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		accessToken?: string;
		refreshToken?: string;
		spotifyId?: string;
		expiresAt?: number;
		displayName?: string;
	}
}
