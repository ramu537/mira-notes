import { AlertCircle, Database, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { freshnessLabel, intelligenceCopy, normalizeEvidence } from "../lib/intelligence";

function localPath(path = "") {
  const [base, query] = path.split("?");
  let route = base;
  if (base.startsWith("/tasks")) route = "/";
  if (base.startsWith("/notes")) route = base.includes("/library") ? "/library" : base.includes("/archive") ? "/archive" : "/";
  if (base.startsWith("/invest")) route = "/holdings";
  if (base.startsWith("/diary")) route = base.includes("timeline") ? "/timeline" : "/entry";
  return route + (query ? `?${query}` : "");
}
const labels = { READY: "AI interpretation ready", PENDING: "AI is preparing your interpretation",
  CALCULATED: "Calculated from saved records", UNAVAILABLE: "Calculated insights available · AI unavailable" };

export default function DomainIntelligenceDialog({ open, title, description, date, revision, load, refresh, onClose, domain, userId }) {
  const revisionKey = JSON.stringify(revision ?? null);
  const dialogRef = useRef(null), returnFocusRef = useRef(null), sequence = useRef(0);
  const context = `${userId || ""}:${domain}:${date || ""}`;
  const [snapshot, setSnapshot] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState("");
  // Never show another account/date's cached interpretation, even before effects run.
  const data = snapshot?.context === context ? snapshot.value : null;
  const read = useCallback(async (regenerate = false, quiet = false) => {
    const request = ++sequence.current;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const next = await (regenerate ? refresh(date) : load(date));
      if (sequence.current === request) setSnapshot({ context, value: next });
    } catch (reason) {
      if (sequence.current === request) {
        setError(reason?.message || "Could not read your latest records.");
      }
    } finally { if (sequence.current === request) setLoading(false); }
  }, [date, load, refresh, context]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) { returnFocusRef.current = document.activeElement; dialog.showModal(); }
    if (!open && dialog.open) { dialog.close(); returnFocusRef.current?.focus?.(); }
  }, [open]);
  useEffect(() => {
    if (open) void read(true);
    return () => { sequence.current++; };
  }, [open, read, revisionKey]);
  useEffect(() => {
    if (!open) return undefined;
    const sync = () => { if (document.visibilityState === "visible") void read(false, true); };
    const timer = window.setInterval(sync, data?.status === "PENDING" ? 8000 : 30000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
  }, [open, read, data?.status]);
  const evidence = normalizeEvidence(data?.evidence);
  const cited = new Set(data?.assistantEvidenceKeys || []);
  return <dialog ref={dialogRef} className="dialog intelligence-dialog" aria-labelledby="intelligence-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-card">
      <header className="intelligence-dialog__header">
        <div><span className="eyebrow">Your personal assistant · saved records</span><h2 id="intelligence-title"><Sparkles size={19} /> {title}</h2><p>{description}</p></div>
        <div className="intelligence-dialog__actions">
          <button className="icon-button" type="button" disabled={loading} onClick={() => read(true)} aria-label="Refresh intelligence"><RefreshCw size={18} className={loading ? "spin" : ""} /></button>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close intelligence"><X size={20} /></button>
        </div>
      </header>

      <div className="intelligence-dialog__body" aria-live="polite">
        {loading && <p role="status">{data ? "Refreshing · your previous analysis stays visible." : "Reading your latest records…"}</p>}
        {error && data && <p className="inline-notice" role="status">Showing the last successful analysis. It may not include your latest changes.</p>}
        {error && <div className="intelligence-state intelligence-state--error"><AlertCircle size={20} /><p>{error}</p><button type="button" className="button button--secondary" onClick={() => read()}>Retry</button></div>}
        {data && <>
          <div className="intelligence-meta"><span>{labels[data.status] || labels.CALCULATED}</span><span>{data.engine}</span><span>{freshnessLabel(data.assistantGeneratedAt || data.generatedAt)}</span></div>
          {data.providerMessage && <p className="intelligence-inline-error">{data.providerMessage}</p>}
          <section className="intelligence-lead"><h3>{data.headline}</h3><p>{intelligenceCopy(data) || data.guidance}</p>
            {data.actionPath && <Link className="intelligence-action" to={localPath(data.actionPath)} onClick={onClose}>{data.actionLabel || "Review records"}</Link>}
          </section>
          <section className="intelligence-coverage"><Database size={16} /><div><strong>Coverage</strong><span>{data.coverage || "Saved records only. Missing information remains unknown."}</span>{data.dataUpdatedAt && <small>Latest record edit: {freshnessLabel(data.dataUpdatedAt)}</small>}</div></section>
          {!!data.findings?.length && <section className="intelligence-findings"><h3>Useful next steps</h3>{data.findings.map(finding => <article key={finding.key}><h4>{finding.headline}</h4><p>{finding.detail}</p><Link className="intelligence-action" to={localPath(finding.actionPath)} onClick={onClose}>{finding.actionLabel}</Link></article>)}</section>}
          <details className="intelligence-evidence"><summary>Supporting records ({evidence.length})</summary><dl>{evidence.map(item => <div key={item.key} className={cited.has(item.key) ? "is-cited" : undefined}><dt>{item.label}{cited.has(item.key) && <small>Used by AI</small>}</dt><dd>{String(item.value ?? "Unknown")}</dd></div>)}</dl></details>
          <details className="intelligence-notes"><summary>Assumptions and boundaries</summary><ul>{[...(data.assumptions || []), ...(data.safetyNotices || [])].map((notice, index) => <li key={index}>{notice}</li>)}</ul></details>
        </>}
      </div>

    </div>
  </dialog>;
}
