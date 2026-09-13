import { Archive, BookOpen, LibraryBig, LogOut, NotebookPen, Plus, Sparkles, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { to: "/", label: "Notes", icon: NotebookPen, end: true },
  { to: "/library", label: "Library", icon: LibraryBig },
  { to: "/archive", label: "Archive", icon: Archive },
];

function Brand() {
  return (
    <div className="brand" aria-label="Mira Notes Manager">
      <span className="brand-mark" aria-hidden="true"><BookOpen size={21} strokeWidth={2.1} /></span>
      <span className="brand-copy"><strong>Mira</strong><small>Notes</small></span>
    </div>
  );
}

function Navigation({ mobile = false }) {
  return (
    <nav className={mobile ? "mobile-navigation" : "side-navigation"} aria-label="Notes manager">
      {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon size={mobile ? 20 : 18} strokeWidth={2} /><span>{label}</span></NavLink>)}
    </nav>
  );
}

export default function AppShell({ user, onSignOut, loading, creating, onAdd, children }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <Navigation />

        <div className="sidebar-bottom">
          {user && (
            <div className="sidebar-user">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder"><User size={16} /></div>
              )}
              <div className="user-info">
                <span className="user-name">{user.displayName || "Account"}</span>
                <span className="user-email">{user.email || ""}</span>
              </div>
              <button
                type="button"
                className="user-signout-btn"
                onClick={onSignOut}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          <div className="sidebar-note">
            <span><Sparkles size={16} /></span>
            <div><strong>Capture before organizing</strong><small>A title can come later</small></div>
          </div>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-brand"><Brand /></div>
          <span className="topbar-context">A quiet place for useful thoughts</span>

          <div className="topbar-actions">
            <button className="button button--primary topbar-add" type="button" onClick={onAdd} disabled={creating}>
              <Plus size={18} />{creating ? "Creating…" : "New note"}
            </button>

            {user && (
              <div className="topbar-user">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar topbar-user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder topbar-user-avatar"><User size={14} /></div>
                )}
                <button
                  type="button"
                  className="user-signout-btn topbar-signout-btn"
                  onClick={onSignOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
          {loading && <span className="route-progress" aria-label="Loading notes" />}
        </header>
        <main className="main-content">{children}</main>
        <Navigation mobile />
        <button className="mobile-add" type="button" onClick={onAdd} disabled={creating} aria-label="Create a note"><Plus size={24} /></button>
      </div>
    </div>
  );
}

