"use client";

import { Check, Music } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Playlist {
	id: string;
	name: string;
	description?: string;
	images?: { url: string }[];
	tracks?: { total: number };
}

interface PlaylistSelectorProps {
	playlists: Playlist[];
	selectedPlaylists: string[];
	onTogglePlaylist: (playlistId: string) => void;
}

export default function PlaylistSelector({ playlists, selectedPlaylists, onTogglePlaylist }: PlaylistSelectorProps) {
	if (!playlists || playlists.length === 0) {
		return (
			<section className="w-full  h-screen  mt-36 mb-0">
				<h3 className="text-xl h-fit font-bold">Your Playlists</h3>
				<Card className="flex flex-col justify-start items-start w-full">
					<Music className="text-shadow-emerald-200 mt-12 animate-bounce" />
					<p className="text-muted-foreground text-left py-8 animate-pulse">Loading playlists... </p>
				</Card>
			</section>
		);
	}

	return (
		<section className="w-full  h-screen  mt-36 mb-0">
			<div className="h-auto">
				<h3 className="text-xl font-bold">Select Playlists ({selectedPlaylists.length} selected)</h3>
				{selectedPlaylists.length > 0 && (
					<Button variant="ghost" size="sm" onClick={() => selectedPlaylists.forEach(id => onTogglePlaylist(id))}>
						Clear All
					</Button>
				)}
			</div>
			<div className="flex flex-wrap gap-4 h-full mt-4 ">
				{playlists.map(playlist => {
					const isSelected = selectedPlaylists.includes(playlist.id);
					return (
						<Card
							key={playlist.id}
							className={`cursor-pointer h-[140px]  max-w-[100px] transition-all hover:scale-105  ${isSelected ? "   my-1" : "m-1"}`}
							onClick={() => onTogglePlaylist(playlist.id)}
							data-testid={`card - playlist - ${playlist.id}`}>
							<div className=" flex flex-col gap-1 ">
								<div className="">
									<div className="aspect-square flex items-center  justify-center ring-2 ring-slate-500 rounded-lg overflow-hidden  ">
										{playlist?.images?.[0]?.url ? (
											<Image width={120} height={120} src={playlist.images[0].url} alt={`${playlist.name}`} className="w-full h-full object-cover" />
										) : (
											<div className="  aspect-square bg-slate-950 flex items-center justify-center  p-4">
												<Music className="w-4 h-4 text-muted-foreground" />
											</div>
										)}
									</div>
									{isSelected && (
										<div className="absolute bg-indigo-600  top-3 right-3 w-6 h-6 rounded-full flex  items-center justify-center outline-blue-400 outline-2">
											<Check className="w-4 h-4 text-green-300" />
										</div>
									)}
								</div>
								<p className="font-bold leading-relaxed text-sm truncate" data-testid={`text - playlist - name - ${playlist.id}`}>
									{playlist.name}
								</p>
								<p className="text-xs truncate px-3 text-muted-foreground">{playlist.tracks?.total || 0} tracks</p>
							</div>
						</Card>
					);
				})}
			</div>
		</section>
	);
}
