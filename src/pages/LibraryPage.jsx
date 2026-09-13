import { ArrowRight, CheckSquare2, FileText, Link2, Tags, Type } from "lucide-react";
import { useMemo } from "react";
import EmptyState from "../components/EmptyState";
import { displayTitle, libraryInsights, notebookToken, noteSummary, relativeTime } from "../lib/notes";

export default function LibraryPage({ notes, onExplore, onOpen }) {
  const summary = useMemo(() => noteSummary(notes), [notes]);
  const insights = useMemo(() => libraryInsights(notes), [notes]);
  return (
    <div className="page-stack library-page">
      <header className="page-heading"><div><span className="eyebrow">Your knowledge at a glance</span><h1>Library</h1><p>See where your notes live and how ideas connect.</p></div></header>
      <section className="metric-grid" aria-label="Library summary"><article className="metric"><span className="metric__icon"><FileText size={18} /></span><span>Active notes</span><strong>{summary.active}</strong><small>{summary.archived} archived</small></article><article className="metric"><span className="metric__icon"><Type size={18} /></span><span>Words</span><strong>{summary.words.toLocaleString()}</strong><small>outside trash</small></article><article className="metric"><span className="metric__icon"><CheckSquare2 size={18} /></span><span>Open boxes</span><strong>{summary.openCheckboxes}</strong><small>across your notes</small></article><article className="metric"><span className="metric__icon"><FileText size={18} /></span><span>Edited · 7 days</span><strong>{summary.editedThisWeek}</strong><small>notes touched</small></article></section>

      {insights.notebooks.length ? <section className="notebook-grid" aria-label="Notebooks">{insights.notebooks.map((notebook) => <button type="button" key={notebook.name} style={{ "--notebook-color": notebookToken(notebook.name) }} onClick={() => onExplore(`BOOK:${notebook.name}`)}><span className="notebook-mark"><i /><small>Notebook</small></span><strong>{notebook.name}</strong><span>{notebook.count} {notebook.count === 1 ? "note" : "notes"} · {notebook.words.toLocaleString()} words</span><small>Edited {relativeTime(notebook.latest)}</small><ArrowRight size={17} /></button>)}</section> : <section className="panel"><EmptyState title="Your library is ready" description="Create a note and its notebook will appear here." /></section>}

      <section className="library-details">
        <article className="panel topic-card"><header><span className="section-icon"><Tags size={17} /></span><div><span className="eyebrow">Topics</span><h2>Tags</h2></div></header>{insights.tags.length ? <div className="tag-cloud">{insights.tags.map((item) => <button type="button" key={item.tag} onClick={() => onExplore(`TAG:${item.tag}`)}><span>#{item.tag}</span><strong>{item.count}</strong></button>)}</div> : <div className="detail-empty">Add tags to build a lightweight topic index.</div>}</article>
        <article className="panel connections-card"><header><span className="section-icon"><Link2 size={17} /></span><div><span className="eyebrow">Write · Link</span><h2>Connected notes</h2></div></header>{insights.connected.length ? <div>{insights.connected.slice(0, 8).map((item) => <button type="button" key={item.note.id} onClick={() => onOpen(item.note.id)}><span><strong>{displayTitle(item.note)}</strong><small>{item.note.notebook}</small></span><span>{item.incoming}<small>in</small></span><span>{item.outgoing}<small>out</small></span><ArrowRight size={16} /></button>)}</div> : <div className="detail-empty">Type <code>[[Another note]]</code> to connect related ideas.</div>}</article>
      </section>
    </div>
  );
}

