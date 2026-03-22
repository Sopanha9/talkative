import { useRef, useState } from "react";
import cat1 from "./randomPf/cat1.png";
import cat2 from "./randomPf/cat2.png";
import cathief from "./randomPf/cathief.png";
import panda from "./randomPf/panda.png";
import { useAuth } from "./AuthContext.jsx";

const defaultAvatars = [cat1, cat2, cathief, panda];

function JoinScreen() {
  const { loginWithGoogle, loginUser, registerUser, loading, error } =
    useAuth();

  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [avatarUrl, setAvatarUrl] = useState(
    () => defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)],
  );
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(100 / img.width, 100 / img.height);
      const x = (100 / scale - img.width) / 2;
      const y = (100 / scale - img.height) / 2;
      ctx.scale(scale, scale);
      ctx.drawImage(img, x, y);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setAvatarUrl(dataUrl);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (authMode === "login") {
      if (!email || !password) return;
      await loginUser(email, password);
    } else if (authMode === "register") {
      const name = displayName.trim();
      if (!email || !password || !name) return;
      await registerUser(email, password, name, avatarUrl);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    await loginWithGoogle();
  };

  return (
    <section className="join-screen auth-screen" aria-label="Join Talkitive">
      <div className="join-card form-container">
        <p className="eyebrow">Talkitive</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${authMode === "login" ? "active" : ""}`}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab ${authMode === "register" ? "active" : ""}`}
            onClick={() => setAuthMode("register")}
          >
            Register
          </button>
        </div>

        <h1>{authMode === "login" ? "Welcome Back" : "Create Account"}</h1>
        <p className="join-hint">
          {authMode === "login"
            ? "Continue with Google or use your credentials."
            : "Sign up with Google or create an account with email."}
        </p>

        <button
          className="join-button main-btn oauth-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? "PROCESSING..." : "CONTINUE WITH GOOGLE"}
        </button>

        <p className="oauth-separator" aria-hidden="true">
          OR
        </p>

        <form className="join-form" onSubmit={handleSubmit}>
          {authMode === "register" && (
            <>
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
            </>
          )}

          {(authMode === "login" || authMode === "register") && (
            <>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                className="name-input input-field"
                type="email"
                autoComplete="email"
                placeholder="ENTER EMAIL"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                className="name-input input-field"
                type="password"
                autoComplete="current-password"
                placeholder="ENTER PASSWORD"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </>
          )}

          {authMode === "register" && (
            <>
              <label htmlFor="display-name" className="sr-only">
                Display name
              </label>
              <input
                id="display-name"
                className="name-input input-field"
                type="text"
                autoComplete="name"
                placeholder="ENTER DISPLAY NAME"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={40}
                required
              />
            </>
          )}

          <button
            className="join-button submit-btn main-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "PROCESSING..."
              : authMode === "register"
                ? "CREATE ACCOUNT"
                : "LOGIN WITH EMAIL"}
          </button>
        </form>

        {error ? <p className="error-message">{error}</p> : null}
      </div>
    </section>
  );
}

export default JoinScreen;
