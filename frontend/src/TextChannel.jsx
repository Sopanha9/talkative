import { useState, useEffect, useRef } from "react";
import { client, databases, appwriteConfig } from "./appwrite";
import { ID, Query } from "appwrite";

function TextChannel({ channel, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!channel) return;
    fetchMessages();

    if (appwriteConfig.databaseId !== "your_database_id") {
      const unsubscribe = client.subscribe(
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
        (response) => {
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.create",
            )
          ) {
            const newDoc = response.payload;
            if (newDoc.channelId === channel.$id) {
              setMessages((prev) => [...prev, newDoc]);
              scrollToBottom();
            }
          }
        },
      );
      return () => {
        unsubscribe();
      };
    }
  }, [channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (appwriteConfig.databaseId === "your_database_id") {
      setMessages([
        {
          $id: "m1",
          userName: "System",
          text: `Welcome to #${channel.title || channel.name}! Data is mocked until Appwrite is configured.`,
          $createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        [
          Query.equal("channelId", channel.$id),
          Query.orderAsc("$createdAt"),
          Query.limit(100),
        ],
      );
      setMessages(response.documents);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    if (appwriteConfig.databaseId === "your_database_id") {
      setMessages((prev) => [
        ...prev,
        {
          $id: Date.now().toString(),
          userName: user?.name || "User",
          text: trimmed,
          $createdAt: new Date().toISOString(),
        },
      ]);
      setNewMessage("");
      scrollToBottom();
      return;
    }

    try {
      const msgData = {
        channelId: channel.$id,
        userId: user?.$id || "unknown-user",
        userName: user?.name || "User",
        text: trimmed,
      };

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        ID.unique(),
        msgData,
      );

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="text-channel">
      <header className="channel-header">
        <span className="channel-hash">#</span>
        <h2 className="channel-title">
          {channel.title || channel.name || "Unnamed"}
        </h2>
      </header>

      <div className="messages-area">
        {loading && <div className="loading-state">Loading messages...</div>}

        <div className="messages-list">
          {messages.length === 0 && !loading && (
            <div className="empty-messages">No messages yet. Say hello!</div>
          )}
          {messages.map((msg, index) => {
            const showHeader =
              index === 0 || messages[index - 1].userName !== msg.userName;
            const date = new Date(msg.$createdAt);
            const timeString = date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.$id}
                className={`message-item ${showHeader ? "with-header" : ""}`}
              >
                {showHeader && (
                  <div className="message-header">
                    <div className="message-avatar">
                      {msg.userName?.[0]?.toUpperCase()}
                    </div>
                    <div className="message-meta">
                      <span className="message-author">{msg.userName}</span>
                      <span className="message-time">{timeString}</span>
                    </div>
                  </div>
                )}
                <div className="message-content">
                  {msg.text || msg.content || ""}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <div className="message-input-wrapper">
          <input
            type="text"
            className="message-input"
            placeholder={`Message #${channel.title || channel.name || "channel"}`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="message-send-btn"
            disabled={!newMessage.trim()}
            title="Send Message"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
              <path
                fill="currentColor"
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default TextChannel;
