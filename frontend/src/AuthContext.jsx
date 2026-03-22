import { createContext, useContext, useState, useEffect } from "react";
import { account } from "./appwrite";
import { ID } from "appwrite";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    const oauthError =
      params.get("error_description") ||
      params.get("error") ||
      params.get("message");

    if (authStatus === "oauth-failed") {
      setError(oauthError || "Google sign-in failed. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkSession(authStatus);
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
      const origin = window.location.origin;
      const successUrl = `${origin}/?auth=oauth-success`;
      const failureUrl = `${origin}/?auth=oauth-failed`;
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
