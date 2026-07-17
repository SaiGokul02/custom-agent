import agent from "@/lib/ai/agent";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

function toChatHistory(messages: any[]) {
  return messages
    .filter(
      (msg) =>
        msg.type === "human" ||
        (msg.type === "ai" && typeof msg.content === "string")
    )
    .map((msg) => ({
      role: msg.type,
      content: msg.content,
    }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("thread_id");

  if (!threadId) {
    return Response.json({ error: "thread_id required" }, { status: 400 });
  }

  const state = await agent.getState({ configurable: { thread_id: threadId } });
  const chatHistory = toChatHistory((state as { values: { messages: unknown[] } }).values.messages ?? []);

  return Response.json(chatHistory);
}

export async function POST(req: Request) {
  const { message, threadId } = await req.json();

  if (!threadId || !message) {
    return Response.json({ error: "threadId and message required" }, { status: 400 });
  }

  const userId = await getCurrentUserId() as string;

  const result = await agent.invoke(
    { messages: [{ role: "user", content: message }] },
    { configurable: { thread_id: threadId, userId } } // userId now threaded to every tool call in this invocation
  );

  await prisma.conversations.upsert({
    where: { threadId },
    create: {
      userId,
      threadId,
      title: message.slice(0, 40),
    },
    update: {
      updatedAt: new Date(),
    },
  });

  const chatHistory = toChatHistory(result.messages);

  return Response.json(chatHistory);
}


// import agent from "@/lib/ai/agent";
// import { prisma } from "@/lib/prisma";
// import { getCurrentUserId } from "@/lib/auth";

// function toChatHistory(messages: any[]) {
//   return messages
//     .filter(
//       (msg) =>
//         msg.type === "human" ||
//         (msg.type === "ai" && typeof msg.content === "string")
//     )
//     .map((msg) => ({
//       role: msg.type,
//       content: msg.content,
//     }));
// }

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const threadId = searchParams.get("thread_id");

//   if (!threadId) {
//     return Response.json({ error: "thread_id required" }, { status: 400 });
//   }

//   const state = await agent.getState({ configurable: { thread_id: threadId } });
//   const chatHistory = toChatHistory((state as { values: { messages: unknown[] } }).values.messages ?? []);

//   return Response.json(chatHistory);
// }

// export async function POST(req: Request) {
//   const { message, threadId } = await req.json();

//   if (!threadId || !message) {
//     return Response.json({ error: "threadId and message required" }, { status: 400 });
//   }

//   const userId = await getCurrentUserId() as string;

//   const result = await agent.invoke(
//     { messages: [{ role: "user", content: message }] },
//     { configurable: { thread_id: threadId } }
//   );

//   // Lazily create/update the conversation index row.
//   // - create: only happens on the very first message of a new thread_id
//   // - update: bumps updatedAt so the sidebar can sort by recency
//   await prisma.conversations.upsert({
//     where: { threadId },
//     create: {
//       userId,
//       threadId,
//       title: message.slice(0, 40),
//     },
//     update: {
//       updatedAt: new Date(),
//     },
//   });

//   const chatHistory = toChatHistory(result.messages);

//   return Response.json(chatHistory);
// }