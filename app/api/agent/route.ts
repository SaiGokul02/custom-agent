import { agent, model } from "@/lib/ai/agent";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("thread_id");

  if (!threadId) {
    return Response.json({ error: "thread_id required" }, { status: 400 });
  }

  const userId = (await getCurrentUserId()) as string;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatHistory = await prisma.conversations.findFirst({
    where: {
      threadId,
      userId, // ensures the thread belongs to the requesting user
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // New thread with no messages yet, or thread doesn't belong to this user —
  // return empty history instead of crashing or leaking existence of the thread
  if (!chatHistory) {
    return Response.json([]);
  }

  const { messages } = chatHistory;

  return Response.json(messages ?? []);
}

export async function POST(req: Request) {
  const { message, threadId } = await req.json();

  if (!threadId || !message) {
    return Response.json(
      { error: "threadId and message required" },
      { status: 400 },
    );
  }

  const userId = (await getCurrentUserId()) as string;

  // Create/update the conversation immediately.
  await prisma.conversations.upsert({
    where: { threadId },
    create: {
      threadId,
      userId,
      title: message.slice(0, 40), // temporary title
    },
    update: {
      updatedAt: new Date(),
    },
  });

  // Persist the human message right away.
  await prisma.message.create({
    data: {
      threadId,
      role: "human",
      content: message,
    },
  });

  const encoder = new TextEncoder();
  let chatResult = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const agentStream = await agent.stream(
          // @ts-ignore
          {
            messages: [{ role: "user", content: message }],
          },
          {
            configurable: { thread_id: threadId },
            context: { userId },
            streamMode: "messages",
          },
        );

        for await (const chunk of agentStream) {
          const [message] = chunk as any;

          if (message.type !== "ai") continue;

          const piece = message.content;

          if (typeof piece !== "string" || piece.length === 0) continue;

          chatResult += piece;
          controller.enqueue(encoder.encode(piece));
        }
      } catch (err) {
        console.error("stream error:", err);
        controller.error(err);
        return;
      }

      // Persist the ai message before closing the stream.
      try {
        if (chatResult.length > 0) {
          await prisma.message.create({
            data: {
              threadId,
              role: "ai",
              content: chatResult,
            },
          });
        }
      } catch (err) {
        console.error("ai message save error:", err);
      }

      controller.close();

      // Background task (don't await)
      void (async () => {
        try {
          const response = await model.invoke([
            {
              role: "system",
              content:
                "Generate a concise conversation title (max 5 words). Return only the title.",
            },
            {
              role: "user",
              content: chatResult,
            },
          ]);

          const title = response.content as string;

          await prisma.conversations.update({
            where: { threadId },
            data: {
              title,
              updatedAt: new Date(),
            },
          });
        } catch (err) {
          console.error("title update error:", err);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
