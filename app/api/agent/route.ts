import { agent, model } from "@/lib/ai/agent";
import { Command } from "@langchain/langgraph";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

type Decision = "approve" | "reject" | "edit";

type PostBody = {
  message?: string;
  threadId?: string;
  decision?: Decision;
};

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
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  // New thread with no messages yet, or thread doesn't belong
  // to this user — return empty history.
  if (!chatHistory) {
    return Response.json([]);
  }

  const { messages } = chatHistory;

  return Response.json(messages ?? []);
}

export async function POST(req: Request) {
  const body = (await req.json()) as PostBody;

  const { message, threadId, decision, actionRequest } = body;

  if (!threadId) {
    return Response.json({ error: "threadId required" }, { status: 400 });
  }

  if (!message && !decision) {
    return Response.json(
      {
        error: "Either message or decision is required",
      },
      { status: 400 },
    );
  }

  if (decision && !["approve", "reject", "edit"].includes(decision)) {
    return Response.json(
      {
        error: "Invalid decision",
      },
      { status: 400 },
    );
  }

  const userId = (await getCurrentUserId()) as string;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversation = await prisma.conversations.findFirst({
    where: {
      threadId,
      userId,
    },
  });

  if (decision && !conversation) {
    return Response.json(
      {
        error: "Conversation not found",
      },
      { status: 404 },
    );
  }

  if (message) {
    await prisma.conversations.upsert({
      where: {
        threadId,
      },
      create: {
        threadId,
        userId,
        title: message.slice(0, 40),
      },
      update: {
        updatedAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        threadId,
        role: "human",
        content: message,
      },
    });
  }

  const encoder = new TextEncoder();

  const sendEvent = (
    controller: ReadableStreamDefaultController,
    data: unknown,
  ) => {
    controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let chatResult = "";

      try {
        if (message) {
          const agentStream = await agent.streamEvents(
            // @ts-ignore
            {
              messages: [
                {
                  role: "user",
                  content: message,
                },
              ],
            },
            {
              configurable: {
                thread_id: threadId,
              },
              context: {
                userId,
              },
              version: "v3",
            },
          );

          for await (const streamMessage of agentStream.messages) {
            for await (const token of streamMessage.text) {
              if (!token) {
                continue;
              }

              chatResult += token;

              sendEvent(controller, {
                type: "token",
                content: token,
              });
            }
          }

          /*
           * AGENT INTERRUPTED
           *
           * DO NOT automatically resume here.
           *
           * The frontend will receive this event and render the
           * ApprovalCard.
           */
          if (agentStream.interrupted) {
            console.log(
              "Agent interrupted:",
              JSON.stringify(agentStream.interrupts),
            );

            const interrupt = agentStream.interrupts[0];

            if (interrupt) {
              sendEvent(controller, {
                type: "interrupt",
                interruptId: interrupt.interruptId,
                actionRequest: interrupt.payload.actionRequests?.[0] ?? null,
                reviewConfig: interrupt.payload.reviewConfigs?.[0] ?? null,
              });
            }

            /*
             * If some AI text was generated before the interrupt,
             * persist it before ending this request.
             *
             * The next HTTP request will resume the SAME LangGraph
             * thread.
             */
            if (chatResult.length > 0) {
              await prisma.message.create({
                data: {
                  threadId,
                  role: "ai",
                  content: chatResult,
                },
              });
            }

            sendEvent(controller, {
              type: "done",
            });

            controller.close();

            /*
             * IMPORTANT:
             *
             * We return here.
             *
             * We do NOT execute Command({ resume: ... }) in the
             * same request.
             */
            return;
          }
        }

        /*
         * RESUME INTERRUPTED AGENT
         *
         * Example request:
         *
         * {
         *   "threadId": "...",
         *   "decision": "approve"
         * }
         *
         * or:
         *
         * {
         *   "threadId": "...",
         *   "decision": "reject"
         * }
         *
         * or:
         *
         * {
         *   "threadId": "...",
         *   "decision": "edit"
         * }
         */
        if (decision) {
          console.log(`Resuming thread ${threadId} with decision: ${decision}`);
          console.log(actionRequest.args);

          const resumeStream = await agent.streamEvents(
            new Command({
              resume: {
                decisions: [
                  {
                    type: decision,
                    message:
                      decision === "reject"
                        ? "message: `User rejected this action. Do not retry this tool call.`"
                        : "",
                    editedAction:
                      decision === "edit"
                        ? {
                            name: actionRequest.name,
                            args: {
                              ...actionRequest.args,
                            },
                          }
                        : "",
                  },
                ],
              },
            }),
            {
              configurable: {
                thread_id: threadId,
              },
              context: {
                userId,
              },
              version: "v3",
            },
          );

          /*
           * Stream the response generated after the human decision.
           */
          for await (const streamMessage of resumeStream.messages) {
            for await (const token of streamMessage.text) {
              if (!token) {
                continue;
              }

              chatResult += token;

              sendEvent(controller, {
                type: "token",
                content: token,
              });
            }
          }

          /*
           * The resumed execution can potentially interrupt again.
           *
           * For example, the agent may perform another action that
           * also requires approval.
           */
          if (resumeStream.interrupted) {
            console.log(
              "Agent interrupted again:",
              JSON.stringify(resumeStream.interrupts),
            );

            const interrupt = resumeStream.interrupts[0];

            if (interrupt) {
              sendEvent(controller, {
                type: "interrupt",
                interruptId: interrupt.interruptId,
                actionRequest: interrupt.payload.actionRequests?.[0] ?? null,
                reviewConfig: interrupt.payload.reviewConfigs?.[0] ?? null,
              });
            }

            /*
             * Persist any AI text generated before the second
             * interrupt.
             */
            if (chatResult.length > 0) {
              await prisma.message.create({
                data: {
                  threadId,
                  role: "ai",
                  content: chatResult,
                },
              });
            }

            sendEvent(controller, {
              type: "done",
            });

            controller.close();

            return;
          }
        }

        /*
         * PERSIST FINAL AI RESPONSE
         *
         * This happens when the agent completed without another
         * interrupt.
         */
        if (chatResult.length > 0) {
          await prisma.message.create({
            data: {
              threadId,
              role: "ai",
              content: chatResult,
            },
          });
        }

        /*
         * Update conversation timestamp after the agent completes.
         */
        await prisma.conversations.update({
          where: {
            threadId,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        /*
         * Tell the frontend that this agent execution is finished.
         */
        sendEvent(controller, {
          type: "done",
        });

        controller.close();

        //
        // void (async () => {
        //   try {
        //     const response = await model.invoke([
        //       {
        //         role: "system",
        //         content:
        //           "Generate a concise conversation title (max 5 words). Return only the title.",
        //       },
        //       {
        //         role: "user",
        //         content: chatResult,
        //       },
        //     ]);
        //
        //     const title = response.content as string;
        //
        //     await prisma.conversations.update({
        //       where: {
        //         threadId,
        //       },
        //       data: {
        //         title,
        //         updatedAt: new Date(),
        //       },
        //     });
        //   } catch (err) {
        //     console.error("title update error:", err);
        //   }
        // })();
      } catch (err) {
        console.error("stream error:", err);

        // Send the error to the frontend before closing the stream.
        sendEvent(controller, {
          type: "error",
          error: err instanceof Error ? err.message : "Something went wrong",
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// import { agent, model } from "@/lib/ai/agent";
// import { Command } from "@langchain/langgraph";
// import { prisma } from "@/lib/prisma";
// import { getCurrentUserId } from "@/lib/auth";

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const threadId = searchParams.get("thread_id");

//   if (!threadId) {
//     return Response.json({ error: "thread_id required" }, { status: 400 });
//   }

//   const userId = (await getCurrentUserId()) as string;

//   if (!userId) {
//     return Response.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const chatHistory = await prisma.conversations.findFirst({
//     where: {
//       threadId,
//       userId, // ensures the thread belongs to the requesting user
//     },
//     include: {
//       messages: {
//         orderBy: { createdAt: "asc" },
//       },
//     },
//   });

//   // New thread with no messages yet, or thread doesn't belong to this user —
//   // return empty history instead of crashing or leaking existence of the thread
//   if (!chatHistory) {
//     return Response.json([]);
//   }

//   const { messages } = chatHistory;

//   return Response.json(messages ?? []);
// }

// export async function POST(req: Request) {
//   const { message, threadId } = await req.json();

//   if (!threadId || !message) {
//     return Response.json(
//       { error: "threadId and message required" },
//       { status: 400 },
//     );
//   }

//   const userId = (await getCurrentUserId()) as string;

//   // Create/update the conversation immediately.
//   await prisma.conversations.upsert({
//     where: { threadId },
//     create: {
//       threadId,
//       userId,
//       title: message.slice(0, 40), // temporary title
//     },
//     update: {
//       updatedAt: new Date(),
//     },
//   });

//   // Persist the human message right away.
//   await prisma.message.create({
//     data: {
//       threadId,
//       role: "human",
//       content: message,
//     },
//   });

//   const encoder = new TextEncoder();
//   let chatResult = "";

//   const stream = new ReadableStream({
//     async start(controller) {
//       try {
//         // const agentStream = await agent.stream(
//         //   // @ts-ignore
//         //   {
//         //     messages: [{ role: "user", content: message }],
//         //   },
//         //   {
//         //     configurable: { thread_id: threadId },
//         //     context: { userId },
//         //     streamMode: "messages",
//         //   },
//         // );

//         // for await (const chunk of agentStream) {
//         //   const [message] = chunk as any;

//         //   if (message.type !== "ai") continue;

//         //   const piece = message.content;

//         //   if (typeof piece !== "string" || piece.length === 0) continue;

//         //   chatResult += piece;
//         //   controller.enqueue(encoder.encode(piece));
//         // }

//         // Stream agent progress and LLM tokens until interrupt
//         const stream = await agent.streamEvents(
//           // @ts-ignore
//           {
//             messages: [{ role: "user", content: message }],
//           },
//           {
//             configurable: { thread_id: threadId },
//             context: { userId },
//             version: "v3",
//           },
//         );

//         for await (const message of stream.messages) {
//           for await (const token of message.text) {
//             chatResult += token;
//             controller.enqueue(encoder.encode(token));
//           }
//         }

//         // Check whether the run paused for human input
//         if (stream.interrupted) {
//           console.log(`\n\nInterrupt: ${JSON.stringify(stream.interrupts)}`);
//         }

//         // Resume with streaming after human decision
//         const resumeStream = await agent.streamEvents(
//           new Command({ resume: { decisions: [{ type: "approve" }] } }),
//           {
//             configurable: { thread_id: threadId },
//             context: { userId },
//             version: "v3",
//           },
//         );

//         for await (const message of resumeStream.messages) {
//           for await (const token of message.text) {
//             chatResult += token;
//             controller.enqueue(encoder.encode(token));
//           }
//         }
//       } catch (err) {
//         console.error("stream error:", err);
//         controller.error(err);
//         return;
//       }

//       // Persist the ai message before closing the stream.
//       try {
//         if (chatResult.length > 0) {
//           await prisma.message.create({
//             data: {
//               threadId,
//               role: "ai",
//               content: chatResult,
//             },
//           });
//         }
//       } catch (err) {
//         console.error("ai message save error:", err);
//       }

//       controller.close();

//       // // Background task (don't await)
//       // void (async () => {
//       //   try {
//       //     const response = await model.invoke([
//       //       {
//       //         role: "system",
//       //         content:
//       //           "Generate a concise conversation title (max 5 words). Return only the title.",
//       //       },
//       //       {
//       //         role: "user",
//       //         content: chatResult,
//       //       },
//       //     ]);

//       //     const title = response.content as string;

//       //     await prisma.conversations.update({
//       //       where: { threadId },
//       //       data: {
//       //         title,
//       //         updatedAt: new Date(),
//       //       },
//       //     });
//       //   } catch (err) {
//       //     console.error("title update error:", err);
//       //   }
//       // })();
//     },
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/plain; charset=utf-8",
//       "Transfer-Encoding": "chunked",
//     },
//   });
// }
