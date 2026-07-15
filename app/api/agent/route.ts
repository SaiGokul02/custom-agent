import agent from "@/lib/ai/agent";

// const threadConfig = { configurable: { thread_id: Math.random().toString() } };


export async function POST(req: Request) {
    const { message, threadId } = await req.json();

    console.log("threadId ", threadId);

    const result = await agent.invoke(
        {
            messages: [
                {
                    role: "user",
                    content: message,
                },
            ]
        },
        {
            configurable: {
                thread_id: threadId,
            },
        }
    );

    // // extract final AI message
    // const finalMessage = result.messages
    //     .filter(m => m.type === "ai")
    //     .at(-1)
    //     ?.content;

    // console.log("finalMessage ", finalMessage);

    // return Response.json({
    //     answer: finalMessage,
    // });


    // const chatHistory = result.messages.map((msg) => ({
    //     role: msg.type, // "human" or "ai"
    //     content: msg.content,
    // }));

    console.log(JSON.stringify(result.messages[1], null, 2));

    const chatHistory = result.messages
        .filter(
            msg =>
                msg.type === "human" ||
                (msg.type === "ai" && typeof msg.content === "string")
        )
        .map(msg => ({
            role: msg.type,
            content: msg.content,
        }));


    return Response.json(chatHistory);
}