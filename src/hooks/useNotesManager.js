import { useCallback, useEffect, useRef, useState } from "react";
import { noteApi } from "../api/notes";
import { notePayload } from "../lib/notes";

const blankNote = {
  title: "",
  content: "",
  notebook: "Personal",
  tags: [],
  status: "ACTIVE",
  pinned: false,
  starred: false,
};

export function useNotesManager(user = null) {
  const uid = user?.uid || null;
  const activeUser = useRef(uid);
  activeUser.current = uid;
  const requestSequence = useRef(0);
  const notesRef = useRef([]);
  const timers = useRef(new Map());
  const versions = useRef(new Map());
  const queues = useRef(new Map());
  const serverRevisions = useRef(new Map());
  const conflicts = useRef(new Set());
  const unsaved = useRef(new Set());
  const creationLock = useRef(false);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saveStates, setSaveStates] = useState({});
  const [loading, setLoading] = useState(Boolean(user));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const replaceNotes = useCallback((next) => {
    notesRef.current = next;
    setNotes(next);
  }, []);

  const mergeNote = useCallback((note) => {
    replaceNotes(notesRef.current.map((item) => item.id === note.id ? note : item));
  }, [replaceNotes]);

  const enqueue = useCallback((id, operation) => {
    const owner = uid;
    const previous = queues.current.get(id) || Promise.resolve();
    const queued = previous.catch(() => undefined).then(() => {
      if (!owner || activeUser.current !== owner) throw new Error("The signed-in account changed.");
      return operation();
    });
    queues.current.set(id, queued);
    const clean = () => { if (queues.current.get(id) === queued) queues.current.delete(id); };
    queued.then(clean, clean);
    return queued;
  }, [uid]);

  const persistSnapshot = useCallback(async (note, version) => {
    const owner = uid;
    try {
      const saved = await enqueue(note.id, async () => {
        if (conflicts.current.has(note.id)) throw new Error("This note changed elsewhere. Copy your draft before reloading.");
        const saved = await noteApi.update(note.id, { ...notePayload(note), expectedUpdatedAt: serverRevisions.current.get(note.id) || note.updatedAt });
        if (activeUser.current === uid) serverRevisions.current.set(note.id, saved.updatedAt);
        return saved;
      });
      if (activeUser.current !== owner) return false;
      if (versions.current.get(note.id) === version) {
        unsaved.current.delete(note.id);
        mergeNote(saved);
        setSaveStates((current) => ({ ...current, [note.id]: "Saved" }));
      }
      return true;
    } catch (error) {
      if (activeUser.current !== uid) throw error;
      if (error.status === 409) conflicts.current.add(note.id);
      if (versions.current.get(note.id) === version) {
        setSaveStates((current) => ({ ...current, [note.id]: "Save failed" }));
      }
      throw error;
    }
  }, [enqueue, mergeNote, uid]);

  const load = useCallback(async () => {
    if (!user) {
      replaceNotes([]);
      setReady(false);
      setLoading(false);
      return;
    }
    if (!uid) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const result = await noteApi.list();
      if (requestId !== requestSequence.current || activeUser.current !== uid) return;
      const loaded = Array.isArray(result) ? result : [];
      loaded.forEach(note => { if (!(conflicts.current.has(note.id) || unsaved.current.has(note.id))) serverRevisions.current.set(note.id, note.updatedAt); });
      replaceNotes(loaded.map(note => (conflicts.current.has(note.id) || unsaved.current.has(note.id)) ? notesRef.current.find(item => item.id === note.id) || note : note).concat(notesRef.current.filter(item => unsaved.current.has(item.id) && !loaded.some(saved => saved.id === item.id))));
      setReady(true);
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setSelectedId((current) => current || loaded.find((note) => note.status === "ACTIVE")?.id || null);
      }
    } catch (error) {
      if (requestId === requestSequence.current && activeUser.current === uid) setLoadError(error.message);
    } finally {
      if (requestId === requestSequence.current && activeUser.current === uid) setLoading(false);
    }
  }, [uid, replaceNotes]);

  useEffect(() => {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current.clear(); queues.current.clear(); versions.current.clear();
    serverRevisions.current.clear(); conflicts.current.clear(); unsaved.current.clear();
    replaceNotes([]);
    setSaveStates({});
    setReady(false);
    if (!user) {
      replaceNotes([]);
      setReady(false);
      setLoading(false);
      return;
    }
    load();
    return () => {
      requestSequence.current += 1;
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, [uid, load, replaceNotes]);

  useEffect(() => {
    if (!user) return undefined;
    const sync = () => {
      if (document.visibilityState === "visible" && timers.current.size === 0 && queues.current.size === 0 && unsaved.current.size === 0) void load();
    };
    const timer = window.setInterval(sync, 30000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [uid, load]);

  const updateDraft = useCallback((id, patch, onError) => {
    const current = notesRef.current.find((note) => note.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    unsaved.current.add(id);
    mergeNote(next);
    const version = (versions.current.get(id) || 0) + 1;
    versions.current.set(id, version);
    setSaveStates((states) => ({ ...states, [id]: "Saving" }));
    window.clearTimeout(timers.current.get(id));
    timers.current.set(id, window.setTimeout(() => {
      timers.current.delete(id);
      persistSnapshot(next, version).catch(onError);
    }, 700));
  }, [mergeNote, persistSnapshot]);

  const flushDraft = useCallback((id, onError) => {
    if (!timers.current.has(id) && !unsaved.current.has(id)) return;
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    const current = notesRef.current.find((note) => note.id === id);
    if (current) persistSnapshot(current, versions.current.get(id)).catch(onError);
  }, [persistSnapshot]);

  const createNote = useCallback(async () => {
    if (creationLock.current) return null;
    creationLock.current = true;
    setCreating(true);
    try {
      const created = await noteApi.create(blankNote);
      if (activeUser.current !== uid) return null;
      replaceNotes([created, ...notesRef.current]);
      serverRevisions.current.set(created.id, created.updatedAt);
      versions.current.set(created.id, 0);
      setSaveStates((current) => ({ ...current, [created.id]: "Saved" }));
      setSelectedId(created.id);
      return created;
    } finally {
      creationLock.current = false;
      setCreating(false);
    }
  }, [replaceNotes, uid]);

  const updateMetadata = useCallback(async (note, patch) => {
    const current = notesRef.current.find((item) => item.id === note.id);
    if (!current) return false;
    window.clearTimeout(timers.current.get(note.id));
    timers.current.delete(note.id);
    const next = { ...current, ...patch };
    const version = (versions.current.get(note.id) || 0) + 1;
    versions.current.set(note.id, version);
    unsaved.current.add(note.id);
    mergeNote(next);
    setSaveStates((states) => ({ ...states, [note.id]: "Saving" }));
    try {
      const saved = await enqueue(note.id, async () => {
        if (conflicts.current.has(note.id)) throw new Error("This note changed elsewhere. Copy your draft before reloading.");
        const saved = await noteApi.update(note.id, { ...notePayload(next), expectedUpdatedAt: serverRevisions.current.get(note.id) || current.updatedAt });
        if (activeUser.current === uid) serverRevisions.current.set(note.id, saved.updatedAt);
        return saved;
      });
      if (activeUser.current !== uid) return false;
      if (versions.current.get(note.id) === version) {
        unsaved.current.delete(note.id);
        mergeNote(saved);
        setSaveStates((states) => ({ ...states, [note.id]: "Saved" }));
      }
      return true;
    } catch (error) {
      if (activeUser.current !== uid) throw error;
      if (error.status === 409) conflicts.current.add(note.id);
      if (versions.current.get(note.id) === version) {
        // Keep the current draft available to copy or retry after a failed write.
        unsaved.current.add(note.id);
        setSaveStates((states) => ({ ...states, [note.id]: "Save failed" }));
      }
      throw error;
    }
  }, [enqueue, mergeNote, uid]);

  const changeStatus = useCallback(async (note, status) => {
    const current = notesRef.current.find((item) => item.id === note.id);
    if (!current) return false;
    const hadPendingDraft = unsaved.current.has(note.id);
    window.clearTimeout(timers.current.get(note.id));
    timers.current.delete(note.id);
    const next = { ...current, status };
    const version = (versions.current.get(note.id) || 0) + 1;
    versions.current.set(note.id, version);
    mergeNote(next);
    setSaveStates((states) => ({ ...states, [note.id]: "Saving" }));
    try {
      const saved = await enqueue(note.id, async () => {
        if (conflicts.current.has(note.id)) throw new Error('Copy your draft and reload before changing this note.');
        if (hadPendingDraft) { const saved = await noteApi.update(note.id, { ...notePayload(current), expectedUpdatedAt: serverRevisions.current.get(note.id) || current.updatedAt }); serverRevisions.current.set(note.id, saved.updatedAt); }
        const saved = await noteApi.updateStatus(note.id, status);
        if (activeUser.current === uid) serverRevisions.current.set(note.id, saved.updatedAt);
        return saved;
      });
      if (activeUser.current !== uid) return false;
      if (versions.current.get(note.id) === version) {
        unsaved.current.delete(note.id);
        mergeNote(saved);
        setSaveStates((states) => ({ ...states, [note.id]: "Saved" }));
        if (status !== "ACTIVE") setSelectedId((selected) => selected === note.id ? null : selected);
      }
      return true;
    } catch (error) {
      if (activeUser.current !== uid) throw error;
      if (error.status === 409) conflicts.current.add(note.id);
      if (versions.current.get(note.id) === version) {
        // Keep the current draft available to copy or retry after a failed write.
        unsaved.current.add(note.id);
        setSaveStates((states) => ({ ...states, [note.id]: "Save failed" }));
      }
      throw error;
    }
  }, [enqueue, mergeNote, uid]);

  const deletePermanently = useCallback(async (id) => {
    const owner = uid;
    window.clearTimeout(timers.current.get(id)); timers.current.delete(id);
    versions.current.set(id, (versions.current.get(id) || 0) + 1);
    setDeletingId(id);
    try {
      await (queues.current.get(id) || Promise.resolve()).catch(() => undefined);
      if (activeUser.current !== owner) return;
      await noteApi.removePermanently(id);
      if (activeUser.current !== owner) return;
      unsaved.current.delete(id); conflicts.current.delete(id); serverRevisions.current.delete(id);
      replaceNotes(notesRef.current.filter((note) => note.id !== id));
      setSelectedId((selected) => selected === id ? null : selected);
    } finally {
      setDeletingId(null);
    }
  }, [replaceNotes, uid]);

  return {
    notes,
    selectedId,
    selectedNote: notes.find((note) => note.id === selectedId && note.status === "ACTIVE") || null,
    saveStates,
    loading,
    ready,
    loadError,
    creating,
    deletingId,
    selectNote: setSelectedId,
    retry: load,
    actions: { createNote, updateDraft, flushDraft, updateMetadata, changeStatus, deletePermanently },
  };
}
