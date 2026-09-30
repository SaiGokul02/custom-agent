"use client";

import styles from "./page.module.css";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { ActionRequest, ReviewConfig } from "langchain";
import { ApprovalCard } from "../components/ApprovalCard/ApprovalCard";

type ChatMessage = {
  role: "human" | "ai";
  content: string;
};

type PendingApproval = {
  interruptId: string;
  actionRequest: ActionRequest;
  reviewConfig?: ReviewConfig;
};

type StreamEvent =
  | {
      type: "token";
      content: string;
    }
  | {
      type: "interrupt";
      interruptId: string;
      actionRequest: ActionRequest;
      reviewConfig?: ReviewConfig;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      error: string;
    };

function HomeContent() {
  const searchParams = useSearchParams();
  const threadIdFromUrl = searchParams.get("thread_id");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Currently active conversation thread
  const [threadId, setThreadId] = useState(threadIdFromUrl || "");

  // Text currently typed in the input box
  const [messageInput, setMessageInput] = useState("");

  // Full message history for the active thread
  // loaded from the DB
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Sidebar list of all conversations
  const [conversations, setConversations] = useState<any[]>([]);

  // True while a message is being sent or an approval
  // decision is being processed
  const [isSending, setIsSending] = useState(false);

  // Holds the AI reply text as it streams in
  // before it is saved to `messages`
  const [streamingReply, setStreamingReply] = useState("");

  // Optimistic copy of the user's own message
  const [pendingUserMessage, setPendingUserMessage] =
    useState<ChatMessage | null>(null);

  // Holds the currently pending human approval
  const [pendingApproval, setPendingApproval] =
    useState<PendingApproval | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when a new user message is sent
  useEffect(() => {
    if (pendingUserMessage) {
      const container = chatContainerRef.current;

      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [pendingUserMessage]);

  // Auto-scroll while streaming
  useEffect(() => {
    const container = chatContainerRef.current;

    if (!container) {
      return;
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;

    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, streamingReply, pendingApproval]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [isAuthLoading, user, router]);

  // Input change
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
  };

  // Update URL with active thread
  const navigateToThread = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("thread_id", id);

    router.push(`${pathname}?${params.toString()}`);
  };

  // Select existing conversation
  const handleSelectConversation = (id: string) => {
    setThreadId(id);
    navigateToThread(id);
  };

  // Create a new conversation
  const handleNewChat = () => {
    const newThreadId = crypto.randomUUID();

    setThreadId(newThreadId);
    setMessages([]);
    setStreamingReply("");
    setPendingUserMessage(null);
    setPendingApproval(null);

    navigateToThread(newThreadId);

    return newThreadId;
  };

  // Load conversation history
  const loadConversationHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/agent?thread_id=${id}`);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        console.error("Failed to load conversation history:", res.status);

        setMessages([]);

        return;
      }

      const data = await res.json();

      setMessages(data);

      setStreamingReply("");
      setPendingUserMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Process one NDJSON stream event
  const handleStreamEvent = (
    event: StreamEvent,
    accumulatedReply: {
      value: string;
    },
  ) => {
    switch (event.type) {
      // AI token
      case "token": {
        accumulatedReply.value += event.content;

        setStreamingReply(accumulatedReply.value);

        break;
      }

      // Agent interrupted and needs human approval
      case "interrupt": {
        console.log("Agent interrupt:", event);

        setPendingApproval({
          interruptId: event.interruptId,
          actionRequest: event.actionRequest,
          reviewConfig: event.reviewConfig,
        });

        break;
      }

      // Agent execution completed
      case "done": {
        break;
      }

      // Agent error

      case "error": {
        console.error("Agent stream error:", event.error);
        break;
      }

      default: {
        break;
      }
    }
  };

  // Read the agent NDJSON stream

  const readAgentStream = async (
    response: Response,
    accumulatedReply: {
      value: string;
    },
  ) => {
    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();

    const decoder = new TextDecoder();

    /*
     * A ReadableStream chunk does NOT necessarily represent
     * one complete JSON event.
     *
     * For example, one chunk could contain:
     *
     * {"type":"token","content":"Hel
     *
     * and the next:
     *
     * lo"}\n
     *
     * Therefore we maintain a buffer and only parse complete
     * newline-delimited JSON records.
     */
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      const lines = buffer.split("\n");

      // Keep the final incomplete line in the buffer.

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const event = JSON.parse(line) as StreamEvent;

          handleStreamEvent(event, accumulatedReply);
        } catch (err) {
          console.error("Failed to parse stream event:", line, err);
        }
      }
    }

    // Process any remaining buffered data.
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer) as StreamEvent;

        handleStreamEvent(event, accumulatedReply);
      } catch (err) {
        console.error("Failed to parse final stream event:", buffer, err);
      }
    }
  };

  // Send a new user message
  async function sendMessage(activeThreadId: string) {
    const message = messageInput.trim();

    if (!activeThreadId || !message) {
      return;
    }

    setIsSending(true);
    setStreamingReply("");

    setPendingUserMessage({
      role: "human",
      content: message,
    });

    setMessageInput("");

    // This object is shared with readAgentStream so that every token updates the same accumulated response.
    const accumulatedReply = {
      value: "",
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          threadId: activeThreadId,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(errorText || "Failed to send message");
      }

      /*
       * Read the token / interrupt / done
       * events from the backend.
       */
      await readAgentStream(res, accumulatedReply);

      /*
       * If the agent interrupted, DO NOT clear
       * pendingApproval here.
       *
       * The ApprovalCard needs to remain visible.
       */
      if (!pendingApproval) {
        await loadConversationHistory(activeThreadId);
      }

      await fetchConversations();

      /*
       * Refresh sidebar once more after
       * background title generation, if enabled.
       */
      setTimeout(() => {
        fetchConversations();
      }, 1500);
    } catch (err) {
      console.error(err);

      setStreamingReply("");
      setPendingUserMessage(null);
    } finally {
      setIsSending(false);
    }
  }

  // Handle Approve / Reject
  const handleApproval = async (
    decision: "approve" | "reject" | "edit",
    reason?: string,
    actionRequest?,
  ) => {
    if (!threadId || !pendingApproval) {
      return;
    }

    setIsSending(true);
    setStreamingReply("");

    /*
     * Keep the current approval visible while
     * the decision is being processed.
     */
    const accumulatedReply = {
      value: "",
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          decision,
          reason,
          actionRequest,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(errorText || "Failed to resume agent");
      }

      /*
       * We received the resumed agent stream.
       */
      await readAgentStream(res, accumulatedReply);

      /*
       * Remove the old approval card after
       * the decision has been successfully
       * processed.
       *
       * If another interrupt happened during
       * the resumed execution, the stream
       * handler will set a new pending approval.
       */
      setPendingApproval(null);

      /*
       * Reload the persisted conversation.
       *
       * This is important because the resumed
       * AI response has now been saved by the API.
       */
      await loadConversationHistory(threadId);

      await fetchConversations();
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Send button

  const handleSendClick = () => {
    const activeThreadId = threadId || handleNewChat();

    sendMessage(activeThreadId);
  };

  // Fetch sidebar conversations

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        console.error("Failed to load conversations:", res.status);

        return;
      }

      const data = await res.json();

      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Load history whenever active thread changes

  useEffect(() => {
    if (!threadId || !user) {
      return;
    }

    setIsSending(true);
    setStreamingReply("");
    setPendingUserMessage(null);
    setPendingApproval(null);

    loadConversationHistory(threadId).finally(() => setIsSending(false));
  }, [threadId, user]);

  // Fetch sidebar once authenticated

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Loading state

  if (isAuthLoading || !user) {
    return <p>Loading...</p>;
  }

  // Render

  return (
    <div className={styles.chatbot}>
      {/* Sidebar */}
      <div className={styles.sideBar}>
        <button className={styles.newChatBtn} onClick={handleNewChat}>
          +
        </button>

        {conversations.map((conversation) => (
          <div
            key={conversation.threadId}
            onClick={() => handleSelectConversation(conversation.threadId)}
            className={
              (conversation.threadId === threadId ? styles.activeThread : "") +
              " " +
              styles.openChatWindow
            }
          >
            {conversation.title}
          </div>
        ))}
      </div>
      {/* Main chat                                               */}
      <main className={styles.main}>
        <div className={styles.chatResponse} ref={chatContainerRef}>
          {/* Saved messages                                     */}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.role === "human" ? styles.user : styles.ai}
            >
              {msg.content}
            </div>
          ))}

          {/* Optimistic user message                            */}

          {pendingUserMessage && (
            <div key="pending" className={styles.user}>
              {pendingUserMessage.content}
            </div>
          )}

          {/* Streaming AI response                              */}

          {streamingReply && (
            <div key="streaming" className={styles.ai}>
              {streamingReply}
            </div>
          )}

          {/* Human approval                                     */}

          {pendingApproval && (
            <ApprovalCard
              actionRequest={pendingApproval.actionRequest}
              reviewConfig={pendingApproval.reviewConfig}
              onApprove={() => "approve"}
              onReject={(reason) => handleApproval("reject", reason)}
              onEdit={(actionRequest) =>
                handleApproval("edit", "", actionRequest)
              }
              isProcessing={isSending}
            />
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* Chat input                                            */}
        {/* ---------------------------------------------------- */}

        <div className={styles.chatArea}>
          <input
            className={styles.userInput}
            type="text"
            onChange={handleMessageInputChange}
            value={messageInput}
            placeholder="Ask something"
            disabled={isSending || !!pendingApproval}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !isSending &&
                !pendingApproval
              ) {
                e.preventDefault();
                handleSendClick();
              }
            }}
          />

          <button
            className={styles.submitInput}
            onClick={handleSendClick}
            disabled={isSending || !!pendingApproval}
          >
            &#8593;
          </button>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

// "use client";
// import styles from "./page.module.css";
// import { Suspense, useEffect, useRef, useState } from "react";
// import { usePathname, useSearchParams, useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";

// function HomeContent() {
//   const searchParams = useSearchParams();
//   const threadIdFromUrl = searchParams.get("thread_id");
//   const pathname = usePathname();
//   const router = useRouter();
//   const { user, isLoading: isAuthLoading } = useAuth();

//   // Currently active conversation thread
//   const [threadId, setThreadId] = useState(threadIdFromUrl || "");

//   // Text currently typed in the input box
//   const [messageInput, setMessageInput] = useState("");

//   // Full message history for the active thread (loaded from the DB)
//   const [messages, setMessages] = useState([]);

//   // Sidebar list of all conversations
//   const [conversations, setConversations] = useState([]);

//   // True while a message is being sent and a reply is streaming in
//   const [isSending, setIsSending] = useState(false);

//   // Holds the AI reply text as it streams in, before it's saved to `messages`
//   const [streamingReply, setStreamingReply] = useState("");

//   // Optimistic copy of the user's own message — shown instantly on send,
//   // before the server confirms it. Cleared once `messages` is refreshed
//   // with the real, saved version.
//   const [pendingUserMessage, setPendingUserMessage] = useState(null);

//   const chatContainerRef = useRef(null);

//   // When the user sends a new message, always jump to the bottom so they
//   // see their own message and the reply starting to stream in.
//   useEffect(() => {
//     if (pendingUserMessage) {
//       const container = chatContainerRef.current;
//       if (container) container.scrollTop = container.scrollHeight;
//     }
//   }, [pendingUserMessage]);

//   // While the reply streams in (or history refreshes), only auto-scroll if
//   // the user is already near the bottom — so scrolling up to reread earlier
//   // messages isn't yanked back down.
//   useEffect(() => {
//     const container = chatContainerRef.current;
//     if (!container) return;

//     const isNearBottom =
//       container.scrollHeight - container.scrollTop - container.clientHeight <
//       150;

//     if (isNearBottom) {
//       container.scrollTop = container.scrollHeight;
//     }
//   }, [messages, streamingReply]);

//   // Redirect unauthenticated users before any data fetch happens
//   useEffect(() => {
//     if (!isAuthLoading && !user) {
//       router.push("/login");
//     }
//   }, [isAuthLoading, user, router]);

//   const handleMessageInputChange = (e) => {
//     setMessageInput(e.target.value);
//   };

//   // Updates the URL's `thread_id` query param to reflect the active thread
//   const navigateToThread = (id) => {
//     const params = new URLSearchParams(searchParams.toString());
//     params.set("thread_id", id);
//     router.push(`${pathname}?${params.toString()}`);
//   };

//   const handleSelectConversation = (id) => {
//     setThreadId(id);
//     navigateToThread(id);
//   };

//   const handleNewChat = () => {
//     const newThreadId = crypto.randomUUID();
//     setThreadId(newThreadId);
//     setMessages([]);
//     setStreamingReply("");
//     setPendingUserMessage(null);
//     navigateToThread(newThreadId);
//     return newThreadId;
//   };

//   // Fetches the saved message history for a thread and syncs local state to it
//   const loadConversationHistory = async (id) => {
//     try {
//       const res = await fetch(`/api/agent?thread_id=${id}`);

//       if (res.status === 401) {
//         router.push("/login");
//         return;
//       }

//       if (!res.ok) {
//         console.error("Failed to load conversation history:", res.status);
//         setMessages([]);
//         return;
//       }

//       const data = await res.json();
//       setMessages(data); // always the full, real history — no popping/trimming
//       setStreamingReply(""); // clear scratch buffer now that messages has caught up
//       setPendingUserMessage(null); // clear optimistic bubble now that messages has caught up
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // Sends a message to the agent and streams the reply back in
//   async function sendMessage(activeThreadId) {
//     if (!activeThreadId || !messageInput) return;

//     setIsSending(true);
//     setStreamingReply("");
//     setPendingUserMessage({ role: "human", content: messageInput }); // show immediately, before the request even goes out
//     setMessageInput(""); // clear input right away too, now that the message is safely in pendingUserMessage

//     try {
//       const res = await fetch("/api/agent", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           message: messageInput,
//           threadId: activeThreadId,
//         }),
//       });

//       if (res.status === 401) {
//         router.push("/login");
//         return;
//       }

//       const reader = res.body.getReader();
//       const decoder = new TextDecoder();
//       let accumulatedReply = "";

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;
//         accumulatedReply += decoder.decode(value, { stream: true });
//         setStreamingReply(accumulatedReply);
//       }

//       await loadConversationHistory(activeThreadId); // refreshes `messages`, then clears streamingReply + pendingUserMessage
//       await fetchConversations();

//       // Refresh sidebar once more after the background title-generation finishes
//       setTimeout(() => {
//         fetchConversations();
//       }, 1500);
//     } catch (err) {
//       console.error(err);
//       setStreamingReply("");
//       setPendingUserMessage(null);
//     } finally {
//       setIsSending(false);
//     }
//   }

//   const handleSendClick = () => {
//     const activeThreadId = threadId || handleNewChat();
//     sendMessage(activeThreadId);
//   };

//   // Fetches the sidebar list of all conversations
//   async function fetchConversations() {
//     try {
//       const res = await fetch("/api/conversations");

//       if (res.status === 401) {
//         router.push("/login");
//         return;
//       }

//       if (!res.ok) {
//         console.error("Failed to load conversations:", res.status);
//         return;
//       }

//       const data = await res.json();
//       setConversations(data);
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   // Load history whenever the active thread changes
//   useEffect(() => {
//     if (!threadId || !user) return;

//     setIsSending(true);
//     setStreamingReply(""); // clear any leftover streaming state from a previous thread
//     setPendingUserMessage(null); // clear any leftover optimistic bubble from a previous thread

//     loadConversationHistory(threadId).finally(() => setIsSending(false));
//   }, [threadId, user]);

//   // Only fetch the sidebar once we know the user is authenticated
//   useEffect(() => {
//     if (user) {
//       fetchConversations();
//     }
//   }, [user]);

//   // While auth is resolving, or once we know we're redirecting, don't render the chat UI
//   if (isAuthLoading || !user) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className={styles.chatbot}>
//       <div className={styles.sideBar}>
//         <button className={styles.newChatBtn} onClick={handleNewChat}>
//           +
//         </button>
//         {conversations.map((conversation) => (
//           <div
//             key={conversation.threadId}
//             onClick={() => handleSelectConversation(conversation.threadId)}
//             className={
//               (conversation.threadId === threadId ? styles.activeThread : "") +
//               " " +
//               styles.openChatWindow
//             }
//           >
//             {conversation.title}
//           </div>
//         ))}
//       </div>

//       <main className={styles.main}>
//         <div className={styles.chatResponse} ref={chatContainerRef}>
//           {messages.map((msg, index) => (
//             <div
//               key={index}
//               className={msg.role === "human" ? styles.user : styles.ai}
//             >
//               {msg.content}
//             </div>
//           ))}

//           {pendingUserMessage && (
//             <div key="pending" className={styles.user}>
//               {pendingUserMessage.content}
//             </div>
//           )}

//           {streamingReply && (
//             <div key="streaming" className={styles.ai}>
//               {streamingReply}
//             </div>
//           )}
//         </div>

//         <div className={styles.chatArea}>
//           <input
//             className={styles.userInput}
//             type="text"
//             onChange={handleMessageInputChange}
//             value={messageInput}
//             placeholder="Ask something"
//           />

//           <button
//             className={styles.submitInput}
//             onClick={handleSendClick}
//             disabled={isSending}
//           >
//             &#8593;
//           </button>
//         </div>
//       </main>
//     </div>
//   );
// }

// export default function Home() {
//   return (
//     <Suspense fallback={null}>
//       <HomeContent />
//     </Suspense>
//   );
// }
