import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { configureAccessTokenProvider } from "./api/client";
import AppShell from "./components/AppShell";
import LoginScreen from "./components/LoginScreen";
import { ErrorState, LoadingState } from "./components/PageState";
import Toast from "./components/Toast";
import { auth, googleProvider, signInWithPopup, signOut } from "./config/firebase";
import { useNotesManager } from "./hooks/useNotesManager";
import { displayTitle } from "./lib/notes";
import ArchivePage from "./pages/ArchivePage";
import LibraryPage from "./pages/LibraryPage";
import NotesWorkbench from "./pages/NotesWorkbench";

function loginMessage(error) {
  const code = error?.code || "";
  if (code === "auth/popup-closed-by-user") return "Sign-in was closed before it finished. Try again when you are ready.";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in window. Allow pop-ups for Mira and try again.";
  if (code === "auth/network-request-failed") return "Could not reach Google authentication. Check your connection and try again.";
  return "Could not sign you in right now. Please try again.";
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        configureAccessTokenProvider(async () => currentUser.getIdToken());
      } else {
        configureAccessTokenProvider(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function handleLogin() {
    setAuthError("");
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(loginMessage(err));
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  }

  const manager = useNotesManager(user);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const showError = useCallback((error) => setToast({ tone: "error", message: error?.message || "The note could not be saved." }), []);

  async function createNote() {
    try {
      const created = await manager.actions.createNote();
      if (created) navigate("/");
    } catch (error) { showError(error); }
  }

  async function updateMetadata(note, patch) {
    try { await manager.actions.updateMetadata(note, patch); }
    catch (error) { showError(error); }
  }

  async function changeStatus(note, status) {
    try {
      await manager.actions.changeStatus(note, status);
      const messages = { ACTIVE: "Note restored.", ARCHIVED: "Note archived.", TRASHED: "Note moved to trash." };
      setToast({ tone: "success", message: messages[status] });
      return true;
    } catch (error) { showError(error); return false; }
  }

  async function deletePermanently(id) {
    try {
      await manager.actions.deletePermanently(id);
      setToast({ tone: "success", message: "Note permanently deleted." });
      return true;
    } catch (error) { showError(error); return false; }
  }

  function explore(filter) { setLibraryFilter(filter); navigate("/"); }
  function openNote(id) { manager.selectNote(id); navigate("/"); }
  function openLinked(title) {
    const linked = manager.notes.find((note) => note.status === "ACTIVE" && displayTitle(note).toLocaleLowerCase() === title.toLocaleLowerCase());
    if (linked) openNote(linked.id);
    else setToast({ tone: "error", message: `No active note named “${title}”.` });
  }

  if (authLoading) {
    return <LoadingState />;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} error={authError} loading={signingIn} />;
  }

  const workbenchProps = {
    notes: manager.notes,
    selectedNote: manager.selectedNote,
    selectedId: manager.selectedId,
    saveState: manager.saveStates[manager.selectedId] || "Saved",
    initialFilter: libraryFilter,
    onFilterUsed: () => setLibraryFilter(""),
    onAdd: createNote,
    onSelect: manager.selectNote,
    onBack: () => manager.selectNote(null),
    onChange: (id, patch) => manager.actions.updateDraft(id, patch, showError),
    onFlush: (id) => manager.actions.flushDraft(id, showError),
    onMetadata: updateMetadata,
    onStatus: changeStatus,
    onOpenLinked: openLinked,
    onNotify: setToast,
  };

  let content;
  if (!manager.ready && manager.loading) content = <LoadingState />;
  else if (!manager.ready && manager.loadError) content = <ErrorState message={manager.loadError} onRetry={manager.retry} />;
  else content = <Routes><Route path="/" element={<NotesWorkbench {...workbenchProps} />} /><Route path="/library" element={<LibraryPage notes={manager.notes} onExplore={explore} onOpen={openNote} />} /><Route path="/archive" element={<ArchivePage notes={manager.notes} saveStates={manager.saveStates} deletingId={manager.deletingId} onStatus={changeStatus} onDelete={deletePermanently} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;

  return (
    <>
      <AppShell user={user} onSignOut={handleSignOut} loading={manager.loading} creating={manager.creating} onAdd={createNote}>
        {content}
      </AppShell>
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
