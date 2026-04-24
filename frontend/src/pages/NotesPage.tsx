import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, FileText, Pin, Plus, Tags } from "lucide-react";
import { useCreateNote, useNoteFolders, useNotes } from "../hooks/useNotes";
import NoteList from "../components/notes/NoteList";
import NoteEditor from "../components/notes/NoteEditor";

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-card border border-line/60 p-4">
      <div className="label-xs mb-2 flex items-center gap-1.5"><Icon size={10} /> {label}</div>
      <div className="text-2xl font-semibold text-t1 tabular-nums">{value}</div>
    </div>
  );
}

export default function NotesPage() {
  const { data: notes = [] } = useNotes();
  const { data: folders = [] } = useNoteFolders();
  const createNote = useCreateNote();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [quickNote, setQuickNote] = useState("");

  useEffect(() => {
    if (selectedId !== null && !notes.some((n) => n.id === selectedId)) setSelectedId(null);
  }, [notes, selectedId]);

  const selectedNote = notes.find((n) => n.id === selectedId);
  const pinned = notes.filter((n) => n.is_pinned && !n.is_archived);
  const openTasks = useMemo(
    () => notes.reduce((total, n) => total + (n.content.match(/- \[ \]/g)?.length ?? 0), 0),
    [notes]
  );
  const allTags = new Set(notes.flatMap((n) => n.tags));

  const createQuickNote = () => {
    const content = quickNote.trim();
    if (!content) return;
    createNote.mutate(
      { title: content.slice(0, 48), content, folder_id: selectedFolderId },
      { onSuccess: (note) => { setQuickNote(""); setSelectedId(note.id); } }
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-line/60 bg-bg text-t1">
      <NoteList
        notes={notes}
        folders={folders}
        selectedId={selectedId}
        selectedFolderId={selectedFolderId}
        onSelect={(id) => setSelectedId(id === -1 ? null : id)}
        onSelectFolder={setSelectedFolderId}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedNote ? (
          <NoteEditor note={selectedNote} />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <div className="label-xs mb-1">Knowledge Base</div>
              <h1 className="text-xl font-semibold text-t1">Notizen</h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FileText} label="Notizen" value={notes.length} />
              <StatCard icon={Pin} label="Angepinnt" value={pinned.length} />
              <StatCard icon={BarChart3} label="Offene Todos" value={openTasks} />
              <StatCard icon={Tags} label="Tags" value={allTags.size} />
            </div>

            <div className="rounded-xl bg-card border border-line/60 p-4">
              <div className="label-xs mb-3 flex items-center gap-1.5"><Plus size={10} /> Quick Note</div>
              <div className="flex gap-2">
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Gedanke, Aufgabe oder Markdown-Snippet..."
                  rows={3}
                  className="min-w-0 flex-1 rounded-lg border border-line/60 bg-surface px-3 py-2 text-[13px] text-t1 outline-none placeholder:text-t3 focus:border-accent/50 resize-none"
                />
                <button
                  onClick={createQuickNote}
                  className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-bg hover:opacity-90 transition-opacity"
                >
                  Speichern
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl bg-card border border-line/60 p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5"><Pin size={10} /> Angepinnt</div>
                <div className="space-y-1">
                  {pinned.slice(0, 6).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      className="block w-full rounded-lg border border-line/40 bg-surface px-3 py-2 text-left text-[13px] text-t1 hover:border-accent/30 transition-colors"
                    >
                      {note.title}
                    </button>
                  ))}
                  {!pinned.length && <p className="text-[13px] text-t3">Keine angepinnten Notizen.</p>}
                </div>
              </section>

              <section className="rounded-xl bg-card border border-line/60 p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5"><Clock size={10} /> Zuletzt bearbeitet</div>
                <div className="space-y-1">
                  {notes.slice(0, 6).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      className="block w-full rounded-lg border border-line/40 bg-surface px-3 py-2 text-left hover:border-accent/30 transition-colors"
                    >
                      <div className="text-[13px] text-t1">{note.title}</div>
                      <div className="mt-0.5 text-[11px] text-t3">{new Date(note.updated_at).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
