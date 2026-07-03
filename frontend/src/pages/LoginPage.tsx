import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../components/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

export function LoginPage() {
  const { token, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-toolbar">
          <div />
          <ThemeToggle />
        </div>
        <p className="eyebrow">QuickRecon Web</p>
        <h1>Launch recon workflows without giving up control.</h1>
        <p className="auth-copy">
          Isolated scans, Node-backed orchestration, secure file serving, and a
          monochrome operator console with light and dark mode.
        </p>

        <div className="auth-mode-switch">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="operator01"
              required
              value={username}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
