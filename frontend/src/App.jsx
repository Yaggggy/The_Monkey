import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { api } from "./api.js";


const emptyCameraForm = {
  name: "",
  stream_url: "",
  location: "",
  is_active: true
};

const emptyUserForm = {
  email: "",
  full_name: "",
  is_active: true
};

const emptyStreamForm = {
  camera_id: "",
  stream_url: "",
  confidence_threshold: 0.8,
  fps: 30
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export default function App() {
  const auth = useAuth();
  const redirectStarted = useRef(false);
  const [theme, setTheme] = useState("dark");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [cameraForm, setCameraForm] = useState(emptyCameraForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [streamForm, setStreamForm] = useState(emptyStreamForm);
  const [imageFile, setImageFile] = useState(null);
  const [detections, setDetections] = useState([]);
  const [busy, setBusy] = useState(false);
  const [liveStream, setLiveStream] = useState({ active: false, frame: null, detections: [] });
  const eventSourceRef = useRef(null);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

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
        api.listEvents({ limit: 50 }),
        api.listUsers({ limit: 50 })
      ]);
      setCameras(cameraData || []);
      setEvents(eventData || []);
      setUsers(userData || []);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const cameraCount = cameras.length;
  const eventCount = events.length;
  const userCount = users.length;

  const cameraOptions = useMemo(() => {
    return cameras.map((camera) => ({
      label: `${camera.name} #${camera.id}`,
      value: camera.id
    }));
  }, [cameras]);

  const handleCameraSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.createCamera({
        name: cameraForm.name,
        stream_url: cameraForm.stream_url || null,
        location: cameraForm.location || null,
        is_active: cameraForm.is_active
      });
      setCameraForm(emptyCameraForm);
      await refresh();
      setStatus({ type: "success", message: "Camera created." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.createUser({
        email: userForm.email,
        full_name: userForm.full_name || null,
        is_active: userForm.is_active
      });
      setUserForm(emptyUserForm);
      await refresh();
      setStatus({ type: "success", message: "User created." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCamera = async (camera) => {
    if (!window.confirm(`Delete camera "${camera.name}"?`)) {
      return;
    }
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.deleteCamera(camera.id);
      await refresh();
      setStatus({ type: "success", message: "Camera deleted." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.email}"?`)) {
      return;
    }
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.deleteUser(user.id);
      await refresh();
      setStatus({ type: "success", message: "User deleted." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleInferImage = async () => {
    if (!imageFile) {
      setStatus({ type: "error", message: "Choose an image first." });
      return;
    }
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      const cameraId = streamForm.camera_id
        ? Number(streamForm.camera_id)
        : undefined;
      const result = await api.inferImage(imageFile, cameraId);
      setDetections(result.detections || []);
      await refresh();
      setStatus({ type: "success", message: "Image inference complete." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleInferStream = async () => {
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      const payload = {
        camera_id: streamForm.camera_id
          ? Number(streamForm.camera_id)
          : null,
        stream_url: streamForm.stream_url || null
      };
      const result = await api.inferStream(payload);
      setDetections(result.detections || []);
      await refresh();
      setStatus({ type: "success", message: "Stream inference complete." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    redirectStarted.current = false;
    auth.signoutRedirect();
  };

  const handleStartLiveStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const payload = {
      camera_id: streamForm.camera_id ? Number(streamForm.camera_id) : null,
      stream_url: streamForm.stream_url || null,
      confidence_threshold: streamForm.confidence_threshold,
      fps: streamForm.fps
    };

    if (!payload.camera_id && !payload.stream_url) {
      setStatus({ type: "error", message: "Provide a camera or stream URL" });
      return;
    }

    const streamUrl = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/events/live-stream`;
    const params = new URLSearchParams();
    if (payload.camera_id) params.set("camera_id", payload.camera_id);
    if (payload.stream_url) params.set("stream_url", payload.stream_url);
    params.set("confidence_threshold", payload.confidence_threshold);
    params.set("fps", payload.fps);

    const fullUrl = `${streamUrl}?${params.toString()}`;
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setStatus({ type: "error", message: data.error });
          eventSource.close();
          setLiveStream({ active: false, frame: null, detections: [] });
          return;
        }
        setLiveStream({ active: true, frame: data.frame, detections: data.detections || [] });
        if (data.detections && data.detections.length > 0) {
          refresh();
        }
      } catch (err) {
        console.error("Stream parse error:", err);
      }
    };

    eventSource.onerror = () => {
      setStatus({ type: "error", message: "Live stream connection failed" });
      eventSource.close();
      setLiveStream({ active: false, frame: null, detections: [] });
    };

    setLiveStream({ active: true, frame: null, detections: [] });
    setStatus({ type: "success", message: "Live stream started" });
  };

  const handleStopLiveStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLiveStream({ active: false, frame: null, detections: [] });
    setStatus({ type: "success", message: "Live stream stopped" });
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (auth.isLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="eyebrow">The Monkey Control</p>
          <h1>Signing you in...</h1>
          <p className="subtitle">Please wait while we verify your session.</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="eyebrow">The Monkey Control</p>
          <h1>Authentication error</h1>
          <p className="subtitle">{auth.error.message}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => auth.signinRedirect()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="eyebrow">The Monkey Control</p>
          <h1>Sign in required</h1>
          <p className="subtitle">
            You need to authenticate before accessing the control room.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => auth.signinRedirect()}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">The Monkey Control</p>
          <h1>Auto Monitoring</h1>
          <p className="subtitle">
            Connect cameras, watch detections, and run inference on demand — all
            from one place.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={refresh} disabled={busy}>
              Refresh data
            </button>
            <button
              className="ghost"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              Toggle {theme === "dark" ? "Light" : "Dark"}
            </button>
            {auth.isLoading ? (
              <button className="ghost" disabled>
                Authenticating...
              </button>
            ) : auth.isAuthenticated ? (
              <button className="ghost" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <button className="ghost" onClick={() => auth.signinRedirect()}>
                Sign in
              </button>
            )}
          </div>
          {auth.error ? (
            <div className="status error">Auth error: {auth.error.message}</div>
          ) : null}
        </div>
        <div className="hero-panel">
          <div className="stat">
            <span>Cameras</span>
            <strong>{cameraCount}</strong>
          </div>
          <div className="stat">
            <span>Events</span>
            <strong>{eventCount}</strong>
          </div>
          <div className="stat">
            <span>Users</span>
            <strong>{userCount}</strong>
          </div>
        </div>
      </header>

      {status.message ? (
        <div className={`status ${status.type}`}>{status.message}</div>
      ) : null}

      <section className="grid">
        <div className="card span-12">
          <h2>Live Detection Feed</h2>
          <p className="muted">
            Stream live video with real-time object detection.
          </p>
          <div className="form-grid">
            <label>
              Choose camera (optional)
              <select
                value={streamForm.camera_id}
                onChange={(event) =>
                  setStreamForm({
                    ...streamForm,
                    camera_id: event.target.value
                  })
                }
              >
                <option value="">None</option>
                {cameraOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stream URL (optional)
              <input
                value={streamForm.stream_url}
                onChange={(event) =>
                  setStreamForm({
                    ...streamForm,
                    stream_url: event.target.value
                  })
                }
                placeholder="http://192.168.29.232:8080/video"
              />
            </label>
            <label>
              Confidence Threshold
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={streamForm.confidence_threshold}
                onChange={(event) =>
                  setStreamForm({
                    ...streamForm,
                    confidence_threshold: Number(event.target.value)
                  })
                }
              />
            </label>
            <label>
              FPS (1-60)
              <input
                type="number"
                min="1"
                max="60"
                value={streamForm.fps}
                onChange={(event) =>
                  setStreamForm({
                    ...streamForm,
                    fps: Number(event.target.value)
                  })
                }
              />
            </label>
          </div>
          <div className="form-actions">
            {liveStream.active ? (
              <button className="ghost danger" onClick={handleStopLiveStream}>
                Stop Live Stream
              </button>
            ) : (
              <button className="primary" onClick={handleStartLiveStream}>
                Start Live Stream
              </button>
            )}
          </div>
          {liveStream.active && (
            <div className="live-feed">
              {liveStream.frame ? (
                <img
                  src={`data:image/jpeg;base64,${liveStream.frame}`}
                  alt="Live feed"
                  className="live-feed-image"
                />
              ) : (
                <div className="live-feed-loading">Connecting to stream...</div>
              )}
              {liveStream.detections.length > 0 && (
                <div className="pill-list">
                  {liveStream.detections.map((det, idx) => (
                    <div className="pill" key={idx}>
                      <span>{det.label}</span>
                      <strong>{(det.confidence * 100).toFixed(1)}%</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid">
        <div className="card span-7">
          <h2>Inference Studio</h2>
          <p className="muted">
            Run detections on an uploaded image or pull a snapshot from a stream
            URL.
          </p>
          <div className="form-grid">
            <label>
              Choose camera (optional)
              <select
                value={streamForm.camera_id}
                onChange={(event) =>
                  setStreamForm({
                    ...streamForm,
                    camera_id: event.target.value
                  })
                }
              >
                <option value="">None</option>
                {cameraOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stream URL (optional)
              <input
                value={streamForm.stream_url}
                onChange={(event) =>
                  setStreamForm({
                    ...streamForm,
                    stream_url: event.target.value
                  })
                }
                placeholder="http://camera.local:8080"
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Image file
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              />
            </label>
            <div className="form-actions">
              <button className="primary" onClick={handleInferImage} disabled={busy}>
                Infer image
              </button>
              <button className="ghost" onClick={handleInferStream} disabled={busy}>
                Infer stream
              </button>
            </div>
          </div>
          <div className="pill-list">
            {detections.length === 0 ? (
              <span className="muted">No detections yet.</span>
            ) : (
              detections.map((detection, index) => (
                <div className="pill" key={`${detection.label}-${index}`}>
                  <span>{detection.label}</span>
                  <strong>{(detection.confidence * 100).toFixed(1)}%</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card span-5">
          <h2>Add camera</h2>
          <form className="form" onSubmit={handleCameraSubmit}>
            <label>
              Camera name
              <input
                value={cameraForm.name}
                onChange={(event) =>
                  setCameraForm({ ...cameraForm, name: event.target.value })
                }
                placeholder="Lobby Cam A"
                required
              />
            </label>
            <label>
              Stream URL
              <input
                value={cameraForm.stream_url}
                onChange={(event) =>
                  setCameraForm({
                    ...cameraForm,
                    stream_url: event.target.value
                  })
                }
                placeholder="http://camera.local:8080"
              />
            </label>
            <label>
              Location
              <input
                value={cameraForm.location}
                onChange={(event) =>
                  setCameraForm({
                    ...cameraForm,
                    location: event.target.value
                  })
                }
                placeholder="Warehouse"
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={cameraForm.is_active}
                onChange={(event) =>
                  setCameraForm({
                    ...cameraForm,
                    is_active: event.target.checked
                  })
                }
              />
              <span>Active</span>
            </label>
            <button className="primary" type="submit" disabled={busy}>
              Save camera
            </button>
          </form>
        </div>
      </section>

      <section className="grid">
        <div className="card span-7">
          <div className="section-header">
            <div>
              <h2>Live events</h2>
              <p className="muted">Latest detections and activity.</p>
            </div>
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Label</span>
              <span>Confidence</span>
              <span>Camera</span>
              <span>Time</span>
            </div>
            {events.length === 0 ? (
              <div className="table-empty">No events yet.</div>
            ) : (
              events.map((eventItem, index) => (
                <div
                  className="table-row"
                  key={eventItem.id}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className="pill-text">{eventItem.label}</span>
                  <span>{(eventItem.confidence * 100).toFixed(1)}%</span>
                  <span>{eventItem.camera_id || "-"}</span>
                  <span>{formatDateTime(eventItem.occurred_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card span-5">
          <h2>Add user</h2>
          <form className="form" onSubmit={handleUserSubmit}>
            <label>
              Email
              <input
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm({ ...userForm, email: event.target.value })
                }
                placeholder="ops@themonkey.ai"
                required
              />
            </label>
            <label>
              Full name
              <input
                value={userForm.full_name}
                onChange={(event) =>
                  setUserForm({ ...userForm, full_name: event.target.value })
                }
                placeholder="Ari Vega"
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={userForm.is_active}
                onChange={(event) =>
                  setUserForm({
                    ...userForm,
                    is_active: event.target.checked
                  })
                }
              />
              <span>Active</span>
            </label>
            <button className="primary" type="submit" disabled={busy}>
              Save user
            </button>
          </form>
        </div>
      </section>

      <section className="grid">
        <div className="card span-12">
          <div className="section-header">
            <div>
              <h2>Cameras</h2>
              <p className="muted">Track every active feed.</p>
            </div>
          </div>
          <div className="table">
            <div className="table-row table-head table-actions">
              <span>Name</span>
              <span>Location</span>
              <span>Stream URL</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {cameras.length === 0 ? (
              <div className="table-empty">No cameras yet.</div>
            ) : (
              cameras.map((camera, index) => (
                <div
                  className="table-row table-actions"
                  key={camera.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className="pill-text">{camera.name}</span>
                  <span>{camera.location || "-"}</span>
                  <span className="truncate">{camera.stream_url || "-"}</span>
                  <span className={camera.is_active ? "good" : "muted"}>
                    {camera.is_active ? "Active" : "Paused"}
                  </span>
                  <span>
                    <button
                      className="ghost danger"
                      onClick={() => handleDeleteCamera(camera)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card span-12">
          <div className="section-header">
            <div>
              <h2>Operators</h2>
              <p className="muted">Team profiles tied to detections.</p>
            </div>
          </div>
          <div className="table">
            <div className="table-row table-head table-actions">
              <span>Email</span>
              <span>Name</span>
              <span>Status</span>
              <span>Created</span>
              <span>Actions</span>
            </div>
            {users.length === 0 ? (
              <div className="table-empty">No users yet.</div>
            ) : (
              users.map((user, index) => (
                <div
                  className="table-row table-actions"
                  key={user.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className="pill-text">{user.email}</span>
                  <span>{user.full_name || "-"}</span>
                  <span className={user.is_active ? "good" : "muted"}>
                    {user.is_active ? "Active" : "Paused"}
                  </span>
                  <span>{formatDateTime(user.created_at)}</span>
                  <span>
                    <button
                      className="ghost danger"
                      onClick={() => handleDeleteUser(user)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
