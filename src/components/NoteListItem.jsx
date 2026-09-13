import { CheckSquare2, Pin, Star } from "lucide-react";
import { checkboxStats, displayTitle, noteExcerpt, notebookToken, relativeTime } from "../lib/notes";

export default function NoteListItem({ note, selected, onSelect }) {
  const boxes = checkboxStats(note.content);
  return (
    <button type="button" className={selected ? "note-list-item is-selected" : "note-list-item"} style={{ "--notebook-color": notebookToken(note.notebook) }} onClick={() => onSelect(note.id)} aria-current={selected ? "true" : undefined}>
      <span className="note-list-item__title"><strong>{displayTitle(note)}</strong><span>{note.pinned && <Pin size={13} aria-label="Pinned" />}{note.starred && <Star size={13} fill="currentColor" aria-label="Starred" />}</span></span>
      <span className="note-list-item__excerpt">{noteExcerpt(note)}</span>
      <span className="note-list-item__meta"><span><i />{note.notebook}</span><time dateTime={note.updatedAt}>{relativeTime(note.updatedAt)}</time>{boxes.total > 0 && <span><CheckSquare2 size={12} />{boxes.completed}/{boxes.total}</span>}</span>
    </button>
  );
}

