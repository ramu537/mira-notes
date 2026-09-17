const DEFAULT_MIME_TYPE = "application/octet-stream";

function safeSize(value) {
  if (value === null || value === undefined || value === "") return null;
  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

export function normalizePickerDocuments(documents = []) {
  const unique = new Map();
  documents.forEach((document) => {
    const driveFileId = String(document?.id || "").trim();
    if (!/^[A-Za-z0-9_-]{10,255}$/.test(driveFileId)) return;
    unique.set(driveFileId, {
      driveFileId,
      fileName: String(document?.name || "Untitled file").trim().slice(0, 255) || "Untitled file",
      mimeType: String(document?.mimeType || DEFAULT_MIME_TYPE).trim().toLocaleLowerCase().slice(0, 255),
      sizeBytes: safeSize(document?.sizeBytes),
    });
  });
  return Array.from(unique.values());
}

export function fileKind(mimeType = "") {
  const type = mimeType.toLocaleLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) return "spreadsheet";
  if (type.includes("presentation") || type.includes("powerpoint")) return "presentation";
  if (type.includes("document") || type.includes("text") || type.includes("pdf") || type.includes("word")) return "document";
  return "file";
}

export function formatFileSize(value) {
  const bytes = safeSize(value);
  if (bytes === null) return "Google file";
  if (bytes < 1_000) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1_000;
  let unit = 0;
  while (size >= 1_000 && unit < units.length - 1) {
    size /= 1_000;
    unit += 1;
  }
  const precision = size >= 100 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unit]}`;
}
