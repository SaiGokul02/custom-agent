'use client';
import styles from "./page.module.css";
import { useState } from 'react';

export default function Home() {
  const [threadId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleMessage = (e) => {
    setMessage(e.target.value);
  }

  async function callAgent() {
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          threadId
        }),
      });

      const data = await res.json();

      console.log(data);

      setResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setMessage("");
    }
  }

  return (
    <main className={styles.main}>
      {/* <h1 className={styles.title}>Gokul's Agent</h1> */}

      <div className={styles.chatResponse}>
        {response.map((res, index) => (
          <div key={index} className={res.role === "human" ? styles.user : styles.ai}>
            {res.content}
          </div>
        ))}
      </div>

      <div className={styles.chatArea}>
        <input className={styles.userInput} type='text' onChange={(e) => handleMessage(e)} value={message} placeholder='Ask something' />

        <button className={styles.submitInput} onClick={callAgent} disabled={loading}>
          &#8593;
        </button>
      </div>
    </main>
  );
}