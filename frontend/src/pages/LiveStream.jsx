import { useEffect, useMemo, useRef, useState } from "react";
import { VideoIcon } from "../components/Icons.jsx";
import { confidencePct } from "../utils.js";

export default function LiveStream({ cameras, setStatus }) {
  const [form, setForm] = useState({ camera_id: "", stream_url: "", confidence_threshold: 0.8, fps: 30 });
  const [stream, setStream] = useState({ active: false, frame: null, detections: [] });
  const [log, setLog] = useState([]);
  const esRef = useRef(null);

  const cameraOptions = useMemo(() => cameras.map((c) => ({ label: `${c.name} #${c.id}`, value: c.id })), [cameras]);

  const start = () => {
    if (esRef.current) esRef.current.close();
    if (!form.camera_id && !form.stream_url) {
      setStatus({ type: "error", message: "Provide a camera or stream URL." });
      return;
    }
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    const params = new URLSearchParams();
    if (form.camera_id) params.set("camera_id", form.camera_id);
    if (form.stream_url) params.set("stream_url", form.stream_url);
    params.set("confidence_threshold", form.confidence_threshold);
    params.set("fps", form.fps);
    const es = new EventSource(`${base}/events/live-stream?${params}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.error) {
          setStatus({ type: "error", message: data.error });
          es.close();
          setStream({ active: false, frame: null, detections: [] });
          return;
        }
        setStream({ active: true, frame: data.frame, detections: data.detections || [] });
        if (data.detections?.length > 0) {
          setLog((prev) => [
            ...data.detections.map((d) => ({
              ...d,
              ts: new Date().toLocaleTimeString()
            })),
            ...prev
          ].slice(0, 50));
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      setStatus({ type: "error", message: "Stream connection failed." });
      es.close();
      setStream({ active: false, frame: null, detections: [] });
    };

    setStream({ active: true, frame: null, detections: [] });
    setStatus({ type: "success", message: "Live stream started." });
  };

  const stop = () => {
    esRef.current?.close();
    esRef.current = null;
    setStream({ active: false, frame: null, detections: [] });
    setStatus({ type: "success", message: "Live stream stopped." });
  };

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-icon page-header-icon--blue"><VideoIcon size={22} /></div>
        <div>
          <h1>Live Detection Feed</h1>
          <p className="muted">Real-time object detection from a live camera stream.</p>
        </div>
        <div className="page-header-status">
          <span className={`stream-badge ${stream.active ? "stream-badge--live" : ""}`}>
            {stream.active ? "● LIVE" : "○ IDLE"}
          </span>
        </div>
      </div>

      {/* Config card */}
      <div className="card">
        <h2>Stream Configuration</h2>
        <div className="form-grid">
          <label>
            Camera
            <select value={form.camera_id} onChange={(e) => setForm({ ...form, camera_id: e.target.value })}>
              <option value="">— select camera —</option>
              {cameraOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label>
            Stream URL
            <input value={form.stream_url} placeholder="http://192.168.x.x:8080/video"
              onChange={(e) => setForm({ ...form, stream_url: e.target.value })} />
          </label>
          <label>
            Confidence threshold
            <input type="number" min="0" max="1" step="0.05" value={form.confidence_threshold}
              onChange={(e) => setForm({ ...form, confidence_threshold: Number(e.target.value) })} />
          </label>
          <label>
            FPS (1–60)
            <input type="number" min="1" max="60" value={form.fps}
              onChange={(e) => setForm({ ...form, fps: Number(e.target.value) })} />
          </label>
        </div>
        <div className="form-actions">
          {stream.active
            ? <button className="btn btn--danger" onClick={stop}>⏹ Stop Stream</button>
            : <button className="btn btn--primary" onClick={start}>▶ Start Live Stream</button>
          }
        </div>
      </div>

      {/* Feed + sidebar */}
      <div className="live-layout">
        <div className="card live-feed-card">
          {stream.active ? (
            stream.frame
              ? <img src={`data:image/jpeg;base64,${stream.frame}`} alt="Live feed" className="live-feed-image" />
              : <div className="live-placeholder">
                  <div className="pulse-ring" /><p>Connecting to stream…</p>
                </div>
          ) : (
            <div className="live-placeholder idle">
              <VideoIcon size={48} />
              <p>Configure a camera or stream URL above, then click <strong>Start Live Stream</strong>.</p>
            </div>
          )}

          {/* Overlaid detection pills */}
          {stream.active && stream.detections.length > 0 && (
            <div className="live-detection-overlay">
              {stream.detections.map((d, i) => (
                <span key={i} className="detection-pill">
                  {d.label} <strong>{confidencePct(d.confidence)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* event log */}
        <div className="card live-log-card">
          <h2>Detection Log</h2>
          <p className="muted">Events detected during this session.</p>
          {log.length === 0 ? (
            <p className="muted">No detections yet.</p>
          ) : (
            <div className="log-list">
              {log.map((entry, i) => (
                <div className="log-entry" key={i} style={{ animationDelay: `${i * 30}ms` }}>
                  <span className="label-pill">{entry.label}</span>
                  <span className="log-conf">{confidencePct(entry.confidence)}</span>
                  <span className="log-ts muted-sm">{entry.ts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
