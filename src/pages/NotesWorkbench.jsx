import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState";
import NoteEditor from "../components/NoteEditor";
import NoteListItem from "../components/NoteListItem";
import { filterNotes, uniqueNotebooks } from "../lib/notes";

const baseFilters = [{ value: "ALL", label: "All" }, { value: "STARRED", label: "Starred" }];
const sorts = [{ value: "EDITED", label: "Last edited" }, { value: "CREATED", label: "Created" }, { value: "A_Z", label: "Title A–Z" }];

export default function NotesWorkbench({ notes, selectedNote, selectedId, saveState, initialFilter, onFilterUsed, onAdd, onSelect, onBack, onChange, onFlush, onMetadata, onStatus, onOpenLinked }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("EDITED");
  const searchRef = useRef(null);
  const active = useMemo(() => notes.filter((note) => note.status === "ACTIVE"), [notes]);
  const notebooks = useMemo(() => uniqueNotebooks(active).filter((notebook) => active.some((note) => note.notebook === notebook)), [active]);
  const tags = useMemo(() => Array.from(new Set(active.flatMap((note) => note.tags || []))).sort(), [active]);
  const visible = useMemo(() => filterNotes(notes, { search, filter, sort }), [notes, search, filter, sort]);

  useEffect(() => {
    if (!initialFilter) return;
    setFilter(initialFilter);
    onFilterUsed();
  }, [initialFilter, onFilterUsed]);

  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const filters = [
    ...baseFilters,
    ...notebooks.map((notebook) => ({ value: `BOOK:${notebook}`, label: notebook })),
    ...tags.map((tag) => ({ value: `TAG:${tag}`, label: `#${tag}` })),
  ];

  return (
    <div className={selectedNote ? "notes-workbench editor-open" : "notes-workbench"}>
      <section className="notes-browser" aria-label="Notes browser">
        <header className="browser-heading"><div><span className="eyebrow">Capture and retrieve</span><h1>Notes</h1></div><span><strong>{visible.length}</strong> of {active.length}</span></header>
        <div className="search-field"><Search size={18} /><input ref={searchRef} type="search" aria-label="Search notes" placeholder="Search notes" value={search} onChange={(event) => setSearch(event.target.value)} />{search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button> : <kbd>Ctrl K</kbd>}</div>
        <div className="browser-controls"><div className="filter-scroll" role="group" aria-label="Filter notes"><span className="filter-label"><SlidersHorizontal size={14} />View</span>{filters.map((item) => <button key={item.value} type="button" className={filter === item.value ? "filter-chip is-active" : "filter-chip"} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div><label className="sort-select"><span className="sr-only">Sort notes</span><select value={sort} onChange={(event) => setSort(event.target.value)}>{sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={14} /></label></div>
        <div className="note-list">{visible.length ? visible.map((note) => <NoteListItem key={note.id} note={note} selected={note.id === selectedId} onSelect={onSelect} />) : <EmptyState kind={search ? "search" : "notes"} title={search ? "No matching notes" : "No notes here"} description={search ? "Try another phrase or clear the current filter." : "Capture a thought now; organize it when useful."} actionLabel="New note" onAction={onAdd} />}</div>
      </section>
      <NoteEditor key={selectedNote?.id || "empty"} note={selectedNote} notes={notes} saveState={saveState} onBack={onBack} onChange={onChange} onFlush={onFlush} onMetadata={onMetadata} onStatus={onStatus} onOpenLinked={onOpenLinked} />
    </div>
  );
}
