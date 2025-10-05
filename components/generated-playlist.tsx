"use client";

import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink, Music, Play, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { SiSpotify } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SpotifyArtist, SpotifyTrack } from "@/types/spotify";
import { useToast } from "../hooks/use-toast";

interface GeneratedPlaylistProps {
	playlist: {
		id: string;
		name: string;
		description: string;
		tracks: SpotifyTrack[];
		analysis?: {
			theme: string;
			mood: string;
			energy_level: number;
			genres: string[];
		};
	};
	onRestart?: () => void;
}

export default function GeneratedPlaylist({ playlist, onRestart }: GeneratedPlaylistProps) {
	const [showAllTracks, setShowAllTracks] = useState(false);
	const { toast } = useToast();

	const saveToSpotifyMutation = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/save-to-spotify/${playlist.id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error("Failed to save playlist to Spotify");
			return res.json();
		},
		onSuccess: data => {
			toast({
				title: "Saved to Spotify!",
				description: (
					<div className="flex items-center gap-2">
						<span>Playlist saved successfully.</span>
						<Button variant="outline" size="sm" onClick={() => window.open(data.spotifyUrl, "_blank")}>
							<ExternalLink className="w-3 h-3 mr-1" />
							Open
						</Button>
					</div>
				),
			});
		},
		onError: () => {
			toast({
				title: "Save failed",
				description: "Failed to save playlist to Spotify. Please try again.",
				variant: "destructive",
			});
		},
	});

	const displayedTracks = showAllTracks ? playlist.tracks : playlist.tracks.slice(0, 8);
	const totalDuration = playlist.tracks.reduce((acc, track) => {
		return acc + (track.duration_ms || 0);
	}, 0);

	const formatDuration = (ms: number) => {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const formatTotalDuration = (ms: number) => {
		const hours = Math.floor(ms / 3600000);
		const minutes = Math.floor((ms % 3600000) / 60000);
		return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
	};

	return (
		<section>
			<div
				className="flex min-w-full h-fit overflow-y-scroll items-center justify-between gap-4 mt-28 mb-12
            ">
				<h3 className="text-xl font-bold">Generated Playlist Preview</h3>
				<div className="flex items-center gap-3">
					{onRestart && (
						<Button variant="outline" onClick={onRestart} className="flex items-center gap-2" data-testid="button-start-over">
							<RotateCcw className="w-4 h-4" />
							Start Over
						</Button>
					)}
					<Button variant="default" onClick={() => saveToSpotifyMutation.mutate()} disabled={saveToSpotifyMutation.isPending} className="flex items-center gap-2" data-testid="button-save-spotify">
						<SiSpotify className="w-4 h-4" />
						{saveToSpotifyMutation.isPending ? "Saving..." : "Save to Spotify"}
					</Button>
				</div>
			</div>

			<Card className="border border-border overflow-hidden">
				{/* Playlist Header */}
				<div className="relative h-47 bg-gradient-to-t from-slate-800 to-[#01576a] overflow-hidden">
					<div className="absolute inset-0 gradient-overlay"></div>
					<div className="absolute bottom-0 left-0 right-0 p-6">
						<p className="text-xs text-muted-foreground mb-2">AI GENERATED PLAYLIST</p>
						<h2 className="text-3xl lg:text-4xl font-bold mb-3" data-testid="text-playlist-name">
							{playlist.name}
						</h2>
						<div className="flex items-center gap-2 text-sm">
							<Music className="w-4 h-4" />
							<span>
								Created by AI • {playlist.tracks.length} songs • {formatTotalDuration(totalDuration)}
							</span>
						</div>
						{playlist.analysis && (
							<div className="flex gap-4 mt-3">
								<Badge variant="destructive">{playlist.analysis.mood}</Badge>
								<Badge variant="destructive">Energy: {playlist.analysis.energy_level}/10</Badge>
								{(playlist.analysis.genres ?? []).slice(0, 2).map((genre: string) => (
									<Badge key={genre} variant="outline">
										{genre}
									</Badge>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Track List */}
				<div className="p-6 bg-slate-900">
					<div className="flex items-center gap-6 mb-4 pb-3 border-b border-border text-xs text-[#5e787c] uppercase tracking-wider">
						<div className="w-8 text-center">#</div>
						<div className="flex-1">Title</div>
						<div className="hidden md:block w-48">Album</div>
						<div className="w-16 text-right">Duration</div>
					</div>

					{displayedTracks.map((track, index) => (
						<div key={track.id || index} className="track-row flex items-center gap-6 py-3 px-2 rounded-md cursor-pointer group hover:bg-card/50 transition-colors" data-testid={`row-track-${index}`}>
							<div className="w-8 text-center text-foreground group-hover:text-foreground">
								<span className="group-hover:hidden">{index + 1}</span>
								<Play className="w-3 h-3 hidden group-hover:inline" />
							</div>
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<div className="w-10 h-10 bg-secondary rounded flex items-center justify-center overflow-hidden relative">
									{track.album?.images?.[0]?.url ? (
										<Image src={track.album.images[0].url} alt={`${track.album.name} cover`} fill className="object-cover" sizes="40px" />
									) : (
										<Music className="w-4 h-4 text-muted-foreground" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-medium truncate" data-testid={`text-track-name-${index}`}>
										{track.name}
									</p>
									<p className="text-sm text-muted-foreground truncate" data-testid={`text-artists-${index}`}>
										{track.artists?.map((artist: SpotifyArtist) => artist.name).join(", ") || "Unknown Artist"}
									</p>
								</div>
							</div>
							<div className="hidden md:block w-48 min-w-0">
								<p className="text-sm text-muted-foreground truncate" data-testid={`text-album-${index}`}>
									{track.album?.name || "Unknown Album"}
								</p>
							</div>
							<div className="w-16 text-right text-sm text-muted-foreground" data-testid={`text-duration-${index}`}>
								{formatDuration(track.duration_ms || 0)}
							</div>
						</div>
					))}

					{playlist.tracks.length > 8 && (
						<div className="mt-6 pt-6 border-t border-border text-center">
							<Button variant="ghost" onClick={() => setShowAllTracks(!showAllTracks)} className="text-muted-foreground hover:text-foreground" data-testid="button-toggle-tracks">
								{showAllTracks ? (
									<>
										Show less <ChevronUp className="ml-2 w-4 h-4" />
									</>
								) : (
									<>
										View all {playlist.tracks.length} songs <ChevronDown className="ml-2 w-4 h-4" />
									</>
								)}
							</Button>
						</div>
					)}
				</div>
			</Card>
		</section>
	);
}
