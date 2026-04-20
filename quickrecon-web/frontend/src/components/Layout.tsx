import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { ThemeToggle } from "./ThemeToggle";

export function Layout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <Link className="brand" to="/">
            QuickRecon Web
          </Link>
          <p className="brand-copy">
            Authenticated recon orchestration with isolated per-user storage.
          </p>
        </div>
        <div className="topbar-actions">
          {actions}
          <ThemeToggle />
          <div className="user-pill">
            <span>{user?.username}</span>
            <button className="ghost-button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Security-first MVP</p>
          <h1>{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
        </div>
      </section>

      {children}
    </div>
  );
}
