import { agent, model } from "@/lib/ai/agent";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

function toChatHistory(messages: any[]) {
  return messages
    .filter(
      (msg) =>
        msg.type === "human" ||
        (msg.type === "ai" && typeof msg.content === "string"),
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
  const chatHistory = toChatHistory(
    (state as { values: { messages: unknown[] } }).values.messages ?? [],
  );

  return Response.json(chatHistory);
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

  const encoder = new TextEncoder();
  let chatResult = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const agentStream = await agent.stream(
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
// export async function POST(req) {
//   const { message, threadId } = await req.json();

//   if (!threadId || !message) {
//     return Response.json({ error: "threadId and message required" }, { status: 400 });
//   }

//   const userId = await getCurrentUserId() as string;
//   const encoder = new TextEncoder();
//   let chatResult = "";

//   const stream = new ReadableStream({
//     async start(controller) {
//       try {
//         const agentStream = await agent.stream(
//           { messages: [{ role: "user", content: message }] },
//           { configurable: { thread_id: threadId }, context: { userId }, streamMode: "messages" }
//         );

//         // for await (const chunk of agentStream) {
//         //   const piece = (chunk as any)[0].content;
//         //   if (typeof piece !== "string") continue;
//         //   chatResult += piece;
//         //   controller.enqueue(encoder.encode(piece));
//         //   await new Promise(r => setTimeout(r, 50)); // remove after testing
//         // }

//         for await (const chunk of agentStream) {
//           const [message] = chunk as any;

//           if (message.type !== "ai") {
//             continue;
//           }

//           const piece = message.content;

//           if (typeof piece !== "string" || piece.length === 0) {
//             continue;
//           }

//           chatResult += piece;
//           controller.enqueue(encoder.encode(piece));
//           await new Promise(r => setTimeout(r, 200)); // remove after testing
//         }

//         console.log("chat result ", chatResult);

//       } catch (err) {
//         console.error("stream error:", err);
//         controller.error(err);
//         return;
//       } finally {
//         controller.close();
//       }

//       try {
//         const response = await model.invoke([
//           { role: "system", content: "Generate a concise conversation title (max 5 words). Return only the title." },
//           { role: "user", content: JSON.stringify(chatResult) },
//         ]);
//         const title = response.content as string;

//         await prisma.conversations.upsert({
//           where: { threadId },
//           create: { userId, threadId, title },
//           update: { updatedAt: new Date() },
//         });
//       } catch (err) {
//         console.error("title/upsert error:", err);
//       }
//     },
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/plain; charset=utf-8",
//       "Transfer-Encoding": "chunked",
//     },
//   });
// }

// export async function POST(req: Request) {
//   const { message, threadId } = await req.json();

//   if (!threadId || !message) {
//     return Response.json({ error: "threadId and message required" }, { status: 400 });
//   }

//   const userId = await getCurrentUserId() as string;

//   const stream = await agent.stream(
//     { messages: [{ role: "user", content: message }] },
//     { configurable: { thread_id: threadId }, context: { userId }, streamMode: "messages" } // userId now threaded to every tool call in this invocation
//   );

//   let chatResult = "";

//   for await (const chunk of stream) {
//     console.log((chunk as any)[0].content);
//     chatResult += (chunk as any)[0].content;
//   }

//   // title for side bar generated and stored in conversations using another just model
//   const response = await model.invoke([
//     {
//       role: "system",
//       content: "Generate a concise conversation title (max 5 words). Return only the title.",
//     },
//     {
//       role: "user",
//       content: JSON.stringify(chatResult),
//     },
//   ]);

//   const title = response.content as string;

//   await prisma.conversations.upsert({
//     where: { threadId },
//     create: {
//       userId,
//       threadId,
//       title
//     },
//     update: {
//       updatedAt: new Date(),
//     },
//   });

//   console.log("chat model result: ", chatResult)

//   return Response.json(chatResult);
// }
