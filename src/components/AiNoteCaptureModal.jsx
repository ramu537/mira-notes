import { useState, useRef } from "react";
import { Camera, Sparkles, X, Loader2, BookOpen } from "lucide-react";
import { captureApi } from "../api/captures";

export default function AiNoteCaptureModal({ open, onClose, onSuccess }) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  if (!open) return null;

  function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const combinedFiles = [...files, ...selectedFiles].slice(0, 3);
    setFiles(combinedFiles);

    const urls = combinedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  }

  function handleRemoveFile(index) {
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && files.length === 0) {
      setError("Please write note text or upload an image/document.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        content: content.trim() || "Note captured with image attachment",
        sourceType: files.length > 0 ? "IMAGE" : "TEXT",
        captureDate: new Date().toISOString().slice(0, 10),
        metadata: {
          targetDomain: "NOTE",
          autoOrganize: true,
        },
      };

      if (files.length > 0) {
        await captureApi.createWithImages(payload, files);
      } else {
        await captureApi.create(payload);
      }

      setContent("");
      setFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      onSuccess?.("Note captured! Gemini AI organized it into your notes.");
      onClose();
    } catch (err) {
      setError(err?.message || "Could not capture note with AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="dialog-card"
        style={{ maxWidth: "34rem", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-note-modal-title"
      >
        <header className="dialog-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--accent-strong, #3b82f6)", display: "flex", alignItems: "center" }}>
              <BookOpen size={22} />
            </span>
            <h2 id="ai-note-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              AI Note & Idea Capture
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
            Dump ideas, meeting notes, book takeaways, or snap book pages/whiteboards. Gemini AI extracts the key insights, generates a meaningful title, and tags the note.
          </p>

          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
              Note content or transcript
            </label>
            <textarea
              className="text-input"
              rows={4}
              placeholder="Jot down raw thoughts, outline, book quote, or discussion summary..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              style={{ width: "100%", resize: "vertical", borderRadius: "0.5rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
              Image or document page (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            {previewUrls.length > 0 ? (
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                {previewUrls.map((url, idx) => (
                  <div
                    key={url}
                    style={{
                      position: "relative",
                      width: "80px",
                      height: "80px",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      border: "1px solid var(--border-default, #e2e8f0)",
                    }}
                  >
                    <img src={url} alt="Attachment preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        borderRadius: "50%",
                        padding: 2,
                        border: "none",
                        cursor: "pointer",
                      }}
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {previewUrls.length < 3 && (
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "80px",
                      height: "80px",
                      border: "1px dashed var(--border-strong, #cbd5e1)",
                      borderRadius: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      fontSize: "0.75rem",
                    }}
                  >
                    <Camera size={18} />
                    <span>Add</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "1rem",
                  border: "1.5px dashed var(--border-strong, #cbd5e1)",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                <Camera size={18} />
                <span>Upload handwritten notes or book photo</span>
              </button>
            )}
          </div>

          {error && (
            <div style={{ color: "var(--danger, #ef4444)", fontSize: "0.875rem", background: "var(--danger-soft, #fee2e2)", padding: "0.625rem", borderRadius: "0.5rem" }}>
              {error}
            </div>
          )}

          <footer className="dialog-footer" style={{ marginTop: "0.5rem" }}>
            <button className="button button--ghost" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  <span>Synthesizing with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Create Note with Gemini</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
