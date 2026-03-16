import { useMemo } from "react";
import { CameraIcon, BellIcon, UsersIcon, VideoIcon, ScanIcon, ActivityIcon, ChevronRightIcon, ShieldIcon } from "../components/Icons.jsx";
import { formatDateTime, confidencePct } from "../utils.js";

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button className={`stat-card stat-card--${color}`} onClick={onClick}>
      <div className="stat-card-icon"><Icon size={24} /></div>
      <div className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <strong className="stat-card-value">{value}</strong>
      </div>
      <ChevronRightIcon size={16} className="stat-card-arrow" />
    </button>
  );
}

function QuickAction({ icon: Icon, label, description, color, onClick }) {
  return (
    <button className={`quick-action quick-action--${color}`} onClick={onClick}>
      <div className="quick-action-icon"><Icon size={22} /></div>
      <div>
        <div className="quick-action-label">{label}</div>
        <div className="quick-action-desc">{description}</div>
      </div>
    </button>
  );
}

export default function Dashboard({ cameras, events, users, navigate }) {
  const recentEvents = useMemo(() => events.slice(0, 8), [events]);
  const activeCameras = useMemo(() => cameras.filter((c) => c.is_active).length, [cameras]);
  const today = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (!e.occurred_at) return false;
      const d = new Date(e.occurred_at);
      return d.toDateString() === now.toDateString();
    }).length;
  }, [events]);

  const labelCounts = useMemo(() => {
    const counts = {};
    events.forEach((e) => { counts[e.label] = (counts[e.label] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  return (
    <div className="page page--dashboard">
      {/* Hero */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <p className="eyebrow">Security Intelligence</p>
          <h1>The Monkey Control</h1>
          <p className="subtitle">
            Real-time object detection monitoring. Connect cameras, watch detections,
            and run inference on demand.
          </p>
        </div>
        <div className="dashboard-hero-badge">
          <ShieldIcon size={56} />
          <span>Monitoring Active</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-cards">
        <StatCard icon={CameraIcon} label="Total Cameras"  value={cameras.length} color="blue"   onClick={() => navigate("cameras")}  />
        <StatCard icon={CameraIcon} label="Active Cameras" value={activeCameras}   color="green"  onClick={() => navigate("cameras")}  />
        <StatCard icon={BellIcon}   label="Total Events"   value={events.length}   color="purple" onClick={() => navigate("events")}   />
        <StatCard icon={BellIcon}   label="Today's Events" value={today}           color="orange" onClick={() => navigate("events")}   />
        <StatCard icon={UsersIcon}  label="Operators"      value={users.length}    color="teal"   onClick={() => navigate("operators")} />
      </div>

      {/* Main content area */}
      <div className="dashboard-grid">
        {/* Recent events */}
        <div className="card dashboard-card--wide">
          <div className="section-header">
            <div>
              <h2>Recent Detections</h2>
              <p className="muted">Latest activity across all cameras.</p>
            </div>
            <button className="btn-ghost-sm" onClick={() => navigate("events")}>
              View all <ChevronRightIcon />
            </button>
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>Label</span>
              <span>Confidence</span>
              <span>Camera</span>
              <span>Time</span>
            </div>
            {recentEvents.length === 0 ? (
              <div className="table-empty">No detections yet. Start a live stream or run inference.</div>
            ) : (
              recentEvents.map((ev, i) => (
                <div className="table-row" key={ev.id} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="label-pill label-pill--inline">{ev.label}</span>
                  <span className="confidence-bar-wrap">
                    <span className="confidence-bar" style={{ width: `${(ev.confidence * 100).toFixed(0)}%` }} />
                    <span>{confidencePct(ev.confidence)}</span>
                  </span>
                  <span>{ev.camera_id ?? "-"}</span>
                  <span className="muted-sm">{formatDateTime(ev.occurred_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-side">
          {/* Top labels */}
          <div className="card">
            <h2>Top Detection Labels</h2>
            <p className="muted">Most frequently detected objects.</p>
            {labelCounts.length === 0 ? (
              <p className="muted">No data yet.</p>
            ) : (
              <div className="label-chart">
                {labelCounts.map(([label, count]) => {
                  const pct = Math.round((count / events.length) * 100);
                  return (
                    <div className="label-chart-row" key={label}>
                      <span className="label-chart-name">{label}</span>
                      <div className="label-chart-bar-bg">
                        <div className="label-chart-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="label-chart-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Camera status */}
          <div className="card">
            <h2>Camera Status</h2>
            <p className="muted">Active monitoring feeds.</p>
            {cameras.length === 0 ? (
              <p className="muted">No cameras registered.</p>
            ) : (
              <div className="camera-status-list">
                {cameras.slice(0, 5).map((cam) => (
                  <div className="camera-status-row" key={cam.id}>
                    <div className={`status-dot ${cam.is_active ? "status-dot--active" : "status-dot--inactive"}`} />
                    <div className="camera-status-info">
                      <span className="camera-status-name">{cam.name}</span>
                      <span className="camera-status-loc">{cam.location || "No location"}</span>
                    </div>
                    <span className={cam.is_active ? "badge badge--green" : "badge badge--gray"}>
                      {cam.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                ))}
                {cameras.length > 5 && (
                  <button className="btn-ghost-sm" onClick={() => navigate("cameras")}>
                    +{cameras.length - 5} more cameras
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2>Quick Actions</h2>
        <p className="muted">Jump directly to a task.</p>
        <div className="quick-actions">
          <QuickAction icon={VideoIcon}  color="blue"   label="Start Live Stream"   description="Monitor a feed in real-time"    onClick={() => navigate("live")}      />
          <QuickAction icon={ScanIcon}   color="purple" label="Run Inference"        description="Detect objects in an image"    onClick={() => navigate("inference")} />
          <QuickAction icon={CameraIcon} color="green"  label="Add Camera"           description="Register a new camera feed"    onClick={() => navigate("cameras")}  />
          <QuickAction icon={UsersIcon}  color="teal"   label="Manage Operators"     description="Add or remove user accounts"   onClick={() => navigate("operators")} />
        </div>
      </div>
    </div>
  );
}
