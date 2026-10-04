import FloatingAssistant from "./components/FloatingAssistant";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { configureAccessTokenProvider } from "./api/client";
import AppShell from "./components/AppShell";
import DomainIntelligenceDialog from "./components/DomainIntelligenceDialog";
import AiNoteCaptureModal from "./components/AiNoteCaptureModal";
import AiMemorySearchDialog from "./components/AiMemorySearchDialog";
import LoginScreen from "./components/LoginScreen";
import { ErrorState, LoadingState } from "./components/PageState";
import Toast from "./components/Toast";
import { auth, googleProvider, signInWithPopup, signOut } from "./config/firebase";
import { useNotesManager } from "./hooks/useNotesManager";
import { noteApi } from "./api/notes";
import { indiaDateKey } from "./lib/intelligence";
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
  const location = useLocation();
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
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const closeToast = useCallback(() => setToast(null), []);
  const showError = useCallback((error) => setToast({ tone: "error", message: error?.message || "The note could not be saved." }), []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAiSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("note");
    if (id && manager.ready) manager.selectNote(Number(id));
  }, [location.search, manager.ready, manager.selectNote]);

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
      <AppShell
        user={user}
        onSignOut={handleSignOut}
        loading={manager.loading}
        creating={manager.creating}
        onAdd={createNote}
        onOpenIntelligence={() => setIntelligenceOpen(true)}
        onOpenAiCapture={() => setAiCaptureOpen(true)}
        onOpenAiSearch={() => setAiSearchOpen(true)}
      >
        {content}
      </AppShell>
      <DomainIntelligenceDialog domain="notes" userId={user.uid} revision={manager.notes} open={intelligenceOpen} title="Notes intelligence" description="Review unfinished checklists, stale notes and organization gaps without exposing note text in the summary." date={indiaDateKey()} load={noteApi.analyze} refresh={noteApi.refreshAnalysis} onClose={() => setIntelligenceOpen(false)} />
      <AiNoteCaptureModal
        onManual={() => { setAiCaptureOpen(false); void createNote(); }}
        key={user.uid}
        open={aiCaptureOpen}
        onClose={() => setAiCaptureOpen(false)}
        onSuccess={(msg) => {
          manager.retry();
          setToast({ tone: "success", message: msg });
        }}
      />
      <AiMemorySearchDialog
        open={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        onSelectNote={(noteId) => openNote(noteId)}
      />
      <FloatingAssistant domain={"notes"} userId={user.uid} date={indiaDateKey()} />
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
