import { AlertCircle, CheckCircle2, Clock3, Database, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { freshnessLabel, intelligenceCopy, normalizeEvidence } from "../lib/intelligence";

const statusCopy = { READY: "AI interpretation ready", CALCULATED: "Calculated from your records", PENDING: "Interpretation is being prepared", UNAVAILABLE: "Calculated view available" };
function displayValue(value) {
  if (value == null || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${key.replaceAll("_", " ")}: ${item}`).join(" · ");
  return String(value);
}

export default function DomainIntelligenceDialog({ open, title, description, date, load, refresh, onClose }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const requestRef = useRef(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const read = useCallback(async ({ regenerate = false, quiet = false } = {}) => {
    const requestId = ++requestRef.current;
    if (!quiet) setLoading(true);
    setError("");
    try { const next = regenerate ? await refresh(date).catch(() => load(date)) : await load(date); if (requestId === requestRef.current) setData(next); }
    catch (reason) { if (requestId === requestRef.current) { setData(null); setError(reason?.message || "Intelligence is temporarily unavailable."); } }
    finally { if (requestId === requestRef.current) setLoading(false); }
  }, [date, load, refresh]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { returnFocusRef.current = document.activeElement; dialog.showModal(); void read({ regenerate: true }); }
    if (!open && dialog.open) { dialog.close(); returnFocusRef.current?.focus?.(); }
  }, [open, read]);
  useEffect(() => {
    if (!open) return undefined;
    const sync = () => { if (document.visibilityState === "visible") void read({ quiet: true }); };
    window.addEventListener("focus", sync); document.addEventListener("visibilitychange", sync);
    const timer = data?.status === "PENDING" ? window.setInterval(sync, 8000) : null;
    return () => { window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); if (timer) window.clearInterval(timer); };
  }, [data?.status, open, read]);

  const evidence = normalizeEvidence(data?.evidence);
  const interpretation = intelligenceCopy(data);
  const notices = [...(data?.assumptions || []), ...(data?.safetyNotices || [])];
  const engine = String(data?.engine || "CALCULATED");
  const coverage = data?.coverage || `${evidence.length} supporting ${evidence.length === 1 ? "fact" : "facts"} from aggregate note metadata`;
  const citedKeys = new Set(data?.assistantEvidenceKeys || []);
  const actionPath = data?.actionPath?.startsWith("/notes") ? "/" : data?.actionPath;
  const StatusIcon = data?.status === "PENDING" ? Clock3 : data?.status === "UNAVAILABLE" ? AlertCircle : CheckCircle2;
  return <dialog ref={dialogRef} className="dialog intelligence-dialog" aria-labelledby="intelligence-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-card"><header className="intelligence-dialog__header"><div><span className="eyebrow">Grounded in your records</span><h2 id="intelligence-title"><Sparkles size={19} /> {title}</h2><p>{description}</p></div><div className="intelligence-dialog__actions"><button className="icon-button" type="button" onClick={() => read({ regenerate: true })} disabled={loading} aria-label={`Refresh ${title}`} title="Refresh"><RefreshCw className={loading ? "spin" : ""} size={18} /></button><button className="icon-button" type="button" onClick={onClose} aria-label={`Close ${title}`} title="Close"><X size={20} /></button></div></header>
      <div className="intelligence-dialog__body" aria-live="polite">
        {loading && !data ? <div className="intelligence-state"><RefreshCw className="spin" size={22} /><strong>Reading your latest records…</strong><span>The notes workspace stays available while Mira checks the evidence.</span></div> : null}
        {error && !data ? <div className="intelligence-state intelligence-state--error"><AlertCircle size={22} /><strong>Could not load intelligence</strong><span>{error}</span><button className="button button--secondary" type="button" onClick={() => read()}>Try again</button></div> : null}
        {data ? <><div className="intelligence-meta"><span className={`intelligence-status intelligence-status--${String(data.status || "CALCULATED").toLowerCase()}`}><StatusIcon size={14} />{statusCopy[data.status] || "Calculated from your records"}</span><span>{engine.includes("GEMINI") ? "Gemini + calculated evidence" : engine === "EXTERNAL_MCP" ? "Assistant + calculated evidence" : "Calculated evidence"}</span><span>{freshnessLabel(data.assistantGeneratedAt || data.generatedAt)}</span></div>
          <section className="intelligence-lead"><span className="eyebrow">What deserves attention</span><h3>{data.headline || "Your notes at a glance"}</h3><p>{interpretation || data.guidance || "There is not enough recorded evidence for a reliable interpretation yet. The facts below are still current."}</p>{data.actionLabel ? actionPath ? <Link className="intelligence-action" to={actionPath} onClick={onClose}>{data.actionLabel}</Link> : <span className="intelligence-action">{data.actionLabel}</span> : null}</section>
          <section className="intelligence-coverage"><Database size={17} /><div><strong>Coverage</strong><span>{displayValue(coverage)}</span></div></section>
          <section className="intelligence-evidence"><div className="intelligence-section-title"><Database size={16} /><h3>Supporting evidence</h3></div>{evidence.length ? <dl>{evidence.map((item) => <div className={citedKeys.has(item.key) ? "is-cited" : undefined} key={item.key}><dt>{item.label}{citedKeys.has(item.key) ? <small>Used by assistant</small> : null}</dt><dd>{displayValue(item.value)}</dd></div>)}</dl> : <p>Keep writing normally. Mira will surface organization gaps and unfinished items when there is enough evidence.</p>}</section>
          {notices.length ? <details className="intelligence-notes"><summary>Assumptions and boundaries</summary><ul>{notices.map((notice, index) => <li key={`${notice}-${index}`}>{notice}</li>)}</ul></details> : null}{error ? <p className="intelligence-inline-error"><AlertCircle size={14} /> Latest refresh failed: {error}</p> : null}</> : null}
      </div></div>
  </dialog>;
}
