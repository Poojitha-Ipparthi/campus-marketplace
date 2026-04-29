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
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    api.get("/api/auth/me/")
      .then((res) => setCurrentUser(res.data))
      .catch(() => { });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get("/api/messages/");
      const msgs = res.data;
      setAllMessages(msgs);

      const convMap = {};
      msgs.forEach((msg) => {
        const otherId = msg.sender === currentUser?.id ? msg.receiver : msg.sender;
        const key = `${msg.listing}-${otherId}`;
        if (!convMap[key]) {
          convMap[key] = {
            key,
            listingId: msg.listing,
            otherId,
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
    } catch {
      if (loading) setError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    fetchMessages();
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [currentUser, fetchMessages]);

  // Auto-open from URL params
  useEffect(() => {
    if (!initListingId || !initReceiverId || !currentUser) return;
    const key = `${initListingId}-${initReceiverId}`;
    setActiveConv(key);
  }, [initListingId, initReceiverId, currentUser]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (!activeConv || !currentUser) return;
    const conv = conversations.find((c) => c.key === activeConv);
    if (!conv) return;

    const unreadMsgs = conv.messages.filter(
      (m) => !m.is_read && m.receiver === currentUser.id
    );

    if (unreadMsgs.length > 0) {
      Promise.all(unreadMsgs.map((msg) =>
        api.patch(`/api/messages/${msg.id}/read/`).catch(() => { })
      )).then(() => {
        fetchMessages();
      });
    }
  }, [activeConv, conversations, currentUser]);

  // Auto-scroll only on new messages
  useEffect(() => {
    const conv = conversations.find((c) => c.key === activeConv);
    const count = conv?.messages?.length || 0;
    if (count > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = count;
  }, [allMessages, conversations, activeConv]);

  // Scroll to bottom when switching conversations
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 30);
  }, [activeConv]);

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
  const isNewChat = initListingId && initReceiverId && !activeConvData && activeConv;

  if (loading) return <div className="container"><p>Loading messages...</p></div>;

  return (
    <div className="messaging-layout">
      {/* LEFT: Conversation List */}
      <div className="conversations-panel">
        <div className="conversations-header">💬 Messages</div>

        <div className="conversations-list">
          {conversations.length === 0 && !isNewChat && (
            <div style={{ padding: "20px", color: "#777", fontSize: "13px" }}>
              No conversations yet. Start one from a listing page.
            </div>
          )}

          {isNewChat && (
            <div
              className="conversation-item active"
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
                    {conv.unread > 0 && !isActive && (
                      <span className="conversation-unread">{conv.unread}</span>
                    )}
                  </p>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="conversation-listing">Re: Listing #{conv.listingId}</p>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
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
                {/* Report link */}
                {activeConvData?.otherId && (
                  <Link
                    to={`/report?user=${activeConvData.otherId}&listing=${activeConvData.listingId}`}
                    style={{
                      fontSize: "12px", color: "#9ca3af",
                      textDecoration: "underline", flexShrink: 0,
                    }}
                  >
                    Report User
                  </Link>
                )}
                {activeConvData?.otherId && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("Block this user? They won't be able to message you or order your listings.")) return;
                      try {
                        await api.post("/api/reporting/blocks/", { blocked: activeConvData.otherId });
                        alert("User blocked successfully.");
                      } catch (err) {
                        alert(err.response?.data?.detail || "Could not block user.");
                      }
                    }}
                    style={{
                      background: "none", border: "none", color: "#ef4444",
                      fontSize: "12px", cursor: "pointer",
                      textDecoration: "underline", marginLeft: "12px",
                    }}
                  >
                    Block User
                  </button>
                )}
              </div>
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
                  <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%", padding: "10px 14px",
                      borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMe ? "#003b70" : "white",
                      color: isMe ? "white" : "#111",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      border: isMe ? "none" : "1px solid #e5e7eb",
                    }}>
                      <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>{msg.content}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", opacity: 0.65, textAlign: "right" }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {isMe && (
                          <span style={{ marginLeft: "4px" }}>
                            {/* Show read receipt for sent messages */}
                          </span>
                        )}
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
              <button type="submit" className="chat-send-btn"
                disabled={sending || !content.trim()}>
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
