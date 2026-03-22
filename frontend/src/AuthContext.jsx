import { createContext, useContext, useState, useEffect } from "react";
import { account } from "./appwrite";
import { ID } from "appwrite";

const AuthContext = createContext();
const APPWRITE_PROJECT_ID = "69bfacdf00058015ce11";
const APPWRITE_CALLBACK_SCHEME = `appwrite-callback-${APPWRITE_PROJECT_ID}`;

function getAuthStatusFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.searchParams.get("auth") === "oauth-failed") {
      return {
        status: "oauth-failed",
        message:
          url.searchParams.get("error_description") ||
          url.searchParams.get("error") ||
          url.searchParams.get("message") ||
          "Google sign-in failed. Please try again.",
      };
    }

    if (url.searchParams.get("auth") === "oauth-success") {
      return { status: "oauth-success", message: null };
    }

    if (url.protocol.replace(":", "") === APPWRITE_CALLBACK_SCHEME) {
      if (url.hostname.includes("failed")) {
        return { status: "oauth-failed", message: "Google sign-in failed." };
      }
      return { status: "oauth-success", message: null };
    }
  } catch {
    return { status: null, message: null };
  }

  return { status: null, message: null };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const isTauriDesktop = window.location.protocol === "tauri:";
    const { status: initialStatus, message: initialMessage } =
      getAuthStatusFromUrl(window.location.href);

    if (initialStatus === "oauth-failed") {
      setError(initialMessage || "Google sign-in failed. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkSession(initialStatus);

    if (!isTauriDesktop) {
      return;
    }

    let unlisten;

    const setupDeepLinkListener = async () => {
      try {
        const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
        unlisten = await onOpenUrl((urls) => {
          const callbackUrl = urls.find((url) =>
            url.startsWith(`${APPWRITE_CALLBACK_SCHEME}://`),
          );

          if (!callbackUrl) {
            return;
          }

          const { status, message } = getAuthStatusFromUrl(callbackUrl);
          if (status === "oauth-failed") {
            setError(message || "Google sign-in failed. Please try again.");
            setLoading(false);
            return;
          }

          setLoading(true);
          checkSession("oauth-success");
        });
      } catch (err) {
        console.error("Deep-link setup error:", err);
      }
    };

    setupDeepLinkListener();

    return () => {
      if (typeof unlisten === "function") {
        unlisten();
      }
    };
  }, []);

  const checkSession = async (authStatus = null) => {
    try {
      const session = await account.get();
      setUser(session);
      if (authStatus === "oauth-success") {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } catch {
      setUser(null);
      if (authStatus === "oauth-success") {
        setError(
          "Google sign-in returned, but no Appwrite session was found. Check Appwrite platform origin and browser cookie/privacy settings.",
        );
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const isTauriDesktop = window.location.protocol === "tauri:";
      const origin = window.location.origin;
      const successUrl = isTauriDesktop
        ? `${APPWRITE_CALLBACK_SCHEME}://oauth-success?auth=oauth-success`
        : `${origin}/?auth=oauth-success`;
      const failureUrl = isTauriDesktop
        ? `${APPWRITE_CALLBACK_SCHEME}://oauth-failed?auth=oauth-failed`
        : `${origin}/?auth=oauth-failed`;
      await account.createOAuth2Session("google", successUrl, failureUrl);
    } catch (err) {
      console.error("OAuth login error:", err);
      setError(err.message || "Failed to login with Google");
      setLoading(false);
    }
  };

  const registerUser = async (email, password, name, avatarUrl) => {
    try {
      setLoading(true);
      setError(null);
      await account.create(ID.unique(), email, password, name);
      // Automatically log in after register
      await account.createEmailPasswordSession(email, password);
      if (avatarUrl) {
        await account.updatePrefs({ avatarUrl });
      }
      await checkSession();
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      await account.createEmailPasswordSession(email, password);
      await checkSession();
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    registerUser,
    loginUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
