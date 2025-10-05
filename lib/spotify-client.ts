import { prisma } from "@/lib/prisma";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

function basicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function getUserTokens(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  return {
    accessToken: user.spotifyAccessToken ?? "",
    refreshToken: user.spotifyRefreshToken ?? "",
    expiresAt: user.tokenExpiresAt ?? null,
  };
}

async function refreshAccessToken(userId: string) {
  const tokens = await getUserTokens(userId);
  if (!tokens.refreshToken) throw new Error("No refresh token");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth(process.env.SPOTIFY_CLIENT_ID!, process.env.SPOTIFY_CLIENT_SECRET!)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }).toString(),
  });

  if (!res.ok) throw new Error("Failed to refresh Spotify token");
  const json = await res.json();

  const newAccessToken = json.access_token as string;
  const expiresIn = json.expires_in as number;
  const newRefreshToken = (json.refresh_token as string | undefined) ?? tokens.refreshToken;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: newAccessToken,
      spotifyRefreshToken: newRefreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });

  return {
    accessToken: updated.spotifyAccessToken!,
    refreshToken: updated.spotifyRefreshToken!,
    expiresAt: updated.tokenExpiresAt!,
  };
}

function isExpired(expiresAt: Date | null) {
  if (!expiresAt) return true;
  return Date.now() > expiresAt.getTime() - 60_000;
}

export async function getValidAccessToken(userId: string) {
  const tokens = await getUserTokens(userId);
  if (!tokens.accessToken || isExpired(tokens.expiresAt)) {
    const refreshed = await refreshAccessToken(userId);
    return refreshed.accessToken;
  }
  return tokens.accessToken;
}

export async function spotifyFetch(userId: string, input: string, init?: RequestInit) {
  let token = await getValidAccessToken(userId);
  let res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    token = await refreshAccessToken(userId).then((t) => t.accessToken);
    res = await fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return res;
}

// Legacy compatibility - kept for backward compatibility but will use new token system
export async function getUncachableSpotifyClient(userId?: string) {
  if (!userId) {
    throw new Error("userId is required for getUncachableSpotifyClient");
  }
  
  const token = await getValidAccessToken(userId);
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  
  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: token,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "", // Handled by our refresh logic
  });
  
  return spotify;
}
