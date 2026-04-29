import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function Messages() {
  const [searchParams] = useSearchParams();
  const initListingId = searchParams.get("listing");
  const initReceiverId = searchParams.get("receiver");

  const [currentUser, setCurrentUser] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Load current user
  useEffect(() => {
    api.get("/api/auth/me/")
      .then((res) => setCurrentUser(res.data))
      .catch(() => {});
  }, []);

  // Fetch all messages and build conversation list
  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get("/api/messages/");
      const msgs = res.data;
      setAllMessages(msgs);

      // Group messages into conversations by (listing + other user)
      const convMap = {};
      msgs.forEach((msg) => {
        const key = `${msg.listing}-${msg.sender === currentUser?.id ? msg.receiver : msg.sender}`;
        if (!convMap[key]) {
          convMap[key] = {
            key,
            listingId: msg.listing,
            otherId: msg.sender === currentUser?.id ? msg.receiver : msg.sender,
            otherEmail: msg.sender === currentUser?.id ? msg.receiver_email : msg.sender_email,
            messages: [],
            unread: 0,
          };
        }
        convMap[key].messages.push(msg);
        if (!msg.is_read && msg.receiver === currentUser?.id) {
          convMap[key].unread++;
        }
      });

      const convList = Object.values(convMap).sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.created_at || "";
        const bLast = b.messages[b.messages.length - 1]?.created_at || "";
        return bLast.localeCompare(aLast);
      });

      setConversations(convList);

      // Auto-open conversation from URL params
      if (initListingId && initReceiverId && convList.length > 0 && !activeConv) {
        const match = convList.find(
          (c) => String(c.listingId) === initListingId && String(c.otherId) === initReceiverId
        );
        if (match) setActiveConv(match.key);
      }
    } catch {
      setError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, initListingId, initReceiverId, activeConv]);

  useEffect(() => {
    if (!currentUser) return;
    fetchMessages();
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [currentUser]);

  // Auto-scroll only when new message arrives, not on every poll
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const activeConvData = conversations.find((c) => c.key === activeConv);
    const count = activeConvData?.messages?.length || 0;
    if (count > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = count;
  }, [allMessages, conversations, activeConv]);

  // Scroll to bottom immediately when switching conversations
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 30);
  }, [activeConv]);

  // If URL params but no existing conversation — set up new chat
  useEffect(() => {
    if (initListingId && initReceiverId && currentUser && conversations.length === 0 && !loading) {
      const newKey = `${initListingId}-${initReceiverId}`;
      setActiveConv(newKey);
    }
  }, [initListingId, initReceiverId, currentUser, conversations, loading]);

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim()) return;

    const conv = conversations.find((c) => c.key === activeConv);
    const listingId = conv?.listingId || initListingId;
    const receiverId = conv?.otherId || initReceiverId;

    if (!listingId || !receiverId) return;

    setSending(true);
    try {
      await api.post("/api/messages/", {
        listing: parseInt(listingId),
        receiver: parseInt(receiverId),
        content: content.trim(),
      });
      setContent("");
      await fetchMessages();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const activeConvData = conversations.find((c) => c.key === activeConv);
  const activeMessages = activeConvData?.messages || [];

  // If coming from URL params with no existing conv, show empty chat ready to type
  const isNewChat = initListingId && initReceiverId && !activeConvData && activeConv;

  if (loading) return <div className="container"><p>Loading messages...</p></div>;

  return (
    <div className="messaging-layout">
      {/* LEFT: Conversation List */}
      <div className="conversations-panel">
        <div className="conversations-header">
          💬 Messages
        </div>

        <div className="conversations-list">
          {conversations.length === 0 && !isNewChat && (
            <div style={{ padding: "20px", color: "#777", fontSize: "13px" }}>
              No conversations yet. Start one from a listing page.
            </div>
          )}

          {isNewChat && (
            <div
              className={`conversation-item active`}
              onClick={() => setActiveConv(`${initListingId}-${initReceiverId}`)}
            >
              <p className="conversation-name">New Conversation</p>
              <p className="conversation-listing">Listing #{initListingId}</p>
              <p className="conversation-preview">Start the conversation...</p>
            </div>
          )}

          {conversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isActive = conv.key === activeConv;
            return (
              <div
                key={conv.key}
                className={`conversation-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveConv(conv.key)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="conversation-name">
                    {conv.otherEmail || `User #${conv.otherId}`}
                    {conv.unread > 0 && (
                      <span className="conversation-unread">{conv.unread}</span>
                    )}
                  </p>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="conversation-listing">
                  Re: Listing #{conv.listingId}
                </p>
                <p className="conversation-preview">
                  {lastMsg
                    ? `${lastMsg.sender === currentUser?.id ? "You: " : ""}${lastMsg.content}`
                    : "No messages yet"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Chat Panel */}
      <div className="chat-panel">
        {!activeConv ? (
          <div className="no-conversation">
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "40px", margin: 0 }}>💬</p>
              <p style={{ marginTop: "12px", color: "#777" }}>
                Select a conversation or{" "}
                <Link to="/listings" style={{ color: "#003b70", fontWeight: "bold" }}>
                  browse listings
                </Link>{" "}
                to start chatting.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <p className="chat-header-name">
                {activeConvData?.otherEmail || `User #${initReceiverId}`}
              </p>
              <p className="chat-header-listing">
                Re: Listing #{activeConvData?.listingId || initListingId}
                {" · "}
                <Link
                  to={`/listings/${activeConvData?.listingId || initListingId}`}
                  style={{ color: "#003b70", fontSize: "12px" }}
                >
                  View listing
                </Link>
              </p>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {activeMessages.length === 0 && (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: "40px", fontSize: "14px" }}>
                  No messages yet. Say hello! 👋
                </div>
              )}

              {activeMessages.map((msg) => {
                const isMe = msg.sender === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMe ? "#003b70" : "white",
                      color: isMe ? "white" : "#111",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      border: isMe ? "none" : "1px solid #e5e7eb",
                    }}>
                      <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>
                        {msg.content}
                      </p>
                      <p style={{
                        margin: "4px 0 0",
                        fontSize: "11px",
                        opacity: 0.65,
                        textAlign: "right",
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="chat-input-area">
              <input
                className="chat-input"
                type="text"
                value={content}
                placeholder="Type a message..."
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={sending || !content.trim()}
              >
                {sending ? "⏳" : "➤"}
              </button>
            </form>

            {error && <p className="error" style={{ padding: "8px 20px", margin: 0 }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
