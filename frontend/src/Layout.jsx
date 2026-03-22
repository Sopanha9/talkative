import { useState, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext.jsx";
import ChannelSidebar from "./ChannelSidebar.jsx";
import TextChannel from "./TextChannel.jsx";
import VoiceRoom from "./VoiceRoom.jsx";
import { isVoiceChannel } from "./channelType.js";

const TOKEN_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL;

function buildTokenEndpoint(baseUrl) {
  if (!baseUrl) return null;
  try {
    return new URL("/token", baseUrl).toString();
  } catch {
    return null;
  }
}

function Layout() {
  const { user, logout } = useAuth();
  const [activeChannel, setActiveChannel] = useState(null);
  const [roomSession, setRoomSession] = useState(null);
  const [joinVoiceError, setJoinVoiceError] = useState("");
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);

  const tokenEndpoint = useMemo(() => buildTokenEndpoint(TOKEN_SERVER_URL), []);

  // Extract display name or generate a fallback
  const displayName = user?.name || user?.email || "User";
  // Use persistent avatar from Appwrite Preferences
  const avatarUrl = user?.prefs?.avatarUrl || null;

  const handleChannelSelect = (channel) => {
    setActiveChannel(channel);
    if (isVoiceChannel(channel)) {
      joinVoiceRoom(channel.title || channel.name);
    } else {
      // Disconnect from voice room if switching to text, or you can allow them to stay connected while viewing text.
      // Let's allow them to stay connected.
      // In a real app we'd have a separate active text channel vs active voice channel.
    }
  };

  const joinVoiceRoom = async (roomName) => {
    if (!tokenEndpoint) {
      setJoinVoiceError("Missing VITE_TOKEN_SERVER_URL.");
      return;
    }

    setIsJoiningVoice(true);
    setJoinVoiceError("");

    try {
      const requestUrl = new URL(tokenEndpoint);
      requestUrl.searchParams.set("name", displayName);
      requestUrl.searchParams.set("room", roomName);

      const response = await fetch(requestUrl);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to get a room token.");
      }

      setRoomSession({
        displayName,
        avatarUrl,
        token: payload.token,
        roomName: payload.room || roomName,
        livekitUrl: payload.livekitUrl,
      });
    } catch (err) {
      setJoinVoiceError(err.message);
    } finally {
      setIsJoiningVoice(false);
    }
  };

  const handleLeaveVoice = useCallback(() => {
    setRoomSession(null);
  }, []);

  return (
    <div className="layout-container">
      <ChannelSidebar
        user={user}
        onLogout={logout}
        activeChannel={activeChannel}
        onSelectChannel={handleChannelSelect}
      />

      <main className="main-content">
        {activeChannel ? (
          isVoiceChannel(activeChannel) ? (
            isJoiningVoice ? (
              <div className="loading-state">Joining voice channel...</div>
            ) : joinVoiceError ? (
              <div className="error-message">Error: {joinVoiceError}</div>
            ) : roomSession ? (
              <VoiceRoom
                displayName={roomSession.displayName}
                avatarUrl={roomSession.avatarUrl}
                roomName={roomSession.roomName}
                serverUrl={roomSession.livekitUrl}
                token={roomSession.token}
                onLeave={handleLeaveVoice}
              />
            ) : (
              <div className="empty-state">No active voice session</div>
            )
          ) : (
            <TextChannel channel={activeChannel} user={user} />
          )
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>Welcome to Talkitive</h2>
            <p>Select a channel from the sidebar to start chatting</p>
          </div>
        )}
      </main>

      {/* If user is in a voice room but viewing a text channel, show a mini overlay or they just stay connected implicitly. For now we just stay connected gracefully since LiveKitRoom handles it in the tree. BUT wait! VoiceRoom is unmounted when activeChannel is text!
            We need to keep VoiceRoom alive. Let's adjust Layout to render it absolutely or hidden, or conditionally inside the layout if connected. */}
      {roomSession && !isVoiceChannel(activeChannel) && (
        <div className="voice-overlay hidden">
          <VoiceRoom
            displayName={roomSession.displayName}
            avatarUrl={roomSession.avatarUrl}
            roomName={roomSession.roomName}
            serverUrl={roomSession.livekitUrl}
            token={roomSession.token}
            onLeave={handleLeaveVoice}
          />
        </div>
      )}
    </div>
  );
}

export default Layout;
