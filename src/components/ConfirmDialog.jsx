import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { displayTitle } from "../lib/notes";

export default function ConfirmDialog({ open, note, busy, onCancel, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog confirm-dialog" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }} onClick={(event) => { if (event.target === ref.current && !busy) onCancel(); }}>
      <div className="dialog-card confirm-card"><button className="icon-button dialog-close" type="button" onClick={onCancel} disabled={busy} aria-label="Close"><X size={19} /></button><span className="confirm-icon"><AlertTriangle size={22} /></span><h2>Delete this note forever?</h2><p><strong>{note ? displayTitle(note) : "This note"}</strong> cannot be recovered after deletion.</p><div className="dialog-actions"><button className="button button--ghost" type="button" onClick={onCancel} disabled={busy}>Keep it</button><button className="button button--danger" type="button" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete forever"}</button></div></div>
    </dialog>
  );
}

