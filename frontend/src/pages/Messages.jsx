import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function Messages() {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listing");
  const receiverId = searchParams.get("receiver");

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api.get("/api/auth/me/")
      .then((res) => setCurrentUser(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [listingId]);

  function fetchMessages() {
    const params = listingId ? { listing: listingId } : {};
    api.get("/api/messages/", { params })
      .then((res) => setMessages(res.data))
      .catch(() => setError("Could not load messages."))
      .finally(() => setLoading(false));
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim() || !listingId || !receiverId) return;

    setSending(true);
    try {
      const res = await api.post("/api/messages/", {
        listing: parseInt(listingId),
        receiver: parseInt(receiverId),
        content,
      });
      setMessages((prev) => [...prev, res.data]);
      setContent("");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="container"><p>Loading messages...</p></div>;

  return (
    <div className="container">
      <h1 className="form-title">Messages</h1>

      {error && <p className="error">{error}</p>}

      {messages.length === 0 ? (
        <div className="empty-state">
          <p>No messages yet.</p>
          {!listingId && <p style={{ fontSize: "13px", marginTop: "8px" }}>Start a conversation from a listing page.</p>}
        </div>
      ) : (
        <div className="messages-list">
          {messages.map((msg) => {
            const isMe = currentUser && msg.sender === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`message-bubble ${isMe ? "message-mine" : "message-theirs"}`}
              >
                <p className="message-content">{msg.content}</p>
                <p className="message-meta">
                  {isMe ? "You" : msg.sender_email} · {new Date(msg.created_at).toLocaleTimeString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {listingId && receiverId && (
        <form onSubmit={handleSend} className="message-form">
          <input
            className="input"
            type="text"
            value={content}
            placeholder="Type a message..."
            onChange={(e) => setContent(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="auth-button" type="submit" disabled={sending || !content.trim()}>
            {sending ? "..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}
