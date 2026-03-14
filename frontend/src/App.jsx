import { useMemo, useState } from "react";
import JoinScreen from "./JoinScreen.jsx";
import VoiceRoom from "./VoiceRoom.jsx";

const TOKEN_SERVER_URL = import.meta.env.VITE_TOKEN_SERVER_URL;

function buildTokenEndpoint(baseUrl) {
  if (!baseUrl) {
    return null;
  }

  try {
    return new URL("/token", baseUrl).toString();
  } catch {
    return null;
  }
}

function App() {
  const [roomSession, setRoomSession] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const tokenEndpoint = useMemo(() => buildTokenEndpoint(TOKEN_SERVER_URL), []);

  const handleJoin = async (displayName, avatarUrl) => {
    if (!tokenEndpoint) {
      setJoinError(
        "Missing VITE_TOKEN_SERVER_URL. Add it in frontend/.env first.",
      );
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      const requestUrl = new URL(tokenEndpoint);
      requestUrl.searchParams.set("name", displayName);

      const response = await fetch(requestUrl);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to get a room token.");
      }

      if (!payload.token || !payload.livekitUrl || !payload.room) {
        throw new Error("Token server response is missing required fields.");
      }

      setRoomSession({
        displayName,
        avatarUrl: avatarUrl ?? null,
        token: payload.token,
        roomName: payload.room,
        livekitUrl: payload.livekitUrl,
      });
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "Unable to join room.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = () => {
    setRoomSession(null);
    setJoinError("");
  };

  return (
    <main className={`app-shell ${roomSession ? "is-in-room" : ""}`}>
      {roomSession ? (
        <VoiceRoom
          displayName={roomSession.displayName}
          avatarUrl={roomSession.avatarUrl}
          roomName={roomSession.roomName}
          serverUrl={roomSession.livekitUrl}
          token={roomSession.token}
          onLeave={handleLeave}
        />
      ) : (
        <JoinScreen
          onJoin={handleJoin}
          isJoining={isJoining}
          error={joinError}
        />
      )}
    </main>
  );
}

export default App;
