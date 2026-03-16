import { useState } from "react";
import { CameraIcon, TrashIcon, PlusIcon } from "../components/Icons.jsx";
import { formatDateTime } from "../utils.js";
import { api } from "../api.js";

const empty = { name: "", stream_url: "", location: "", is_active: true };

export default function Cameras({ cameras, setCameras, setStatus, busy, setBusy }) {
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    const data = await api.listCameras({ limit: 100 });
    setCameras(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.createCamera({ name: form.name, stream_url: form.stream_url || null, location: form.location || null, is_active: form.is_active });
      setForm(empty);
      setShowForm(false);
      await refresh();
      setStatus({ type: "success", message: "Camera added successfully." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (cam) => {
    if (!window.confirm(`Delete camera "${cam.name}"?`)) return;
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.deleteCamera(cam.id);
      await refresh();
      setStatus({ type: "success", message: "Camera deleted." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-icon page-header-icon--green"><CameraIcon size={22} /></div>
        <div>
          <h1>Cameras</h1>
          <p className="muted">Manage camera feeds registered with the system.</p>
        </div>
        <button className="btn btn--primary btn-header" onClick={() => setShowForm((v) => !v)}>
          <PlusIcon size={16} /> {showForm ? "Cancel" : "Add Camera"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card slide-in">
          <h2>Register New Camera</h2>
          <form className="form form-grid" onSubmit={handleSubmit}>
            <label>
              Camera name *
              <input value={form.name} required placeholder="Lobby Cam A"
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Stream URL
              <input value={form.stream_url} placeholder="http://camera.local:8080"
                onChange={(e) => setForm({ ...form, stream_url: e.target.value })} />
            </label>
            <label>
              Location
              <input value={form.location} placeholder="Warehouse Gate"
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
            <label className="toggle">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span>Active on registration</span>
            </label>
            <div className="form-actions form-actions--wide">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save Camera"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table">
          <div className="table-row table-head table-cols-cameras">
            <span>Name</span><span>Location</span><span>Stream URL</span><span>Status</span><span>Actions</span>
          </div>
          {cameras.length === 0 ? (
            <div className="table-empty">No cameras registered yet. Add one above.</div>
          ) : (
            cameras.map((cam, i) => (
              <div className="table-row table-cols-cameras" key={cam.id} style={{ animationDelay: `${i * 50}ms` }}>
                <span className="fw-medium">{cam.name}</span>
                <span className="muted-sm">{cam.location || "—"}</span>
                <span className="truncate muted-sm">{cam.stream_url || "—"}</span>
                <span>
                  <span className={`badge ${cam.is_active ? "badge--green" : "badge--gray"}`}>
                    {cam.is_active ? "Active" : "Paused"}
                  </span>
                </span>
                <span>
                  <button className="btn-icon-danger" onClick={() => handleDelete(cam)} disabled={busy} title="Delete">
                    <TrashIcon size={15} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
