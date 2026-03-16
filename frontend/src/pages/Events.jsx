import { useMemo, useState } from "react";
import { BellIcon } from "../components/Icons.jsx";
import { formatDateTime, confidencePct } from "../utils.js";

export default function Events({ events, cameras }) {
  const [search, setSearch] = useState("");
  const [filterCam, setFilterCam] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const cameraMap = useMemo(() => {
    const m = {};
    cameras.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [cameras]);

  const cameraOptions = useMemo(() => {
    const ids = [...new Set(events.map((e) => e.camera_id).filter(Boolean))];
    return ids.map((id) => ({ value: id, label: cameraMap[id] || `Camera ${id}` }));
  }, [events, cameraMap]);

  const filtered = useMemo(() => {
    let list = [...events];
    if (search) list = list.filter((e) => e.label.toLowerCase().includes(search.toLowerCase()));
    if (filterCam) list = list.filter((e) => String(e.camera_id) === filterCam);
    list.sort((a, b) => {
      const da = new Date(a.occurred_at || 0).getTime();
      const db = new Date(b.occurred_at || 0).getTime();
      return sortDir === "desc" ? db - da : da - db;
    });
    return list;
  }, [events, search, filterCam, sortDir]);

  const highConf = filtered.filter((e) => e.confidence >= 0.9).length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-icon page-header-icon--orange"><BellIcon size={22} /></div>
        <div>
          <h1>Detection Events</h1>
          <p className="muted">Full log of all detection events captured by the system.</p>
        </div>
        <div className="events-stats">
          <div className="mini-stat"><span>Total</span><strong>{filtered.length}</strong></div>
          <div className="mini-stat"><span>High confidence</span><strong>{highConf}</strong></div>
        </div>
      </div>

      {/* Filters */}
      <div className="card filter-bar">
        <label>
          Search label
          <input value={search} placeholder="e.g. person, fire…" onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Camera
          <select value={filterCam} onChange={(e) => setFilterCam(e.target.value)}>
            <option value="">All cameras</option>
            {cameraOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          Sort
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table">
          <div className="table-row table-head table-cols-events">
            <span>#</span>
            <span>Label</span>
            <span>Confidence</span>
            <span>Camera</span>
            <span>Image</span>
            <span>Time</span>
          </div>
          {filtered.length === 0 ? (
            <div className="table-empty">No events match the current filters.</div>
          ) : (
            filtered.map((ev, i) => (
              <div className="table-row table-cols-events" key={ev.id} style={{ animationDelay: `${i * 40}ms` }}>
                <span className="muted-sm">{ev.id}</span>
                <span className="label-pill label-pill--inline">{ev.label}</span>
                <span className="confidence-bar-wrap">
                  <span className="confidence-bar" style={{ width: `${(ev.confidence * 100).toFixed(0)}%` }} />
                  <span>{confidencePct(ev.confidence)}</span>
                </span>
                <span className="muted-sm">{cameraMap[ev.camera_id] ?? ev.camera_id ?? "—"}</span>
                <span className="muted-sm truncate">
                  {ev.image_path
                    ? <a href={`/detection_images/${ev.image_path.split("/").pop()}`} target="_blank" rel="noreferrer" className="img-link">View</a>
                    : "—"
                  }
                </span>
                <span className="muted-sm">{formatDateTime(ev.occurred_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
