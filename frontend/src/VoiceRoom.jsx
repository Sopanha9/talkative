import { useEffect, useRef, useState } from "react";
import babyLaughSound from "./sounds/baby-laughing-meme.mp3";
import bruhSound from "./sounds/bruh-original-vine-version.mp3";
import dryFartSound from "./sounds/dry-fart.mp3";
import fahhSound from "./sounds/fahhhhhhhhhhhhhh.mp3";
import gopGopGopSound from "./sounds/gopgopgop.mp3";
import ohHellNahSound from "./sounds/oh-my-god-bro-oh-hell-nah-man.mp3";
import {
  LiveKitRoom,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";

const DEFAULT_PARTICIPANT_GAIN = 1.5;
const MIN_PARTICIPANT_GAIN = 0.5;
const MAX_PARTICIPANT_GAIN = 3;

const MIC_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
};

function clampGain(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return DEFAULT_PARTICIPANT_GAIN;
  }

  return Math.min(
    MAX_PARTICIPANT_GAIN,
    Math.max(MIN_PARTICIPANT_GAIN, numericValue),
  );
}

function getRemoteAudioTrack(participant) {
  for (const publication of participant.audioTrackPublications.values()) {
    if (publication.track && publication.isSubscribed) {
      return publication.track;
    }
  }

  return null;
}

function getOrCreateAudioContext(audioContextRef) {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContextRef.current) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    audioContextRef.current = new AudioContextClass();
  }

  if (audioContextRef.current.state === "suspended") {
    audioContextRef.current.resume().catch(() => {});
  }

  return audioContextRef.current;
}

function disconnectParticipantAudio(audioNodesRef, identity) {
  const audioNodes = audioNodesRef.current.get(identity);
  if (!audioNodes) {
    return;
  }

  try {
    audioNodes.source.disconnect();
  } catch {
    // ignore disconnect errors for stale nodes
  }

  try {
    audioNodes.gainNode.disconnect();
  } catch {
    // ignore disconnect errors for stale nodes
  }

  audioNodesRef.current.delete(identity);
}

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
const SOUND_COOLDOWN_MS = 60_000; // 1 minute per button

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

function getScreenShareTrack(participant) {
  for (const publication of participant.videoTrackPublications.values()) {
    if (
      publication.source === Track.Source.ScreenShare &&
      publication.track &&
      publication.isSubscribed !== false
    ) {
      return publication.track;
    }
  }
  return null;
}

function ScreenShareView({ participant, track, isLocal, onStopSharing }) {
  const videoRef = useRef(null);
  const name = participant.name || participant.identity;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !track?.mediaStreamTrack) return;

    const stream = new MediaStream([track.mediaStreamTrack]);
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});

    return () => {
      videoEl.srcObject = null;
    };
  }, [track]);

  return (
    <div className="screen-share-panel">
      <div className="screen-share-header">
        <span className="screen-share-label">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="screen-share-icon"
          >
            <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7v2H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 13H4V5h16v11Z" />
          </svg>
          {name} is sharing their screen
        </span>
        {isLocal ? (
          <button
            className="control-btn screen-share-stop-btn"
            onClick={onStopSharing}
          >
            STOP SHARING
          </button>
        ) : null}
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="screen-share-video"
        autoPlay
        playsInline
        muted
      />
    </div>
  );
}

function ParticipantCard({
  participant,
  avatarUrl,
  showVolumeControl,
  volume,
  onVolumeChange,
  isScreenSharing,
}) {
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
        {isScreenSharing ? (
          <span
            className="screen-share-badge"
            aria-label={`${name} is sharing screen`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7v2H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 13H4V5h16v11Z" />
            </svg>
          </span>
        ) : null}
      </div>
      <p className="participant-name">{name}</p>
      <p className="participant-status">{status}</p>
      {showVolumeControl ? (
        <label className="participant-volume-control">
          <span className="participant-volume-label">Volume</span>
          <input
            className="participant-volume-slider"
            type="range"
            min={MIN_PARTICIPANT_GAIN}
            max={MAX_PARTICIPANT_GAIN}
            step="0.1"
            value={volume}
            onChange={(event) => onVolumeChange(event.target.value)}
          />
        </label>
      ) : null}
    </article>
  );
}

function RoomLayout({ roomName, displayName, avatarUrl, onLeave }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [participantGains, setParticipantGains] = useState({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isTogglingScreenShare, setIsTogglingScreenShare] = useState(false);
  const sessionTime = useSessionTimer();
  const audioContextRef = useRef(null);
  const audioNodesRef = useRef(new Map());
  const gainValuesRef = useRef(new Map());

  // Derive active screen share from any participant
  const activeScreenShare = (() => {
    for (const participant of participants) {
      const track = getScreenShareTrack(participant);
      if (track) {
        return { participant, track };
      }
    }
    return null;
  })();

  // Keep isScreenSharing in sync with local participant's actual track state
  useEffect(() => {
    const localScreenShareTrack = localParticipant
      ? getScreenShareTrack(localParticipant)
      : null;
    setIsScreenSharing(!!localScreenShareTrack);
  }, [participants, localParticipant]);

  useEffect(() => {
    const remoteParticipants = participants.filter(
      (participant) => !participant.isLocal,
    );
    const activeIdentities = new Set(
      remoteParticipants.map((participant) => participant.identity),
    );
    let hasChanges = false;

    for (const participant of remoteParticipants) {
      if (!gainValuesRef.current.has(participant.identity)) {
        gainValuesRef.current.set(
          participant.identity,
          DEFAULT_PARTICIPANT_GAIN,
        );
        hasChanges = true;
      }
    }

    for (const identity of Array.from(gainValuesRef.current.keys())) {
      if (!activeIdentities.has(identity)) {
        gainValuesRef.current.delete(identity);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setParticipantGains(Object.fromEntries(gainValuesRef.current));
    }
  }, [participants]);

  useEffect(() => {
    const audioContext = getOrCreateAudioContext(audioContextRef);
    const activeIdentities = new Set();

    for (const participant of participants) {
      if (participant.isLocal) {
        continue;
      }

      const identity = participant.identity;
      activeIdentities.add(identity);
      const remoteTrack = getRemoteAudioTrack(participant);
      const mediaStreamTrack = remoteTrack?.mediaStreamTrack;
      if (!audioContext || !mediaStreamTrack) {
        disconnectParticipantAudio(audioNodesRef, identity);
        continue;
      }

      const trackKey = remoteTrack.sid || mediaStreamTrack.id;
      const existingNodes = audioNodesRef.current.get(identity);
      if (!existingNodes || existingNodes.trackKey !== trackKey) {
        disconnectParticipantAudio(audioNodesRef, identity);

        const stream = new MediaStream([mediaStreamTrack]);
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = clampGain(
          gainValuesRef.current.get(identity) ?? DEFAULT_PARTICIPANT_GAIN,
        );
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioNodesRef.current.set(identity, {
          source,
          gainNode,
          trackKey,
        });
      }
    }

    for (const identity of Array.from(audioNodesRef.current.keys())) {
      if (!activeIdentities.has(identity)) {
        disconnectParticipantAudio(audioNodesRef, identity);
      }
    }
  }, [participants]);

  useEffect(() => {
    for (const [identity, nodes] of audioNodesRef.current.entries()) {
      const gainValue = clampGain(
        gainValuesRef.current.get(identity) ?? DEFAULT_PARTICIPANT_GAIN,
      );
      nodes.gainNode.gain.value = gainValue;
    }
  }, [participantGains]);

  useEffect(
    () => () => {
      for (const identity of Array.from(audioNodesRef.current.keys())) {
        disconnectParticipantAudio(audioNodesRef, identity);
      }
      audioContextRef.current?.close().catch(() => {});
    },
    [],
  );

  const handleParticipantGainChange = (identity, rawValue) => {
    const gainValue = clampGain(rawValue);
    gainValuesRef.current.set(identity, gainValue);
    setParticipantGains((previous) => ({
      ...previous,
      [identity]: gainValue,
    }));

    const participantAudioNodes = audioNodesRef.current.get(identity);
    if (participantAudioNodes) {
      participantAudioNodes.gainNode.gain.value = gainValue;
    }

    const audioContext = getOrCreateAudioContext(audioContextRef);
    audioContext?.resume().catch(() => {});
  };

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

  const toggleScreenShare = async () => {
    if (!localParticipant || isTogglingScreenShare) {
      return;
    }

    setIsTogglingScreenShare(true);
    try {
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
    } catch {
      // User cancelled the OS screen picker or permission denied — ignore
    } finally {
      setIsTogglingScreenShare(false);
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

      {activeScreenShare ? (
        <ScreenShareView
          participant={activeScreenShare.participant}
          track={activeScreenShare.track}
          isLocal={activeScreenShare.participant.isLocal}
          onStopSharing={toggleScreenShare}
        />
      ) : null}

      <div className="participants-grid">
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.identity}
            participant={participant}
            avatarUrl={participant.isLocal ? avatarUrl : null}
            showVolumeControl={!participant.isLocal}
            volume={
              participantGains[participant.identity] ?? DEFAULT_PARTICIPANT_GAIN
            }
            onVolumeChange={(value) =>
              handleParticipantGainChange(participant.identity, value)
            }
            isScreenSharing={!!getScreenShareTrack(participant)}
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
          className={`control-btn ${isScreenSharing ? "is-sharing" : ""}`}
          onClick={toggleScreenShare}
          disabled={isTogglingScreenShare}
          title={
            isScreenSharing ? "Stop sharing your screen" : "Share your screen"
          }
        >
          {isScreenSharing ? "STOP SHARING" : "SHARE SCREEN"}
        </button>
        <button
          className="control-btn leave-btn"
          onClick={leaveRoom}
          disabled={isLeaving}
        >
          LEAVE
        </button>
      </footer>
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
      audio={MIC_AUDIO_CONSTRAINTS}
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
