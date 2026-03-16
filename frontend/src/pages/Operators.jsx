import { useState } from "react";
import { UsersIcon, TrashIcon, PlusIcon } from "../components/Icons.jsx";
import { formatDateTime } from "../utils.js";
import { api } from "../api.js";

const empty = { email: "", full_name: "", is_active: true };

export default function Operators({ users, setUsers, setStatus, busy, setBusy }) {
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    const data = await api.listUsers({ limit: 100 });
    setUsers(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.createUser({ email: form.email, full_name: form.full_name || null, is_active: form.is_active });
      setForm(empty);
      setShowForm(false);
      await refresh();
      setStatus({ type: "success", message: "Operator account created." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete operator "${user.email}"?`)) return;
    setStatus({ type: "idle", message: "" });
    try {
      setBusy(true);
      await api.deleteUser(user.id);
      await refresh();
      setStatus({ type: "success", message: "Operator removed." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-icon page-header-icon--teal"><UsersIcon size={22} /></div>
        <div>
          <h1>Operators</h1>
          <p className="muted">Team accounts that manage and monitor the system.</p>
        </div>
        <button className="btn btn--primary btn-header" onClick={() => setShowForm((v) => !v)}>
          <PlusIcon size={16} /> {showForm ? "Cancel" : "Add Operator"}
        </button>
      </div>

      {showForm && (
        <div className="card slide-in">
          <h2>Create Operator Account</h2>
          <form className="form form-grid" onSubmit={handleSubmit}>
            <label>
              Email address *
              <input type="email" value={form.email} required placeholder="ops@themonkey.ai"
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Full name
              <input value={form.full_name} placeholder="Ari Vega"
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </label>
            <label className="toggle">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span>Active on creation</span>
            </label>
            <div className="form-actions form-actions--wide">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create Operator"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table">
          <div className="table-row table-head table-cols-ops">
            <span>Email</span><span>Name</span><span>Status</span><span>Created</span><span>Actions</span>
          </div>
          {users.length === 0 ? (
            <div className="table-empty">No operator accounts yet. Add one above.</div>
          ) : (
            users.map((user, i) => (
              <div className="table-row table-cols-ops" key={user.id} style={{ animationDelay: `${i * 50}ms` }}>
                <span className="fw-medium truncate">{user.email}</span>
                <span className="muted-sm">{user.full_name || "—"}</span>
                <span>
                  <span className={`badge ${user.is_active ? "badge--green" : "badge--gray"}`}>
                    {user.is_active ? "Active" : "Paused"}
                  </span>
                </span>
                <span className="muted-sm">{formatDateTime(user.created_at)}</span>
                <span>
                  <button className="btn-icon-danger" onClick={() => handleDelete(user)} disabled={busy} title="Delete">
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
