import { useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { api } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import { MenuIcon, ShieldIcon } from "./components/Icons.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LiveStream from "./pages/LiveStream.jsx";
import InferenceStudio from "./pages/InferenceStudio.jsx";
import Cameras from "./pages/Cameras.jsx";
import Events from "./pages/Events.jsx";
import Operators from "./pages/Operators.jsx";

// ── Hash-based router ──────────────────────────────────────────────
function useHashRoute() {
  const [page, setPage] = useState(() => window.location.hash.slice(1) || "dashboard");
  useEffect(() => {
    const handler = () => setPage(window.location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const navigate = (to) => { window.location.hash = to; };
  return { page, navigate };
}

// ── Status toast auto-dismiss ──────────────────────────────────────
function useAutoResetStatus(status, setStatus, delay = 5000) {
  useEffect(() => {
    if (status.message) {
      const t = setTimeout(() => setStatus({ type: "idle", message: "" }), delay);
      return () => clearTimeout(t);
    }
  }, [status, setStatus, delay]);
}

// ── Page title map ─────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: "Dashboard",
  live: "Live Stream",
  inference: "Inference Studio",
  cameras: "Cameras",
  events: "Events",
  operators: "Operators",
};

export default function App() {
  const auth = useAuth();
  const redirectStarted = useRef(false);
  const { page, navigate } = useHashRoute();
  const [theme, setTheme] = useState("dark");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useAutoResetStatus(status, setStatus);


  useEffect(() => { document.body.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !redirectStarted.current) {
      redirectStarted.current = true;
      auth.signinRedirect();
    }
  }, [auth]);

  const refresh = async () => {
    try {
      setBusy(true);
      const [cameraData, eventData, userData] = await Promise.all([
        api.listCameras({ limit: 100 }),
        api.listEvents({ limit: 100 }),
        api.listUsers({ limit: 100 })
      ]);
      setCameras(cameraData || []);
      setEvents(eventData || []);
      setUsers(userData || []);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { refresh(); }, []);


  // ── Auth gates ──────────────────────────────────────────────────
  if (auth.isLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <ShieldIcon size={40} />
          <p className="eyebrow">The Monkey Control</p>
          <h1>Signing you in…</h1>
          <p className="subtitle">Please wait while we verify your session.</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <ShieldIcon size={40} />
          <p className="eyebrow">The Monkey Control</p>
          <h1>Authentication error</h1>
          <p className="subtitle">{auth.error.message}</p>
          <button className="btn btn--primary" onClick={() => auth.signinRedirect()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <ShieldIcon size={40} />
          <p className="eyebrow">The Monkey Control</p>
          <h1>Sign in required</h1>
          <p className="subtitle">Authenticate to access the control room.</p>
          <button className="btn btn--primary" onClick={() => auth.signinRedirect()}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  // ── Page renderer ────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case "live":
        return <LiveStream cameras={cameras} setStatus={setStatus} />;
      case "inference":
        return <InferenceStudio cameras={cameras} setStatus={setStatus} setEvents={setEvents} />;
      case "cameras":
        return <Cameras cameras={cameras} setCameras={setCameras} setStatus={setStatus} busy={busy} setBusy={setBusy} />;
      case "events":
        return <Events events={events} cameras={cameras} />;
      case "operators":
        return <Operators users={users} setUsers={setUsers} setStatus={setStatus} busy={busy} setBusy={setBusy} />;
      default:
        return <Dashboard cameras={cameras} events={events} users={users} navigate={navigate} />;
    }
  };

  return (
    <div className="layout">
      <Sidebar
        page={page}
        navigate={navigate}
        theme={theme}
        toggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        user={auth.user}
        onSignOut={() => { redirectStarted.current = false; auth.signoutRedirect(); }}
        busy={busy}
        onRefresh={refresh}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        {/* Mobile top bar */}
        <div className="topbar">
          <button className="icon-btn topbar-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <MenuIcon size={22} />
          </button>
          <span className="topbar-title">{PAGE_TITLES[page] ?? "Dashboard"}</span>
          <div className="topbar-right">
            <button className="icon-btn" onClick={refresh} disabled={busy} title="Refresh">
              <span style={{ fontSize: 18 }}>↻</span>
            </button>
          </div>
        </div>

        {/* Global status toast */}
        {status.message && (
          <div className={`toast toast--${status.type}`} role="alert">
            {status.message}
            <button className="toast-close" onClick={() => setStatus({ type: "idle", message: "" })}>✕</button>
          </div>
        )}

        {/* Page content with animated transition */}
        <div className="page-wrapper" key={page}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
