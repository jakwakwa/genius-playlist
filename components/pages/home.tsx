"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession, signIn } from "next-auth/react";
import { Music, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Import your existing components
// You'll need to ensure these are also marked as "use client" if they use hooks
// import MobileNav from "@/components/mobile-nav";
// import PlaylistSelector from "@/components/playlist-selector";
// import Sidebar from "@/components/ui/sidebar";
// import ChatInterface from "@/components/chat-interface";
// import GeneratedPlaylist from "@/components/generated-playlist";

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
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onDismiss}
                        className="bg-black bg-opacity-30 hover:bg-opacity-40"
                    >
                        Not Now
                    </Button>
                    <Button
                        size="sm"
                        onClick={onInstall}
                        className="bg-black hover:bg-opacity-80"
                    >
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
    const [generatedPlaylist, setGeneratedPlaylist] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const { toast } = useToast();

    // Fetch user data - only enabled when authenticated
    const { data: user } = useQuery<any>({
        queryKey: ["/api/user"],
        enabled: status === "authenticated",
        queryFn: async () => {
            const res = await fetch("/api/user");
            if (!res.ok) throw new Error("Failed to fetch user");
            return res.json();
        },
    });

    // Fetch playlists - only enabled when authenticated
    const { data: playlists = [] } = useQuery<any[]>({
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
        const handleBeforeInstallPrompt = (e: any) => {
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
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
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
        setSelectedPlaylists(prev =>
            prev.includes(playlistId)
                ? prev.filter(id => id !== playlistId)
                : [...prev, playlistId]
        );
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
        }
    };

    // Handle unauthenticated state
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                    <Music className="w-16 h-16 text-primary mx-auto mb-6" />
                    <h1 className="text-3xl font-bold mb-3">Welcome to PlaylistGenius</h1>
                    <p className="text-muted-foreground mb-8">
                        Create amazing AI-powered playlists from your Spotify library
                    </p>
                    <Button
                        size="lg"
                        onClick={() => signIn("spotify")}
                        className="gap-2"
                    >
                        <Music className="w-5 h-5" />
                        Sign in with Spotify
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {showInstallBanner && (
                <PWAInstallBanner
                    onInstall={handleInstallPWA}
                    onDismiss={handleDismissInstall}
                />
            )}

            <div className="flex h-screen overflow-hidden">
                <Sidebar user={user} />

                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="bg-gradient-to-b from-secondary to-transparent p-6 lg:p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl lg:text-4xl font-bold mb-2">Create AI Playlist</h2>
                                <p className="text-muted-foreground">Select playlists and let AI create the perfect mix</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    className="hidden lg:flex items-center gap-2"
                                    onClick={() => handleGeneratePlaylist()}
                                    disabled={selectedPlaylists.length === 0}
                                    data-testid="button-generate-playlist"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate Playlist
                                </Button>
                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold">
                                        {user.displayName.charAt(0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
                        <div className="p-6 lg:p-8 space-y-8">
                            <PlaylistSelector
                                playlists={playlists}
                                selectedPlaylists={selectedPlaylists}
                                onTogglePlaylist={togglePlaylistSelection}
                            />

                            <ChatInterface
                                selectedPlaylists={selectedPlaylists}
                                onGeneratePlaylist={handleGeneratePlaylist}
                            />

                            {generatedPlaylist && (
                                <GeneratedPlaylist playlist={generatedPlaylist} />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <MobileNav />

            {/* Floating Action Button for mobile */}
            <Button
                className="lg:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl z-40"
                onClick={() => handleGeneratePlaylist()}
                disabled={selectedPlaylists.length === 0}
                data-testid="button-generate-mobile"
            >
                <Sparkles className="w-6 h-6" />
            </Button>
        </div>
    );
}
