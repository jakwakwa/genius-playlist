import { LoaderIcon, Music, Sparkles } from "lucide-react";

interface LoadingScreenProps {
	title?: string;
	description?: string;
	showIcon?: boolean;
}

export function LoadingScreen({ 
	title = "Loading...", 
	description = "Please wait while we process your request",
	showIcon = true 
}: LoadingScreenProps) {
	return (
		<div className="flex items-center flex-col justify-center h-screen w-full">
			<div className="text-center space-y-6">
				{showIcon && (
					<div className="relative">
						<div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
							<Music className="w-8 h-8 text-white" />
						</div>
						<div className="absolute -top-2 -right-2">
							<Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
						</div>
					</div>
				)}
				<div className="space-y-2">
					<h2 className="text-2xl font-bold text-foreground">{title}</h2>
					<p className="text-muted-foreground max-w-md">{description}</p>
				</div>
				<div className="flex items-center justify-center">
					<LoaderIcon className="w-6 h-6 animate-spin text-primary" />
				</div>
			</div>
		</div>
	);
}

export function PlaylistGenerationLoading() {
	return (
		<div className="flex items-center flex-col justify-center h-screen w-full">
			<div className="text-center space-y-6">
				<div className="relative">
					<div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
						<Music className="w-10 h-10 text-white" />
					</div>
					<div className="absolute -top-2 -right-2">
						<Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
					</div>
				</div>
				<div className="space-y-2">
					<h2 className="text-3xl font-bold text-foreground">Generating Your Playlist</h2>
					<p className="text-muted-foreground max-w-md">
						Our AI is analyzing your selected playlists and creating the perfect mix for you. This may take a moment...
					</p>
				</div>
				<div className="flex items-center justify-center space-x-2">
					<LoaderIcon className="w-6 h-6 animate-spin text-primary" />
					<span className="text-sm text-muted-foreground">Processing...</span>
				</div>
			</div>
		</div>
	);
}
