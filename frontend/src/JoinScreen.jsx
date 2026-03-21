import { useRef, useState } from "react";
import cat1 from "./randomPf/cat1.png";
import cat2 from "./randomPf/cat2.png";
import cathief from "./randomPf/cathief.png";
import panda from "./randomPf/panda.png";

const defaultAvatars = [cat1, cat2, cathief, panda];

function JoinScreen({ onJoin, isJoining, error }) {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(() => defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Revoke previous object URL to free memory
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || isJoining) return;
    await onJoin(name, avatarUrl);
  };

  return (
    <section className="join-screen" aria-label="Join voice room">
      <div className="join-card">
        <p className="eyebrow">Talkitive Voice</p>
        <h1>Enter Voice Room</h1>
        <p className="join-hint">
          Pick a callsign and connect to the audio channel.
        </p>

        <form className="join-form" onSubmit={handleSubmit}>
          {/* Avatar picker */}
          <div className="avatar-upload-row">
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile picture"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Your avatar"
                  className="avatar-preview"
                />
              ) : (
                <span className="avatar-placeholder">+</span>
              )}
            </button>
            <div className="avatar-upload-hint">
              <p className="avatar-upload-title">Profile Picture</p>
              <p className="avatar-upload-sub">Optional — tap to upload</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />

          <label htmlFor="display-name" className="sr-only">
            Display name
          </label>
          <input
            id="display-name"
            className="name-input"
            type="text"
            autoComplete="name"
            placeholder="ENTER DISPLAY NAME"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            required
          />
          <button
            className="join-button"
            type="submit"
            disabled={!displayName.trim() || isJoining}
          >
            {isJoining ? "JOINING..." : "JOIN ROOM"}
          </button>
        </form>

        {error ? <p className="error-message">{error}</p> : null}
      </div>
    </section>
  );
}

export default JoinScreen;
