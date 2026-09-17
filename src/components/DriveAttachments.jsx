import {
  ChevronDown,
  Cloud,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Link2Off,
  LoaderCircle,
  Paperclip,
  Presentation,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { noteAttachmentApi } from "../api/attachments";
import { fileKind, formatFileSize } from "../lib/driveFiles";
import { openGoogleDrivePicker, prepareGoogleDrivePicker } from "../services/googleDrivePicker";

const icons = {
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  image: FileImage,
  file: File,
};

export default function DriveAttachments({ noteId, onNotify }) {
  const [attachments, setAttachments] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pickerPreparing, setPickerPreparing] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await noteAttachmentApi.list(noteId);
      setAttachments(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    noteAttachmentApi.list(noteId)
      .then((result) => { if (active) setAttachments(Array.isArray(result) ? result : []); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [noteId]);

  useEffect(() => {
    let active = true;
    prepareGoogleDrivePicker()
      .catch(() => undefined)
      .finally(() => { if (active) setPickerPreparing(false); });
    return () => { active = false; };
  }, []);

  async function addFromDrive() {
    setChoosing(true);
    setError("");
    try {
      const picked = await openGoogleDrivePicker();
      if (!picked.length) return;

      const results = await Promise.allSettled(picked.map((file) => noteAttachmentApi.attach(noteId, file)));
      const saved = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
      const failed = results.filter((result) => result.status === "rejected");

      if (saved.length) {
        setAttachments((current) => {
          const byFile = new Map(current.map((item) => [item.driveFileId, item]));
          saved.forEach((item) => byFile.set(item.driveFileId, item));
          return Array.from(byFile.values()).sort((left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        });
        setExpanded(true);
      }

      if (failed.length) {
        const failureMessage = `${failed.length} ${failed.length === 1 ? "file" : "files"} could not be linked. ${failed[0].reason?.message || "Please try again."}`;
        setError(failureMessage);
        onNotify?.({ tone: "error", message: failureMessage });
      } else {
        onNotify?.({
          tone: "success",
          message: `${saved.length} ${saved.length === 1 ? "file" : "files"} linked from Google Drive.`,
        });
      }
    } catch (requestError) {
      setError(requestError.message);
      onNotify?.({ tone: "error", message: requestError.message });
    } finally {
      setChoosing(false);
    }
  }

  async function detach(attachment) {
    setRemovingId(attachment.id);
    setError("");
    try {
      await noteAttachmentApi.detach(noteId, attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      onNotify?.({ tone: "success", message: "Link removed. The original file remains in Google Drive." });
    } catch (requestError) {
      setError(requestError.message);
      onNotify?.({ tone: "error", message: requestError.message });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className={expanded ? "drive-attachments is-expanded" : "drive-attachments"} aria-label="Google Drive files">
      <header className="drive-attachments__header">
        <button className="drive-attachments__toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          <span className="drive-attachments__mark"><Paperclip size={15} /></span>
          <span><strong>Files</strong><small>{attachments.length ? `${attachments.length} linked` : "Stored in your Drive"}</small></span>
          <ChevronDown className="drive-attachments__chevron" size={15} />
        </button>
        <span className="drive-attachments__privacy"><Cloud size={14} /> Google Drive</span>
        <button className="button button--secondary button--small" type="button" disabled={choosing || pickerPreparing} onClick={addFromDrive}>
          {choosing || pickerPreparing ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
          {pickerPreparing ? "Preparing…" : choosing ? "Opening…" : "Add files"}
        </button>
      </header>

      {expanded && (
        <div className="drive-attachments__body">
          {loading ? (
            <div className="drive-attachments__state"><LoaderCircle className="spin" size={16} /> Loading file links…</div>
          ) : error && !attachments.length ? (
            <div className="drive-attachments__state drive-attachments__state--error">
              <span>{error}</span>
              <button type="button" onClick={load}><RefreshCw size={14} /> Retry</button>
            </div>
          ) : attachments.length ? (
            <div className="drive-file-list">
              {attachments.map((attachment) => {
                const FileIcon = icons[fileKind(attachment.mimeType)] || File;
                const removing = removingId === attachment.id;
                return (
                  <article className="drive-file" key={attachment.id}>
                    <span className="drive-file__icon"><FileIcon size={18} /></span>
                    <span className="drive-file__copy"><strong title={attachment.fileName}>{attachment.fileName}</strong><small>{formatFileSize(attachment.sizeBytes)}</small></span>
                    <a className="drive-file__action" href={attachment.driveUrl} target="_blank" rel="noreferrer" aria-label={`Open ${attachment.fileName} in Google Drive`} title="Open in Google Drive"><ExternalLink size={16} /></a>
                    <button className="drive-file__action drive-file__action--remove" type="button" disabled={removing} onClick={() => detach(attachment)} aria-label={`Unlink ${attachment.fileName}`} title="Remove link only">
                      {removing ? <LoaderCircle className="spin" size={16} /> : <Link2Off size={16} />}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="drive-attachments__empty"><Cloud size={17} /><span><strong>Keep the file in Drive, keep the context here.</strong> Upload a new file or choose one you already have.</span></div>
          )}
          {error && attachments.length > 0 && <p className="drive-attachments__inline-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
