import { apiRequest } from "./client";

export const noteAttachmentApi = {
  list(noteId) {
    return apiRequest(`/notes/${encodeURIComponent(noteId)}/attachments`);
  },
  attach(noteId, file) {
    return apiRequest(`/notes/${encodeURIComponent(noteId)}/attachments`, {
      method: "POST",
      body: JSON.stringify(file),
    });
  },
  detach(noteId, attachmentId) {
    return apiRequest(`/notes/${encodeURIComponent(noteId)}/attachments/${encodeURIComponent(attachmentId)}`, {
      method: "DELETE",
    });
  },
};
