import { useState, useEffect } from "react";
import { databases, appwriteConfig } from "./appwrite";
import { Query } from "appwrite";
import { isTextChannel, isVoiceChannel } from "./channelType.js";

function ChannelSidebar({ user, onLogout, activeChannel, onSelectChannel }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.channelsCollectionId ||
      appwriteConfig.databaseId === "your_database_id"
    ) {
      setChannels([
        { $id: "1", name: "general", type: "text" },
        { $id: "2", name: "random", type: "text" },
        { $id: "3", name: "Lounge", type: "voice" },
        { $id: "4", name: "Gaming", type: "voice" },
      ]);
      return;
    }

    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.channelsCollectionId,
        [Query.limit(100)],
      );
      setChannels(response.documents);
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const textChannels = channels.filter((channel) => isTextChannel(channel));
  const voiceChannels = channels.filter((channel) => isVoiceChannel(channel));

  return (
    <aside className="channel-sidebar">
      <div className="sidebar-header">
        <h2>Talkitive</h2>
      </div>

      <div className="sidebar-scrollable">
        <div className="channel-section">
          <h3 className="section-title">CHANNELS</h3>
          {loading && <p className="loading-text">Loading...</p>}
          <ul className="channel-list">
            {textChannels.map((channel) => (
              <li key={channel.$id}>
                <button
                  className={`channel-btn ${activeChannel?.$id === channel.$id ? "active" : ""}`}
                  onClick={() => onSelectChannel(channel)}
                >
                  <span className="channel-icon">#</span>
                  <span className="channel-name">
                    {channel.title || channel.name || "Unnamed Channel"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {voiceChannels.length > 0 && (
          <div className="channel-section">
            <h3 className="section-title">VOICE CHANNELS</h3>
            <ul className="channel-list">
              {voiceChannels.map((channel) => (
                <li key={channel.$id}>
                  <button
                    className={`channel-btn ${activeChannel?.$id === channel.$id ? "active" : ""}`}
                    onClick={() => onSelectChannel(channel)}
                  >
                    <span className="channel-icon">🔊</span>
                    <span className="channel-name">
                      {channel.title || channel.name || "Unnamed Channel"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar" style={{ overflow: "hidden" }}>
            {user?.prefs?.avatarUrl ? (
              <img
                src={user.prefs.avatarUrl}
                alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              user?.name?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-status">Online</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Log Out">
          🚪
        </button>
      </div>
    </aside>
  );
}

export default ChannelSidebar;
