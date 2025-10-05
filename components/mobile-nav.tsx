"use client";

import { Home, Search, Sparkles, User } from "lucide-react";

export default function MobileNav() {
    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-border flex items-center justify-around py-3 z-40">
            <button
                className="flex flex-col items-center gap-1 text-foreground"
                data-testid="button-nav-home"
            >
                <Home className="w-6 h-6" />
                <span className="text-xs">Home</span>
            </button>
            <button
                className="flex flex-col items-center gap-1 text-muted-foreground"
                data-testid="button-nav-playlists"
            >
                <Search className="w-6 h-6" />
                <span className="text-xs">Playlists</span>
            </button>
            <button
                className="flex flex-col items-center gap-1 text-muted-foreground"
                data-testid="button-nav-generate"
            >
                <Sparkles className="w-6 h-6" />
                <span className="text-xs">Generate</span>
            </button>
            <button
                className="flex flex-col items-center gap-1 text-muted-foreground"
                data-testid="button-nav-profile"
            >
                <User className="w-6 h-6" />
                <span className="text-xs">Profile</span>
            </button>
        </nav>
    );
}
