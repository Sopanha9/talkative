import { useEffect, useRef, useState } from "react";
import babyLaughSound from "./sounds/baby-laughing-meme.mp3";
import bruhSound from "./sounds/bruh-original-vine-version.mp3";
import dryFartSound from "./sounds/dry-fart.mp3";
import fahhSound from "./sounds/fahhhhhhhhhhhhhh.mp3";
import gopGopGopSound from "./sounds/gopgopgop.mp3";
import ohHellNahSound from "./sounds/oh-my-god-bro-oh-hell-nah-man.mp3";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";

function getInitials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const formatted =
    h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return formatted;
}

const SOUNDS = [
  { key: "baby-laugh", emoji: "😂", label: "Baby Laugh", file: babyLaughSound },
  { key: "bruh", emoji: "😒", label: "Bruh", file: bruhSound },
  { key: "dry-fart", emoji: "💨", label: "Dry Fart", file: dryFartSound },
  { key: "fahh", emoji: "😱", label: "Fahh", file: fahhSound },
  {
    key: "gop-gop-gop",
    emoji: "🔁",
    label: "Gop Gop Gop",
    file: gopGopGopSound,
  },
  {
    key: "oh-hell-nah",
    emoji: "😤",
    label: "Oh Hell Nah",
    file: ohHellNahSound,
  },
];

const SOUND_MAP = Object.fromEntries(SOUNDS.map((s) => [s.key, s.file]));
const SOUND_COOLDOWN_MS = 3000;

function Soundboard({ displayName }) {
  // triggered: object keyed by sound key, true while flashing
  const [triggered, setTriggered] = useState({});
  // cooldowns: a Set of sound keys currently on cooldown
  const cooldownRef = useRef(new Set());

  // Keep a stable ref so the data-channel callback always calls the latest flash
  const flashRef = useRef(null);
  flashRef.current = (key) => {
    setTriggered((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setTriggered((prev) => ({ ...prev, [key]: false })), 500);
  };

  const { send } = useDataChannel("soundboard", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      const file = SOUND_MAP[data.sound];
      if (file) {
        new Audio(file).play().catch(() => {});
        flashRef.current?.(data.sound);
      }
    } catch {
      // ignore malformed packets
    }
  });

  const handlePlay = async (sound) => {
    if (cooldownRef.current.has(sound.key)) return;
    cooldownRef.current.add(sound.key);
    setTimeout(() => cooldownRef.current.delete(sound.key), SOUND_COOLDOWN_MS);

    const payload = new TextEncoder().encode(
      JSON.stringify({ sound: sound.key, by: displayName }),
    );
    try {
      await send(payload, { reliable: true });
    } catch {
      // ignore send errors
    }
    // Play locally — data channel does not echo back to sender
    new Audio(sound.file).play().catch(() => {});
    flashRef.current?.(sound.key);
  };

  return (
    <div className="soundboard">
      <p className="soundboard-label">Soundboard</p>
      <div className="soundboard-grid">
        {SOUNDS.map((sound) => (
          <button
            key={sound.key}
            className={`sound-btn${triggered[sound.key] ? " is-triggered" : ""}`}
            onClick={() => handlePlay(sound)}
            title={sound.label}
          >
            <span className="sound-emoji">{sound.emoji}</span>
            <span className="sound-label">{sound.label.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ParticipantCard({ participant, avatarUrl }) {
  const name = participant.name || participant.identity;
  const isMuted = !participant.isMicrophoneEnabled;
  const status = isMuted
    ? "Muted"
    : participant.isSpeaking
      ? "Speaking"
      : "Listening";

  return (
    <article
      className={`participant-card ${participant.isSpeaking ? "is-speaking" : ""} ${isMuted ? "is-muted" : ""}`}
    >
      <div className="participant-avatar-wrap">
        <div className="participant-avatar" aria-hidden="true">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="participant-avatar-img"
            />
          ) : (
            <span className="participant-initials">{getInitials(name)}</span>
          )}
        </div>
        {isMuted ? (
          <span className="mic-badge" aria-label={`${name} is muted`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5a3 3 0 1 1 6 0v6a3 3 0 1 1-6 0V5Zm10 6a1 1 0 1 0-2 0 5 5 0 0 1-8.47 3.58l7.89 7.89a1 1 0 1 0 1.41-1.41L3.71 6.94a1 1 0 0 0-1.42 1.41l4.08 4.08A6.96 6.96 0 0 0 11 17.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A7 7 0 0 0 19 11Z" />
            </svg>
          </span>
        ) : null}
      </div>
      <p className="participant-name">{name}</p>
      <p className="participant-status">{status}</p>
    </article>
  );
}

function RoomLayout({ roomName, displayName, avatarUrl, onLeave }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const sessionTime = useSessionTimer();

  const toggleMute = async () => {
    if (!localParticipant || isTogglingMic) {
      return;
    }

    setIsTogglingMic(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } finally {
      setIsTogglingMic(false);
    }
  };

  const leaveRoom = async () => {
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    try {
      await room.disconnect();
    } finally {
      onLeave();
      setIsLeaving(false);
    }
  };

  return (
    <section className="voice-room" aria-label="Voice room">
      <header className="room-header">
        <div>
          <p className="eyebrow">Live Audio Room</p>
          <h2>{roomName}</h2>
          <p className="room-meta">{participants.length} online</p>
          <p className="room-meta session-timer">⏱ {sessionTime}</p>
        </div>
        <p className="you-tag">CALLSIGN: {displayName}</p>
      </header>

      <div className="participants-grid">
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.identity}
            participant={participant}
            avatarUrl={participant.isLocal ? avatarUrl : null}
          />
        ))}
      </div>

      <Soundboard displayName={displayName} />

      <footer className="control-bar" aria-label="Room controls">
        <span className="session-timer-bar">{sessionTime}</span>
        <button
          className={`control-btn ${isMicrophoneEnabled ? "" : "is-muted-toggle"}`}
          onClick={toggleMute}
          disabled={isTogglingMic}
        >
          {isMicrophoneEnabled ? "MUTE MIC" : "UNMUTE MIC"}
        </button>
        <button
          className="control-btn leave-btn"
          onClick={leaveRoom}
          disabled={isLeaving}
        >
          LEAVE
        </button>
      </footer>

      <RoomAudioRenderer />
    </section>
  );
}

function VoiceRoom({
  token,
  serverUrl,
  roomName,
  displayName,
  avatarUrl,
  onLeave,
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onLeave}
      className="livekit-shell"
    >
      <RoomLayout
        roomName={roomName}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  );
}

export default VoiceRoom;
