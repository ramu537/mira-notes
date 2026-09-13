import { ArchiveRestore, FileArchive, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { displayTitle, notebookToken, relativeTime, wordCount } from "../lib/notes";

export default function ArchivePage({ notes, saveStates, deletingId, onStatus, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const archived = notes.filter((note) => note.status === "ARCHIVED");
  const trashed = notes.filter((note) => note.status === "TRASHED");

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (await onDelete(pendingDelete.id)) setPendingDelete(null);
  }

  return (
    <div className="page-stack archive-page">
      <header className="page-heading page-heading--split"><div><span className="eyebrow">Keep the active list calm</span><h1>Archive</h1><p>Archived notes stay safe. Trash requires an explicit permanent deletion.</p></div><div className="archive-counts"><span><strong>{archived.length}</strong> archived</span><span><strong>{trashed.length}</strong> in trash</span></div></header>
      <ArchiveGroup icon={FileArchive} title="Archived" notes={archived} empty="Nothing archived" actions={(note) => { const saving = saveStates[note.id] === "Saving"; return <><button className="button button--small button--ghost" type="button" disabled={saving} onClick={() => onStatus(note, "ACTIVE")}><ArchiveRestore size={15} />Restore</button><button className="button button--small button--ghost" type="button" disabled={saving} onClick={() => onStatus(note, "TRASHED")}><Trash2 size={15} />Move to trash</button></>; }} />
      <ArchiveGroup icon={Trash2} title="Trash" notes={trashed} empty="Trash is empty" actions={(note) => { const saving = saveStates[note.id] === "Saving"; return <><button className="button button--small button--ghost" type="button" disabled={saving} onClick={() => onStatus(note, "ACTIVE")}><RotateCcw size={15} />Restore</button><button className="button button--small button--danger" type="button" disabled={saving} onClick={() => setPendingDelete(note)}><Trash2 size={15} />Delete forever</button></>; }} />
      <ConfirmDialog open={Boolean(pendingDelete)} note={pendingDelete} busy={deletingId === pendingDelete?.id} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
}

function ArchiveGroup({ icon: Icon, title, notes, empty, actions }) {
  return <section className="archive-group panel"><header><div><span className="section-icon"><Icon size={17} /></span><h2>{title}</h2></div><span className="count-badge">{notes.length}</span></header>{notes.length ? <div className="archive-list">{notes.map((note) => <article key={note.id} style={{ "--notebook-color": notebookToken(note.notebook) }}><div><span><i />{note.notebook}</span><strong>{displayTitle(note)}</strong><small>{wordCount(note.content).toLocaleString()} words · edited {relativeTime(note.updatedAt)}</small></div><div>{actions(note)}</div></article>)}</div> : <div className="archive-empty">{empty}</div>}</section>;
}
