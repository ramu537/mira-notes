import { Plus, X } from "lucide-react";
import { useState } from "react";
import { sanitizeTags } from "../lib/notes";

export default function TagEditor({ tags, onChange }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addTag() {
    const candidate = draft.trim().replace(/^#/, "").toLocaleLowerCase();
    if (!candidate) return;
    if (!/^[a-z0-9][a-z0-9_-]{0,29}$/i.test(candidate)) {
      setError("Use letters, numbers, hyphens, or underscores.");
      return;
    }
    if (tags.length >= 10 && !tags.includes(candidate)) {
      setError("A note can have up to 10 tags.");
      return;
    }
    onChange(sanitizeTags([...tags, candidate]));
    setDraft("");
    setError("");
  }

  function keyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
    if (event.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
  }

  return (
    <div className="tag-editor">
      <div className="tag-editor__row" aria-label="Note tags">{tags.map((tag) => <span className="tag" key={tag}>#{tag}<button type="button" onClick={() => onChange(tags.filter((item) => item !== tag))} aria-label={`Remove ${tag} tag`}><X size={13} /></button></span>)}<label><span className="sr-only">Add a tag</span><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={keyDown} onBlur={addTag} maxLength="31" placeholder={tags.length ? "Add tag" : "Add tags"} /></label>{draft && <button className="tag-add" type="button" onMouseDown={(event) => event.preventDefault()} onClick={addTag} aria-label="Add tag"><Plus size={15} /></button>}</div>
      {error && <small className="field-error" role="alert">{error}</small>}
    </div>
  );
}

