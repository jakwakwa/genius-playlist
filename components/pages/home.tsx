"use client";

import { useQuery } from "@tanstack/react-query";
import { Music, Sparkles } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AppSidebar from "@/components/app-sidebar";
import ChatInterface from "@/components/chat-interface";
import GeneratedPlaylist from "@/components/generated-playlist";
// Import your existing components
import MobileNav from "@/components/mobile-nav";
import PlaylistSelector from "@/components/playlist-selector";
import { Button } from "@/components/ui/button";
import { PlaylistGenerationLoading } from "@/components/ui/loading-screen";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import type { SpotifyTrack } from "@/types/spotify";

interface PWAInstallBannerProps {
	onInstall: () => void;
	onDismiss: () => void;
}

function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
	return (
		<div className="install-banner fixed top-0 left-0 right-0 z-50 p-4 shadow-lg">
			<div className="max-w-7xl mx-auto flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Music className="text-2xl" />
					<div>
						<p className="font-bold">Install PlaylistAI</p>
						<p className="text-sm opacity-90">Add to your home screen for quick access</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="secondary" size="sm" onClick={onDismiss} className="bg-black bg-opacity-30 hover:bg-opacity-40">
						Not Now
					</Button>
					<Button variant="default" size="sm" onClick={onInstall} className="bg-black hover:bg-opacity-80">
						Install
					</Button>
				</div>
			</div>
		</div>
	);
}

export default function Home() {
	const { data: session, status } = useSession();
	const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
	const [generatedPlaylist, setGeneratedPlaylist] = useState<{
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
	} | null>(null);
	const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
	const [showInstallBanner, setShowInstallBanner] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
	const { toast } = useToast();

	// Fetch user data - only enabled when authenticated
	const { data: user } = useQuery<{ displayName?: string }>({
		queryKey: ["/api/user"],
		enabled: status === "authenticated",
		queryFn: async () => {
			const res = await fetch("/api/user");
			if (!res.ok) throw new Error("Failed to fetch user");
			return res.json();
		},
	});

	// Fetch playlists - only enabled when authenticated
	const { data: playlists = [] } = useQuery<Array<{
		id: string;
		name: string;
		images?: Array<{ url: string }>;
		tracks?: { total: number };
	}>>({
		queryKey: ["/api/playlists"],
		enabled: status === "authenticated",
		queryFn: async () => {
			const res = await fetch("/api/playlists");
			if (!res.ok) throw new Error("Failed to fetch playlists");
			return res.json();
		},
	});

	// PWA install prompt handling
	useEffect(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setShowInstallBanner(true);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		};
	}, []);

	const handleInstallPWA = async () => {
		if (deferredPrompt) {
			// Type assertion for BeforeInstallPromptEvent which is not in standard TypeScript types
			const promptEvent = deferredPrompt as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
			promptEvent.prompt();
			const { outcome } = await promptEvent.userChoice;
			if (outcome === "accepted") {
				toast({
					title: "App installed!",
					description: "PlaylistAI has been added to your home screen.",
				});
			}
			setDeferredPrompt(null);
		}
		setShowInstallBanner(false);
	};

	const handleDismissInstall = () => {
		setShowInstallBanner(false);
		setDeferredPrompt(null);
	};

	const togglePlaylistSelection = (playlistId: string) => {
		setSelectedPlaylists(prev => (prev.includes(playlistId) ? prev.filter(id => id !== playlistId) : [...prev, playlistId]));
	};

	const handleGeneratePlaylist = async (prompt?: string) => {
		if (selectedPlaylists.length === 0) {
			toast({
				title: "No playlists selected",
				description: "Please select at least one playlist to generate from.",
				variant: "destructive",
			});
			return;
		}

		setIsGeneratingPlaylist(true);
		try {
			const response = await fetch("/api/generate-playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					selectedPlaylistIds: selectedPlaylists,
					prompt: prompt || "Create an energetic playlist perfect for a road trip",
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to generate playlist");
			}

			const result = await response.json();
			setGeneratedPlaylist(result);

			toast({
				title: "Playlist generated!",
				description: `Created "${result.name}" with ${result.tracks.length} tracks.`,
			});
		} catch (_error) {
			toast({
				title: "Generation failed",
				description: "Failed to generate playlist. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsGeneratingPlaylist(false);
		}
	};

	// Handle unauthenticated state
	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Music className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
					<h1 className="text-2xl font-bold mb-2">Loading...</h1>
					<p className="text-muted-foreground">Setting up your session</p>
				</div>
			</div>
		);
	}

	if (status === "unauthenticated") {
		return (
			<div className="min-h-screen flex items-center  justify-center">
				<div className="text-center max-w-md px-4">
					<Music className="w-16 h-16 text-primary mx-auto mb-6" />
					<h1 className="text-3xl font-bold mb-3">Welcome to PlaylistGenius</h1>
					<p className="text-muted-foreground mb-8">Create amazing AI-powered playlists from your Spotify library</p>
					<Button variant="default" size="lg" onClick={() => signIn("spotify")} className="gap-2">
						<Music className="w-5 h-5" />
						Sign in with Spotify
					</Button>
				</div>
			</div>
		);
	}

	return (
		<SidebarProvider>
			<div className="h-screen bg-sidebar not-first:text-slate-300 overflow-hidden">
				{showInstallBanner && <PWAInstallBanner onInstall={handleInstallPWA} onDismiss={handleDismissInstall} />}

				<div className="flex">
					<AppSidebar user={user} />

					<main className="h-auto bg-[#121725]  overflow-y-scroll">
						{/* Header */}
						<header className="fixed w-full justify-between content-center items-center flex flex-row z-10 h-24 px-4 bg-header backdrop-blur-sm" style={{ padding: "0px" }}>
							<div className="flex items-center px-4 justify-between w-[80vw]">
								<div>
									<h2 className=" text-[#fff]/90 text-lg lg:text-xl font-bold ">Create AI Playlist</h2>
									<p className="text-[#fff]/50">Select playlists and let AI create the perfect mix</p>
								</div>
								<div className="flex items-center gap-3">
									<Button variant="default" className="hidden lg:flex items-center gap-2" onClick={() => handleGeneratePlaylist()} disabled={selectedPlaylists.length === 0 || isGeneratingPlaylist} data-testid="button-generate-playlist">
										<Sparkles className="w-4 h-4" />
										{isGeneratingPlaylist ? "Generating..." : "Generate Playlist"}
									</Button>
									<div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
										<span className="text-sm font-bold">{user?.displayName?.charAt(0) ?? session?.user?.name?.charAt(0) ?? session?.user?.email?.charAt(0) ?? "?"}</span>
									</div>
								</div>
							</div>
						</header>
						{!isGeneratingPlaylist && generatedPlaylist &&
							<div className="flex flex-col overflow-y-scroll h-full pt-18 max-w-full w-screen px-8" >

								<GeneratedPlaylist playlist={generatedPlaylist} />
							</div>
						}
						<div className="flex flex-col h-screen   overflow-hidden pt-28 max-w-full w-screen px-8" >

							{isGeneratingPlaylist && <PlaylistGenerationLoading />}
							{!(isGeneratingPlaylist || generatedPlaylist) && (
								<div className="flex w-full flex-row justify-around gap-10">
									<div className=" overflow-y-scroll w-full max-w-[800px]">
										<PlaylistSelector playlists={playlists} selectedPlaylists={selectedPlaylists} onTogglePlaylist={togglePlaylistSelection} />
									</div>

									<ChatInterface selectedPlaylists={selectedPlaylists} onGeneratePlaylist={handleGeneratePlaylist} />
								</div>
							)}
						</div>
					</main>
				</div>

				<MobileNav />

				{/* Floating Action Button for mobile */}
				{!isGeneratingPlaylist && (
					<Button
						variant="default"
						className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl z-40"
						onClick={() => handleGeneratePlaylist()}
						disabled={selectedPlaylists.length === 0}
						data-testid="button-generate-mobile">
						<Sparkles className="w-6 h-6" />
					</Button>
				)}
			</div>
		</SidebarProvider>
	);
}
