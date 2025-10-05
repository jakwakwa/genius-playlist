export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChatResponse } from "@/lib/open-client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return Response.json({ messages });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required and must be a string" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        role: "user",
        content: message,
        playlistGenerationId: context?.generationId || null,
      },
    });

    // Get recent chat history for context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const messages = recentMessages
      .reverse()
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Generate AI response
    const aiResponse = await generateChatResponse(messages, context);

    // Save AI response
    const savedAiMessage = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        role: "assistant",
        content: aiResponse,
        playlistGenerationId: context?.generationId || null,
      },
    });

    return Response.json({
      message: savedAiMessage,
      response: aiResponse,
    });
  } catch (error) {
    console.error("Error processing chat message:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await prisma.chatMessage.deleteMany({ where: { userId: session.user.id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error resetting chat:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reset chat" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
