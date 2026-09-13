import { Check } from "lucide-react";
import { toggleCheckboxLine } from "../lib/notes";

export default function NotePreview({ content, onChange, onOpenLinked }) {
  const lines = content.split("\n");
  if (!content.trim()) return <div className="preview-empty"><strong>Nothing to preview yet</strong><span>Headings, lists, checkboxes, and note links will appear here.</span></div>;
  return <div className="note-preview">{lines.map((line, index) => renderLine(line, index, content, onChange, onOpenLinked))}</div>;
}

function renderLine(line, index, content, onChange, onOpenLinked) {
  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const Heading = `h${heading[1].length}`;
    return <Heading key={index}>{inlineContent(heading[2], onOpenLinked)}</Heading>;
  }
  const checkbox = line.match(/^\s*-\s*\[([xX ])\]\s*(.*)$/);
  if (checkbox) {
    const complete = checkbox[1].toLocaleLowerCase() === "x";
    return <div className={complete ? "preview-check is-complete" : "preview-check"} key={index}><button type="button" aria-label={complete ? "Mark unchecked" : "Mark checked"} onClick={() => onChange(toggleCheckboxLine(content, index))}>{complete && <Check size={14} />}</button><span>{inlineContent(checkbox[2], onOpenLinked)}</span></div>;
  }
  const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
  if (bullet) return <div className="preview-bullet" key={index}><i />{inlineContent(bullet[1], onOpenLinked)}</div>;
  const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
  if (ordered) return <div className="preview-number" key={index}><i>{ordered[1]}.</i>{inlineContent(ordered[2], onOpenLinked)}</div>;
  const quote = line.match(/^>\s?(.+)$/);
  if (quote) return <blockquote key={index}>{inlineContent(quote[1], onOpenLinked)}</blockquote>;
  if (/^---+$/.test(line.trim())) return <hr key={index} />;
  if (!line.trim()) return <div className="preview-space" key={index} />;
  return <p key={index}>{inlineContent(line, onOpenLinked)}</p>;
}

function inlineContent(text, onOpenLinked) {
  return text.split(/(\[\[[^\]]+\]\])/g).filter(Boolean).map((part, index) => {
    const link = part.match(/^\[\[([^\]]+)\]\]$/);
    return link ? <button className="note-link" type="button" key={index} onClick={() => onOpenLinked(link[1].trim())}>{link[1].trim()}</button> : part;
  });
}

