import { Archive, ArrowLeft, Eye, FilePenLine, Pin, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { checkboxStats, defaultNotebooks, displayTitle, relativeTime, uniqueNotebooks, wordCount } from "../lib/notes";
import NotePreview from "./NotePreview";
import TagEditor from "./TagEditor";

export default function NoteEditor({ note, notes, saveState, onBack, onChange, onFlush, onMetadata, onStatus, onOpenLinked }) {
  const [preview, setPreview] = useState(false);
  const notebooks = useMemo(() => Array.from(new Set([...defaultNotebooks, ...uniqueNotebooks(notes), note?.notebook].filter(Boolean))), [note?.notebook, notes]);

  if (!note) return <section className="note-editor note-editor--empty"><span className="paper-glyph"><FilePenLine size={28} /></span><h2>Select a note</h2><p>Choose a note from the list or create a new one.</p></section>;
  const boxes = checkboxStats(note.content);

  function editorKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "s") {
      event.preventDefault();
      onFlush(note.id);
    }
  }

  return (
    <section className="note-editor" aria-label={`Editing ${displayTitle(note)}`}>
      <header className="editor-header"><button className="editor-back" type="button" onClick={onBack} aria-label="Back to notes"><ArrowLeft size={19} /></button><input className="title-input" aria-label="Note title" maxLength="140" placeholder="Untitled note" value={note.title} onChange={(event) => onChange(note.id, { title: event.target.value })} onBlur={() => onFlush(note.id)} /><span className={`save-state save-state--${saveState.toLocaleLowerCase().replace(" ", "-")}`} aria-live="polite"><i />{saveState}</span></header>
      <div className="editor-toolbar" aria-label="Note actions"><button type="button" className={preview ? "is-active" : ""} aria-pressed={preview} onClick={() => setPreview((current) => !current)}>{preview ? <FilePenLine size={16} /> : <Eye size={16} />}{preview ? "Edit" : "Preview"}</button><span /><button type="button" className={note.pinned ? "is-active" : ""} aria-pressed={note.pinned} onClick={() => onMetadata(note, { pinned: !note.pinned })}><Pin size={16} />Pin</button><button type="button" className={note.starred ? "is-active" : ""} aria-pressed={note.starred} onClick={() => onMetadata(note, { starred: !note.starred })}><Star size={16} />Star</button><button type="button" onClick={() => onStatus(note, "ARCHIVED")}><Archive size={16} />Archive</button><button className="danger-action" type="button" onClick={() => onStatus(note, "TRASHED")}><Trash2 size={16} />Trash</button></div>
      <div className="editor-meta"><span>Edited {relativeTime(note.updatedAt)}</span><span>{wordCount(note.content)} words</span><span>{note.content.length.toLocaleString()} characters</span><span>{boxes.open} open {boxes.open === 1 ? "checkbox" : "checkboxes"}</span></div>
      <div className="organize-row"><label><span className="sr-only">Notebook</span><select value={note.notebook} onChange={(event) => onMetadata(note, { notebook: event.target.value })}>{notebooks.map((notebook) => <option key={notebook} value={notebook}>{notebook}</option>)}</select></label><TagEditor tags={note.tags || []} onChange={(tags) => onMetadata(note, { tags })} /></div>
      <div className="writing-area">{preview ? <NotePreview content={note.content} onChange={(content) => onChange(note.id, { content })} onOpenLinked={onOpenLinked} /> : <textarea aria-label="Note content" spellCheck="true" maxLength="100000" placeholder={'Start writing…\n\n# Heading\n- Bullet\n- [ ] Checkbox\n[[Another note]]'} value={note.content} onChange={(event) => onChange(note.id, { content: event.target.value })} onBlur={() => onFlush(note.id)} onKeyDown={editorKeyDown} />}</div>
    </section>
  );
}

