"use client";

import { Home, LogOut, Music, Sparkles, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
    user?: {
        displayName?: string;
        email?: string;
        spotifyId?: string;
    };
}

export default function AppSidebar({ user }: AppSidebarProps) {
    return (
        <Sidebar>
            <SidebarHeader className="w-full h-18  px-4 flex justify-center">
                <div className="flex items-center gap-2">
                    <Music className="w-6 h-6 text-primary" />
                    <span className="text-lg font-bold">PlaylistGenius</span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton isActive>
                                    <Home />
                                    <span>Home</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Sparkles />
                                    <span>Generate</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton>
                                    <Music />
                                    <span>My Playlists</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4">
                {user && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary">
                            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {user.displayName || "User"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {user.email || ""}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => signOut()}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}
