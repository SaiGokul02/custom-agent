"use client";
import styles from "./page.module.css";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function HomeContent() {
  const searchParams = useSearchParams();
  const thread_id = searchParams.get("thread_id");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [threadId, setThreadId] = useState(thread_id || "");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [chatLatestReply, setChatLatestReply] = useState("");
  // Optimistic copy of the user's own message, shown instantly on send.
  // Cleared the moment `response` is refreshed with real data that includes it.
  const [pendingMessage, setPendingMessage] = useState(null);

  const chatResponseRef = useRef(null);

  // when the user sends a new message, always jump to bottom so they see their own message + the reply starting
  useEffect(() => {
    if (pendingMessage) {
      const el = chatResponseRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [pendingMessage]);

  // while the reply streams in (or history refreshes), only follow it if the user is already
  // near the bottom — so scrolling up to reread earlier messages isn't yanked back down
  useEffect(() => {
    const el = chatResponseRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [response, chatLatestReply]);

  // Gate: redirect unauthenticated users before any data fetch happens
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const handleMessage = (e) => {
    setMessage(e.target.value);
  };

  const navigateToThread = (id) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread_id", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelectConversation = (id) => {
    setThreadId(id);
    navigateToThread(id);
  };

  const handleNewChat = () => {
    const random = crypto.randomUUID();
    setThreadId(random);
    setResponse([]);
    setChatLatestReply("");
    setPendingMessage(null);
    navigateToThread(random);
    return random;
  };

  async function callAgent(activeThreadId) {
    if (!activeThreadId || !message) return;
    setLoading(true);
    setChatLatestReply("");
    setPendingMessage({ role: "human", content: message }); // show immediately, before the request even goes out
    setMessage(""); // clear input right away too, now that the message is safely in pendingMessage

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, threadId: activeThreadId }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setChatLatestReply(accumulated);
      }
      await getConversationHistory(activeThreadId); // refreshes `response`, then clears chatLatestReply + pendingMessage

      await fetchConversations();
      // Refresh once more after the background title generation
      setTimeout(() => {
        fetchConversations();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUserQuery = () => {
    const activeThreadId = threadId || handleNewChat();
    callAgent(activeThreadId);
  };

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      console.log("fetched conversations");

      const data = await res.json();
      console.log("data ", data);
      console.log("conversations ", conversations);
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }

  const getConversationHistory = async (threadId) => {
    try {
      const res = await fetch(`/api/agent?thread_id=${threadId}`);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      // response is always the full, real history — no popping/trimming
      setResponse(data);
      setChatLatestReply(""); // clear scratch buffer now that response has caught up
      setPendingMessage(null); // clear optimistic bubble now that response has caught up
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!threadId || !user) return;

    const getConversationHistory = async () => {
      setLoading(true);
      setChatLatestReply(""); // clear any leftover streaming state from a previous thread
      setPendingMessage(null); // clear any leftover optimistic bubble from a previous thread
      try {
        const res = await fetch(`/api/agent?thread_id=${threadId}`);

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        setResponse(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getConversationHistory();
  }, [threadId, user]);

  // Only fetch the sidebar once we know the user is authenticated
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // While auth is resolving, or once we know we're redirecting, don't render the chat UI
  if (authLoading || !user) {
    return <p>Loading...</p>;
  }

  return (
    <div className={styles.chatbot}>
      <div className={styles.sideBar}>
        <button className={styles.newChatBtn} onClick={handleNewChat}>
          +
        </button>
        {conversations.map((c) => (
          <div
            key={c.threadId}
            onClick={() => handleSelectConversation(c.threadId)}
            className={
              (c.threadId === threadId ? styles.activeThread : "") +
              " " +
              styles.openChatWindow
            }
          >
            {c.title}
          </div>
        ))}
      </div>
      <main className={styles.main}>
        <div className={styles.chatResponse} ref={chatResponseRef}>
          {response.map((res, index) => (
            <div
              key={index}
              className={res.role === "human" ? styles.user : styles.ai}
            >
              {res.content}
            </div>
          ))}
          {pendingMessage && (
            <div key="pending" className={styles.user}>
              {pendingMessage.content}
            </div>
          )}
          {chatLatestReply && (
            <div key="latest" className={styles.ai}>
              {chatLatestReply}
            </div>
          )}
        </div>

        <div className={styles.chatArea}>
          <input
            className={styles.userInput}
            type="text"
            onChange={handleMessage}
            value={message}
            placeholder="Ask something"
          />

          <button
            className={styles.submitInput}
            onClick={handleUserQuery}
            disabled={loading}
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
