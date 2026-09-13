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
  const requestSequence = useRef(0);
  const notesRef = useRef([]);
  const timers = useRef(new Map());
  const versions = useRef(new Map());
  const queues = useRef(new Map());
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
    const previous = queues.current.get(id) || Promise.resolve();
    const queued = previous.catch(() => undefined).then(operation);
    queues.current.set(id, queued);
    const clean = () => { if (queues.current.get(id) === queued) queues.current.delete(id); };
    queued.then(clean, clean);
    return queued;
  }, []);

  const persistSnapshot = useCallback(async (note, version) => {
    try {
      const saved = await enqueue(note.id, () => noteApi.update(note.id, notePayload(note)));
      if (versions.current.get(note.id) === version) {
        mergeNote(saved);
        setSaveStates((current) => ({ ...current, [note.id]: "Saved" }));
      }
      return true;
    } catch (error) {
      if (versions.current.get(note.id) === version) {
        setSaveStates((current) => ({ ...current, [note.id]: "Save failed" }));
      }
      throw error;
    }
  }, [enqueue, mergeNote]);

  const load = useCallback(async () => {
    if (!user) {
      replaceNotes([]);
      setReady(false);
      setLoading(false);
      return;
    }
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const result = await noteApi.list();
      if (requestId !== requestSequence.current) return;
      const loaded = Array.isArray(result) ? result : [];
      replaceNotes(loaded);
      setReady(true);
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setSelectedId((current) => current || loaded.find((note) => note.status === "ACTIVE")?.id || null);
      }
    } catch (error) {
      if (requestId === requestSequence.current) setLoadError(error.message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [user, replaceNotes]);

  useEffect(() => {
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
  }, [user, load, replaceNotes]);

  const updateDraft = useCallback((id, patch, onError) => {
    const current = notesRef.current.find((note) => note.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
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
    if (!timers.current.has(id)) return;
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
      replaceNotes([created, ...notesRef.current]);
      versions.current.set(created.id, 0);
      setSaveStates((current) => ({ ...current, [created.id]: "Saved" }));
      setSelectedId(created.id);
      return created;
    } finally {
      creationLock.current = false;
      setCreating(false);
    }
  }, [replaceNotes]);

  const updateMetadata = useCallback(async (note, patch) => {
    const current = notesRef.current.find((item) => item.id === note.id);
    if (!current) return false;
    window.clearTimeout(timers.current.get(note.id));
    timers.current.delete(note.id);
    const next = { ...current, ...patch };
    const version = (versions.current.get(note.id) || 0) + 1;
    versions.current.set(note.id, version);
    mergeNote(next);
    setSaveStates((states) => ({ ...states, [note.id]: "Saving" }));
    try {
      const saved = await enqueue(note.id, () => noteApi.update(note.id, notePayload(next)));
      if (versions.current.get(note.id) === version) {
        mergeNote(saved);
        setSaveStates((states) => ({ ...states, [note.id]: "Saved" }));
      }
      return true;
    } catch (error) {
      if (versions.current.get(note.id) === version) {
        mergeNote(current);
        setSaveStates((states) => ({ ...states, [note.id]: "Save failed" }));
      }
      throw error;
    }
  }, [enqueue, mergeNote]);

  const changeStatus = useCallback(async (note, status) => {
    const current = notesRef.current.find((item) => item.id === note.id);
    if (!current) return false;
    const hadPendingDraft = timers.current.has(note.id);
    window.clearTimeout(timers.current.get(note.id));
    timers.current.delete(note.id);
    const next = { ...current, status };
    const version = (versions.current.get(note.id) || 0) + 1;
    versions.current.set(note.id, version);
    mergeNote(next);
    setSaveStates((states) => ({ ...states, [note.id]: "Saving" }));
    try {
      const saved = await enqueue(note.id, async () => {
        if (hadPendingDraft) await noteApi.update(note.id, notePayload(current));
        return noteApi.updateStatus(note.id, status);
      });
      if (versions.current.get(note.id) === version) {
        mergeNote(saved);
        setSaveStates((states) => ({ ...states, [note.id]: "Saved" }));
        if (status !== "ACTIVE") setSelectedId((selected) => selected === note.id ? null : selected);
      }
      return true;
    } catch (error) {
      if (versions.current.get(note.id) === version) {
        mergeNote(current);
        setSaveStates((states) => ({ ...states, [note.id]: "Save failed" }));
      }
      throw error;
    }
  }, [enqueue, mergeNote]);

  const deletePermanently = useCallback(async (id) => {
    setDeletingId(id);
    try {
      await noteApi.removePermanently(id);
      replaceNotes(notesRef.current.filter((note) => note.id !== id));
      setSelectedId((selected) => selected === id ? null : selected);
    } finally {
      setDeletingId(null);
    }
  }, [replaceNotes]);

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
