import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

/**
 * Lightweight localStorage utils with safe JSON parsing.
 */
const STORAGE_KEYS = {
  NOTES: 'notes_app__notes',
};

// PUBLIC_INTERFACE
export function safeParseJSON(str, fallback) {
  /** Safely parse JSON; return fallback on error. */
  try {
    const parsed = JSON.parse(str);
    return parsed;
  } catch {
    return fallback;
  }
}

// PUBLIC_INTERFACE
export function loadNotes() {
  /** Load notes array from localStorage. */
  const raw = window.localStorage.getItem(STORAGE_KEYS.NOTES);
  const notes = safeParseJSON(raw, []);
  if (!Array.isArray(notes)) return [];
  return notes;
}

// PUBLIC_INTERFACE
export function saveNotes(notes) {
  /** Persist notes array to localStorage. */
  try {
    window.localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch {
    // noop
  }
}

/**
 * Note shape:
 * {
 *   id: string,
 *   title: string,
 *   body: string,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */

// PUBLIC_INTERFACE
function App() {
  /** The main Notes SPA component. */
  const [notes, setNotes] = useState(() => loadNotes());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Persist notes on changes
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // Derive filtered notes by title
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    return notes
      .filter((n) => n.title.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query]);

  // Selected note object
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  // Modal open helpers
  const openCreateModal = () => {
    setEditingId(null);
    setEditorTitle('');
    setEditorBody('');
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
    setEditingId(note.id);
    setEditorTitle(note.title);
    setEditorBody(note.body);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditorTitle('');
    setEditorBody('');
    setEditingId(null);
  };

  const handleCreateOrUpdate = () => {
    const title = editorTitle.trim() || 'Untitled';
    const body = editorBody;

    if (editingId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? { ...n, title, body, updatedAt: Date.now() }
            : n
        )
      );
      setSelectedId(editingId);
    } else {
      const id = cryptoRandomId();
      const now = Date.now();
      const newNote = {
        id,
        title,
        body,
        createdAt: now,
        updatedAt: now,
      };
      setNotes((prev) => [newNote, ...prev]);
      setSelectedId(id);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Keyboard handling within modal: Enter to save, Esc to cancel
  const onModalKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateOrUpdate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };

  return (
    <div className="notes-app" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header onAdd={openCreateModal} query={query} setQuery={setQuery} />
      <main className="layout">
        <aside className="sidebar" aria-label="Notes list">
          {filteredNotes.length === 0 ? (
            <div className="empty">
              <p>No notes found.</p>
              <button className="btn primary" onClick={openCreateModal}>Create your first note</button>
            </div>
          ) : (
            <ul className="note-list" role="list">
              {filteredNotes.map((n) => (
                <li
                  key={n.id}
                  className={`note-list-item ${n.id === selectedId ? 'active' : ''}`}
                >
                  <button
                    className="note-list-button"
                    onClick={() => setSelectedId(n.id)}
                    aria-pressed={n.id === selectedId}
                    aria-label={`Select note ${n.title}`}
                    title={n.title}
                  >
                    <span className="note-title">{n.title || 'Untitled'}</span>
                    <span className="note-updated">
                      {new Date(n.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  <div className="note-actions">
                    <button
                      className="icon-btn"
                      onClick={() => openEditModal(n)}
                      aria-label={`Edit ${n.title || 'Untitled'}`}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(n.id)}
                      aria-label={`Delete ${n.title || 'Untitled'}`}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="content" aria-label="Note details">
          {!selectedNote ? (
            <div className="placeholder">
              <h2>Welcome 👋</h2>
              <p>Select a note from the left or create a new one.</p>
              <button className="btn primary" onClick={openCreateModal}>New note</button>
            </div>
          ) : (
            <article className="note-view">
              <header className="note-view-header">
                <h2 className="note-view-title">{selectedNote.title || 'Untitled'}</h2>
                <div className="note-view-actions">
                  <button className="btn" onClick={() => openEditModal(selectedNote)}>Edit</button>
                  <button className="btn danger" onClick={() => handleDelete(selectedNote.id)}>Delete</button>
                </div>
              </header>
              <div className="note-meta">
                <span>Created: {new Date(selectedNote.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
              </div>
              <div className="note-body">
                {selectedNote.body ? (
                  <pre className="note-pre">{selectedNote.body}</pre>
                ) : (
                  <p className="muted">No content.</p>
                )}
              </div>
            </article>
          )}
        </section>
      </main>

      {isModalOpen && (
        <EditorModal
          titleValue={editorTitle}
          bodyValue={editorBody}
          setTitleValue={setEditorTitle}
          setBodyValue={setEditorBody}
          onCancel={closeModal}
          onSave={handleCreateOrUpdate}
          isEditing={Boolean(editingId)}
          onKeyDown={onModalKeyDown}
        />
      )}
    </div>
  );
}

function Header({ onAdd, query, setQuery }) {
  const searchRef = useRef(null);
  useEffect(() => {
    // focus search on load for quick filter
    searchRef.current?.focus();
  }, []);
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">📝</div>
        <div className="titles">
          <h1>Notes</h1>
          <span className="subtitle">Local. Fast. Private.</span>
        </div>
      </div>
      <div className="controls">
        <input
          ref={searchRef}
          type="search"
          className="search"
          placeholder="Search by title..."
          aria-label="Search notes by title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn success" onClick={onAdd} aria-label="Add new note">
          + New
        </button>
      </div>
    </header>
  );
}

function EditorModal({
  titleValue,
  bodyValue,
  setTitleValue,
  setBodyValue,
  onCancel,
  onSave,
  isEditing,
  onKeyDown,
}) {
  const titleRef = useRef(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={isEditing ? 'Edit note' : 'Create note'} onKeyDown={onKeyDown}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isEditing ? 'Edit note' : 'New note'}</h3>
        </div>
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Title</span>
            <input
              ref={titleRef}
              type="text"
              className="input"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Note title"
            />
          </label>
          <label className="field">
            <span className="field-label">Body</span>
            <textarea
              className="textarea"
              value={bodyValue}
              onChange={(e) => setBodyValue(e.target.value)}
              placeholder="Write your note..."
              rows={10}
            />
          </label>
          <p className="kbd-hint">
            Press Ctrl/Cmd+Enter to save • Esc to cancel
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onSave}>{isEditing ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utils
 */
function cryptoRandomId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default App;
