"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, RotateCcw, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ChatMessage {
	id: string;
	userId: string;
	role: string;
	content: string;
	playlistGenerationId?: string | null;
	createdAt?: Date | string;
}

interface ChatInterfaceProps {
	selectedPlaylists: string[];
	onGeneratePlaylist: (prompt: string) => void;
}

export default function ChatInterface({ selectedPlaylists, onGeneratePlaylist }: ChatInterfaceProps) {
	const [inputValue, setInputValue] = useState("");
	const [resetPending, setResetPending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();

	const { data: messagesData } = useQuery<{ messages: ChatMessage[] }>({
		queryKey: ["/api/chat"],
		queryFn: async () => {
			const res = await fetch("/api/chat");
			if (!res.ok) throw new Error("Failed to fetch messages");
			return res.json();
		},
	});

	const messages = messagesData?.messages || [];

	const chatMutation = useMutation({
		mutationFn: async (message: string) => {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message,
					context: { selectedPlaylists },
				}),
			});
			if (!res.ok) throw new Error("Failed to send message");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
			setInputValue("");
		},
	});

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleReset = async () => {
		if (resetPending) return;
		setResetPending(true);
		try {
			const res = await fetch("/api/chat", { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to reset chat");
			setInputValue("");
			await queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
		} finally {
			setResetPending(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const msg = inputValue.trim();
		if (!msg || chatMutation.isPending) return;

		try {
			await chatMutation.mutateAsync(msg);
		} catch (_err) {
			// error handled by mutation; keep going to optional trigger detection
		}

		// Simple intent detection to trigger playlist generation from chat
		const lower = msg.toLowerCase();
		const wantsGenerate =
			lower === "go" || lower.startsWith("generate") || lower.includes("create playlist") || lower.includes("build it") || lower.includes("add it") || lower.includes("save to spotify");

		if (wantsGenerate) {
			// Use the chat message as the prompt for generation
			onGeneratePlaylist(msg);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			const formEvent = e as unknown as React.FormEvent;
			handleSubmit(formEvent);
		}
	};

	return (
		<section className="w-full pt-12">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold">AI Playlist Assistant</h3>
				<Button variant="ghost" size="sm" onClick={handleReset} disabled={resetPending || chatMutation.isPending} className="gap-2" data-testid="button-reset-chat">
					<RotateCcw className="w-4 h-4" />
					{resetPending ? "Resetting..." : "Reset chat"}
				</Button>
			</div>

			<Card className="border border-border overflow-hidden  ">
				{/* Chat Messages Area */}
				<div className="h-96 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
					{messages.length === 0 && (
						<div className="chat-bubble flex gap-3">
							<div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
								<Bot className="w-4 h-4 text-primary-foreground" />
							</div>
							<div className="flex-1">
								<div className="bg-secondary rounded-2xl rounded-tl-none p-4">
									<p className="text-sm">
										Hi! I can help you create the perfect playlist.
										{selectedPlaylists.length > 0
											? ` I see you've selected ${selectedPlaylists.length} playlist${selectedPlaylists.length > 1 ? "s" : ""}. What kind of mood or theme are you going for?`
											: " Start by selecting some playlists above, then tell me what kind of mood you're going for!"}
									</p>
								</div>
								<p className="text-xs text-muted-foreground mt-1 ml-2">AI Assistant • Just now</p>
							</div>
						</div>
					)}

					{messages.map((message: ChatMessage, _index: number) => (
						<div key={message.id} className={`chat-bubble flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
							{message.role === "assistant" && (
								<div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
									<Bot className="w-4 h-4 text-primary-foreground" />
								</div>
							)}

							<div className={`flex-1 ${message.role === "user" ? "flex flex-col items-end" : ""}`}>
								<div className={`rounded-2xl p-4 max-w-lg ${message.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-secondary rounded-tl-none"}`}>
									<p className="text-sm">{message.content}</p>
								</div>
								<p className={`text-xs text-muted-foreground mt-1 ${message.role === "user" ? "mr-2" : "ml-2"}`}>
									{message.role === "user" ? "You" : "AI Assistant"} • {new Date(message.createdAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
								</p>
							</div>

							{message.role === "user" && (
								<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
									<User className="w-4 h-4" />
								</div>
							)}
						</div>
					))}

					{chatMutation.isPending && (
						<div className="chat-bubble flex gap-3">
							<div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
								<Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
							</div>
							<div className="flex-1">
								<div className="bg-secondary rounded-2xl rounded-tl-none p-4">
									<div className="flex gap-1">
										<div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
										<div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
										<div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground mt-1 ml-2">AI Assistant • Typing...</p>
							</div>
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>

				{/* Chat Input */}
				<div className="border-t border-border p-4">
					<form onSubmit={handleSubmit} className="flex gap-3">
						<Input
							type="text"
							placeholder="Type your message or request..."
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							onKeyPress={handleKeyPress}
							className="flex-1 bg-secondary border-border rounded-full px-6 py-3"
							disabled={chatMutation.isPending}
							data-testid="input-chat-message"
						/>
						<Button type="submit" variant="default" size="icon" className="w-12 h-12 rounded-full" disabled={!inputValue.trim() || chatMutation.isPending} data-testid="button-send-message">
							<Send className="w-4 h-4" />
						</Button>
					</form>
					<p className="text-xs text-muted-foreground mt-2 ml-4">AI-powered by OpenAI • Your data stays private</p>
				</div>
			</Card>
		</section>
	);
}
