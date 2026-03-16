import { useMemo, useState } from "react";
import { ScanIcon } from "../components/Icons.jsx";
import { confidencePct } from "../utils.js";
import { api } from "../api.js";

export default function InferenceStudio({ cameras, setStatus, setEvents }) {
  const [form, setForm] = useState({ camera_id: "", stream_url: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detections, setDetections] = useState([]);
  const [busy, setBusy] = useState(false);

  const cameraOptions = useMemo(() => cameras.map((c) => ({ label: `${c.name} #${c.id}`, value: c.id })), [cameras]);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleInferImage = async () => {
    if (!imageFile) { setStatus({ type: "error", message: "Choose an image first." }); return; }
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      const cameraId = form.camera_id ? Number(form.camera_id) : undefined;
      const result = await api.inferImage(imageFile, cameraId);
      setDetections(result.detections || []);
      const updatedEvents = await api.listEvents({ limit: 50 });
      setEvents(updatedEvents || []);
      setStatus({ type: "success", message: `Inference complete — ${result.detections?.length ?? 0} detection(s) found.` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleInferStream = async () => {
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      const result = await api.inferStream({
        camera_id: form.camera_id ? Number(form.camera_id) : null,
        stream_url: form.stream_url || null
      });
      setDetections(result.detections || []);
      const updatedEvents = await api.listEvents({ limit: 50 });
      setEvents(updatedEvents || []);
      setStatus({ type: "success", message: `Stream inference complete — ${result.detections?.length ?? 0} detection(s) found.` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const maxConf = detections.reduce((m, d) => Math.max(m, d.confidence), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-icon page-header-icon--purple"><ScanIcon size={22} /></div>
        <div>
          <h1>Inference Studio</h1>
          <p className="muted">Run object detection on an uploaded image or a live stream snapshot.</p>
        </div>
      </div>

      <div className="inference-layout">
        {/* Left: controls */}
        <div className="card">
          <h2>Source</h2>
          <div className="form">
            <label>
              Camera (optional)
              <select value={form.camera_id} onChange={(e) => setForm({ ...form, camera_id: e.target.value })}>
                <option value="">— select camera —</option>
                {cameraOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              Stream URL (optional)
              <input value={form.stream_url} placeholder="http://camera.local:8080"
                onChange={(e) => setForm({ ...form, stream_url: e.target.value })} />
            </label>

            <div className="divider"><span>or</span></div>

            <label>
              Upload image
              <div className="file-drop">
                <input type="file" accept="image/*" id="infer-file" className="file-input" onChange={handleImagePick} />
                <label htmlFor="infer-file" className="file-drop-label">
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="file-preview-thumb" />
                    : <>
                        <ScanIcon size={32} />
                        <span>Click to choose or drag an image here</span>
                        <span className="muted-sm">JPEG, PNG, WebP supported</span>
                      </>
                  }
                </label>
              </div>
            </label>

            <div className="form-actions">
              <button className="btn btn--primary" onClick={handleInferImage} disabled={busy || !imageFile}>
                {busy ? "Running…" : "Infer Image"}
              </button>
              <button className="btn btn--ghost" onClick={handleInferStream} disabled={busy}>
                {busy ? "Running…" : "Infer Stream"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: results */}
        <div className="card inference-results">
          <h2>Results</h2>
          <p className="muted">{detections.length === 0 ? "Run inference to see detections here." : `${detections.length} object(s) detected.`}</p>

          {detections.length > 0 && (
            <>
              <div className="detection-summary">
                <div className="detection-summary-stat">
                  <span>Detections</span><strong>{detections.length}</strong>
                </div>
                <div className="detection-summary-stat">
                  <span>Best confidence</span><strong>{confidencePct(maxConf)}</strong>
                </div>
              </div>

              <div className="detection-list">
                {detections.map((d, i) => (
                  <div className="detection-item" key={i} style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="detection-item-main">
                      <span className="label-pill">{d.label}</span>
                      <span className="detection-conf">{confidencePct(d.confidence)}</span>
                    </div>
                    <div className="detection-conf-bar-bg">
                      <div className="detection-conf-bar" style={{ width: `${(d.confidence * 100).toFixed(0)}%` }} />
                    </div>
                    <div className="detection-bbox muted-sm">
                      BBox: [{d.bbox?.map((v) => v.toFixed(0)).join(", ")}]
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
