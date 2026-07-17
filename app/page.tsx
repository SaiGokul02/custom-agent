'use client';
import styles from "./page.module.css";
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";

function HomeContent() {
  const searchParams = useSearchParams();
  const thread_id = searchParams.get('thread_id');
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [threadId, setThreadId] = useState(thread_id || '');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

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
    params.set('thread_id', id);
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
    navigateToThread(random);
    return random;
  };

  async function callAgent(activeThreadId) {
    if (!activeThreadId || !message) return;
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, threadId: activeThreadId }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      setResponse(data);
      fetchConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setMessage("");
    }
  }

  const handleUserQuery = () => {
    const activeThreadId = threadId || handleNewChat();
    callAgent(activeThreadId);
  };

  async function fetchConversations() {
    try {
      const res = await fetch('/api/conversations');

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (!threadId || !user) return;

    const getConversationHistory = async () => {
      setLoading(true);
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
        <button className={styles.newChatBtn} onClick={handleNewChat}>+</button>
        {conversations.map((c) => (
          <div
            key={c.threadId}
            onClick={() => handleSelectConversation(c.threadId)}
            className={(c.threadId === threadId ? styles.activeThread : '') + " " + styles.openChatWindow}
          >
            {c.title}
          </div>
        ))}
      </div>
      <main className={styles.main}>
        <div className={styles.chatResponse}>
          {response.map((res, index) => (
            <div key={index} className={res.role === "human" ? styles.user : styles.ai}>
              {res.content}
            </div>
          ))}
        </div>

        <div className={styles.chatArea}>
          <input
            className={styles.userInput}
            type='text'
            onChange={handleMessage}
            value={message}
            placeholder='Ask something'
          />

          <button className={styles.submitInput} onClick={handleUserQuery} disabled={loading}>
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