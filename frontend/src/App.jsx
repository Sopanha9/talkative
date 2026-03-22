import { useAuth } from "./AuthContext.jsx";
import JoinScreen from "./JoinScreen.jsx";
import Layout from "./Layout.jsx";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell loading-shell">
        <div className="loader"></div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {user ? (
        <Layout />
      ) : (
        <JoinScreen />
      )}
    </main>
  );
}

export default App;
