import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, FileText, Pin, Plus, Tags } from "lucide-react";
import { useCreateNote, useNoteFolders, useNotes } from "../hooks/useNotes";
import NoteList from "../components/notes/NoteList";
import NoteEditor from "../components/notes/NoteEditor";

function DashboardCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300/70"><Icon size={14} /> {label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-100">{value}</div>
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
    if (selectedId !== null && !notes.some((note) => note.id === selectedId)) setSelectedId(null);
  }, [notes, selectedId]);

  const selectedNote = notes.find((note) => note.id === selectedId);
  const pinned = notes.filter((note) => note.is_pinned && !note.is_archived);
  const openTasks = useMemo(
    () => notes.reduce((total, note) => total + (note.content.match(/- \[ \]/g)?.length ?? 0), 0),
    [notes]
  );
  const allTags = new Set(notes.flatMap((note) => note.tags));

  const createQuickNote = () => {
    const content = quickNote.trim();
    if (!content) return;
    createNote.mutate(
      { title: content.slice(0, 48), content, folder_id: selectedFolderId },
      { onSuccess: (note) => { setQuickNote(""); setSelectedId(note.id); } }
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100">
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
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/70">Notes Dashboard</div>
              <h1 className="mt-2 text-3xl font-bold text-white">Arbeitsübersicht</h1>
              <p className="mt-2 text-sm text-slate-500">Schnelle Notizen, angepinnte Inhalte und offene Aufgaben.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <DashboardCard icon={FileText} label="Notizen" value={notes.length} />
              <DashboardCard icon={Pin} label="Angepinnt" value={pinned.length} />
              <DashboardCard icon={BarChart3} label="Offene Todos" value={openTasks} />
              <DashboardCard icon={Tags} label="Tags" value={allTags.size} />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><Plus size={16} /> Quick Note</div>
              <div className="flex gap-2">
                <textarea value={quickNote} onChange={(event) => setQuickNote(event.target.value)} placeholder="Gedanke, Aufgabe oder Markdown-Snippet..." rows={3} className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600" />
                <button onClick={createQuickNote} className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Speichern</button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><Pin size={16} /> Angepinnt</h2>
                <div className="space-y-2">
                  {pinned.slice(0, 6).map((note) => (
                    <button key={note.id} onClick={() => setSelectedId(note.id)} className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-sm text-slate-200 hover:border-cyan-400/40">{note.title}</button>
                  ))}
                  {!pinned.length && <p className="text-sm text-slate-500">Keine angepinnten Notizen.</p>}
                </div>
              </section>
              <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><Clock size={16} /> Zuletzt bearbeitet</h2>
                <div className="space-y-2">
                  {notes.slice(0, 6).map((note) => (
                    <button key={note.id} onClick={() => setSelectedId(note.id)} className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:border-cyan-400/40">
                      <div className="text-sm text-slate-200">{note.title}</div>
                      <div className="mt-1 text-xs text-slate-600">{new Date(note.updated_at).toLocaleString()}</div>
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
