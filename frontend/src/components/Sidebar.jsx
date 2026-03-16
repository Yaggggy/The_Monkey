import {
  HomeIcon, VideoIcon, ScanIcon, CameraIcon, BellIcon,
  UsersIcon, SignOutIcon, SunIcon, MoonIcon, RefreshIcon,
  CloseIcon, ShieldIcon
} from "./Icons.jsx";

const NAV = [
  { id: "dashboard",  label: "Dashboard",   Icon: HomeIcon   },
  { id: "live",       label: "Live Stream",  Icon: VideoIcon  },
  { id: "inference",  label: "Inference",    Icon: ScanIcon   },
  { id: "cameras",    label: "Cameras",      Icon: CameraIcon },
  { id: "events",     label: "Events",       Icon: BellIcon   },
  { id: "operators",  label: "Operators",    Icon: UsersIcon  },
];

export default function Sidebar({
  page, navigate, theme, toggleTheme, user, onSignOut, busy, onRefresh, open, onClose
}) {
  return (
    <>
      {/* Backdrop (mobile only) */}
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <ShieldIcon size={22} />
          <span>The Monkey</span>
          <button className="sidebar-close-btn icon-btn" onClick={onClose} aria-label="Close menu">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* nav */}
        <nav className="sidebar-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item${page === id ? " nav-item--active" : ""}`}
              onClick={() => { navigate(id); onClose(); }}
            >
              <span className="nav-icon"><Icon size={18} /></span>
              <span className="nav-label">{label}</span>
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        {/* footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">
              {user?.profile?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user?.profile?.email ?? "Operator"}
              </span>
              <span className="sidebar-user-role">Security Operator</span>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <button className="icon-btn" onClick={onRefresh} disabled={busy} title="Refresh data">
              <RefreshIcon size={16} />
            </button>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
            <button className="icon-btn danger" onClick={onSignOut} title="Sign out">
              <SignOutIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
