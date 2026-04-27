import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getListing } from "../api/listingsApi";
import { getMessages, sendMessage } from "../api/messagesApi";
import { getMe } from "../api/usersApi";

export default function Messages() {
  const [params] = useSearchParams();

  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const receiverFromUrl = params.get("receiver");
  const listingFromUrl = params.get("listing");
  const titleFromUrl = params.get("title");
  const sellerFromUrl = params.get("seller");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      const meRes = await getMe();
      const msgRes = await getMessages();

      const currentUser = meRes.data;
      const allMessages = msgRes.data;

      setMe(currentUser);
      setMessages(allMessages);

      const builtThreads = await buildThreads(allMessages, currentUser);

      setThreads(builtThreads);

      if (receiverFromUrl && listingFromUrl) {
        const existingThread = builtThreads.find(
          (t) =>
            String(t.otherUserId) === String(receiverFromUrl) &&
            String(t.listingId) === String(listingFromUrl)
        );

        if (existingThread) {
          setSelected(existingThread);
        } else {
          setSelected({
            id: `${receiverFromUrl}-${listingFromUrl}`,
            otherUserId: Number(receiverFromUrl),
            otherUserName: sellerFromUrl || "Seller",
            listingId: Number(listingFromUrl),
            listingTitle: titleFromUrl || "Selected listing",
            messages: [],
          });
        }
      } else if (builtThreads.length > 0) {
        setSelected(builtThreads[0]);
      }
    } catch {
      setError("Please log in to view messages.");
    }
  }

  async function buildThreads(allMessages, currentUser) {
    const map = {};

    for (const msg of allMessages) {
      const otherUserId =
        msg.sender === currentUser.id ? msg.receiver : msg.sender;

      const otherUserName =
        msg.sender === currentUser.id
          ? msg.receiver_email || "User"
          : msg.sender_email || "User";

      const key = `${otherUserId}-${msg.listing}`;

      if (!map[key]) {
        map[key] = {
          id: key,
          otherUserId,
          otherUserName,
          listingId: msg.listing,
          listingTitle: `Listing #${msg.listing}`,
          messages: [],
        };
      }

      map[key].messages.push(msg);
    }

    const result = Object.values(map);

    await Promise.all(
      result.map(async (thread) => {
        try {
          const res = await getListing(thread.listingId);
          thread.listingTitle = res.data.title;
        } catch {
          thread.listingTitle = `Listing #${thread.listingId}`;
        }
      })
    );

    return result;
  }

  async function handleSend(e) {
    e.preventDefault();

    if (!selected) {
      setError("Select a message first.");
      return;
    }

    if (!text.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    try {
      setError("");

      await sendMessage({
        receiver: selected.otherUserId,
        listing: selected.listingId,
        content: text,
      });

      setText("");
      await loadPage();
    } catch {
      setError("Could not send message.");
    }
  }

  return (
    <main className="chat-page">
      <aside className="chat-sidebar">
        <h2>Messages</h2>

        {threads.map((thread) => (
          <button
            key={thread.id}
            className={
              selected?.id === thread.id
                ? "chat-preview active-chat"
                : "chat-preview"
            }
            onClick={() => setSelected(thread)}
          >
            <strong>{thread.otherUserName}</strong>
            <span>{thread.listingTitle}</span>
          </button>
        ))}
      </aside>

      <section className="chat-window">
        {selected ? (
          <>
            <div className="chat-header">
              <h2>{selected.otherUserName}</h2>
              <p>{selected.listingTitle}</p>
            </div>

            {error && <p className="error chat-error">{error}</p>}

            <div className="chat-body">
              {selected.messages.map((msg) => {
                const mine = me && msg.sender === me.id;

                return (
                  <div
                    key={msg.id}
                    className={mine ? "chat-bubble mine" : "chat-bubble"}
                  >
                    <p>{msg.content}</p>
                    <span>{mine ? "You" : selected.otherUserName}</span>
                  </div>
                );
              })}
            </div>

            <form className="chat-form" onSubmit={handleSend}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
              />

              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <h2>Messages</h2>
            <p>Select a message to start chatting.</p>
          </div>
        )}
      </section>
    </main>
  );
}