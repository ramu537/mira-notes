import { FileText, Plus, SearchX } from "lucide-react";

export default function EmptyState({ kind = "notes", title, description, actionLabel, onAction }) {
  const Icon = kind === "search" ? SearchX : FileText;
  return <div className="empty-state"><span className="empty-state__icon"><Icon size={25} /></span><h2>{title}</h2><p>{description}</p>{onAction && <button className="button button--secondary" type="button" onClick={onAction}><Plus size={17} />{actionLabel}</button>}</div>;
}

