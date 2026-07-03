import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, Scan, apiRequest } from "../api/client";
import { useAuth } from "../components/AuthContext";
import { Layout } from "../components/Layout";

export function DashboardPage() {
  const { token } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadScans() {
    if (!token) {
      return;
    }

    try {
      const data = await apiRequest<Scan[]>("/scans", {}, token);
      setScans(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load scans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScans();
    const interval = window.setInterval(loadScans, 5000);
    return () => window.clearInterval(interval);
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await apiRequest<Scan>(
        "/scans",
        {
          method: "POST",
          body: JSON.stringify({ target }),
        },
        token,
      );
      setScans((current) => [created, ...current]);
      setTarget("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create scan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout
      title="Saved Recon Scans"
      subtitle="Queue new targets, monitor execution state, and jump back into any prior run."
    >
      <div className="dashboard-grid">
        <section className="panel accent-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New scan</p>
              <h2>Submit target</h2>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Apex domain
              <input
                onChange={(event) => setTarget(event.target.value)}
                placeholder="example.com"
                required
                value={target}
              />
            </label>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Queueing..." : "Run recon"}
            </button>
          </form>

          <p className="muted-copy">
            Submit the root domain only. The backend rejects URLs and subdomains, then
            runs <code>recon.sh -d example.com -o &lt;scan-folder&gt;</code> for the saved
            scan.
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">History</p>
              <h2>Scan dashboard</h2>
            </div>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {loading ? <div className="empty-state">Loading scans...</div> : null}

          <div className="scan-list">
            {scans.map((scan) => (
              <Link className="scan-card" key={scan.id} to={`/scans/${scan.id}`}>
                <div className="scan-card-top">
                  <span className={`status-pill status-${scan.status}`}>{scan.status}</span>
                  <span className="scan-time">
                    {new Date(scan.created_at).toLocaleString()}
                  </span>
                </div>
                <h3>{scan.normalized_target}</h3>
                <p>{scan.target_raw}</p>
                {scan.last_error ? <div className="error-inline">{scan.last_error}</div> : null}
              </Link>
            ))}

            {!loading && scans.length === 0 ? (
              <div className="empty-state">
                No scans yet. Submit your first target to create the dashboard history.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </Layout>
  );
}
