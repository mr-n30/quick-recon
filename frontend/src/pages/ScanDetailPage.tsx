import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ApiError,
  ScanDetail,
  apiRequest,
  downloadFile,
} from "../api/client";
import { useAuth } from "../components/AuthContext";
import { FileTree } from "../components/FileTree";
import { Layout } from "../components/Layout";

type FileContent = {
  path: string;
  content: string;
  truncated: boolean;
};

type LogContent = {
  content: string;
  truncated: boolean;
};

export function ScanDetailPage() {
  const { scanId } = useParams();
  const { token } = useAuth();
  const [detail, setDetail] = useState<ScanDetail | null>(null);
  const [log, setLog] = useState<LogContent | null>(null);
  const [file, setFile] = useState<FileContent | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadScan() {
    if (!token || !scanId) {
      return;
    }

    try {
      const [scan, logData] = await Promise.all([
        apiRequest<ScanDetail>(`/scans/${scanId}`, {}, token),
        apiRequest<LogContent>(`/scans/${scanId}/log`, {}, token),
      ]);
      setDetail(scan);
      setLog(logData);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load scan.");
    }
  }

  useEffect(() => {
    loadScan();
    const interval = window.setInterval(loadScan, 5000);
    return () => window.clearInterval(interval);
  }, [scanId, token]);

  async function handleFileSelect(path: string) {
    if (!token || !scanId) {
      return;
    }

    setSelectedPath(path);
    try {
      const response = await apiRequest<FileContent>(
        `/scans/${scanId}/files/content?path=${encodeURIComponent(path)}`,
        {},
        token,
      );
      setFile(response);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load file.");
    }
  }

  async function handleExport() {
    if (!token || !scanId) {
      return;
    }

    try {
      await downloadFile(`/scans/${scanId}/export`, token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to export scan.");
    }
  }

  return (
    <Layout
      actions={
        <button className="primary-button" onClick={handleExport}>
          Export zip
        </button>
      }
      subtitle="Browse generated artifacts safely and review the live operator log."
      title={detail ? detail.normalized_target : "Scan detail"}
    >
      <div className="detail-actions">
        <Link className="ghost-button" to="/">
          Back to dashboard
        </Link>
        {detail ? <span className={`status-pill status-${detail.status}`}>{detail.status}</span> : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Artifacts</p>
              <h2>File browser</h2>
            </div>
          </div>
          <FileTree
            nodes={detail?.files ?? []}
            onSelect={handleFileSelect}
            selectedPath={selectedPath}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>{file?.path ?? "Select a file"}</h2>
            </div>
          </div>

          <pre className="code-viewer">{file?.content ?? "Select an output file to preview it."}</pre>
          <div className="muted-copy">
            File contents are rendered as plain text in the UI, not as live HTML.
          </div>
          {file?.truncated ? (
            <div className="muted-copy">Preview truncated at 1 MB.</div>
          ) : null}
        </section>
      </div>

      <section className="panel log-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Execution</p>
            <h2>Scan log</h2>
          </div>
        </div>
        <pre className="log-viewer">{log?.content ?? "Log output will appear here."}</pre>
        {log?.truncated ? <div className="muted-copy">Log preview truncated.</div> : null}
      </section>
    </Layout>
  );
}
