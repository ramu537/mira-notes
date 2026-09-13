import { apiRequest } from "./client";

export const noteApi = {
  list() {
    return apiRequest("/notes");
  },
  create(note) {
    return apiRequest("/notes", { method: "POST", body: JSON.stringify(note) });
  },
  update(id, note) {
    return apiRequest(`/notes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(note) });
  },
  updateStatus(id, status) {
    return apiRequest(`/notes/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  removePermanently(id) {
    return apiRequest(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

