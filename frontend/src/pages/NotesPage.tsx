import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, FileText, Pin, Plus, Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Note, useCreateNote, useNoteFolders, useNotes } from "../hooks/useNotes";
import NoteList, { NoteScope } from "../components/notes/NoteList";
import NoteEditor from "../components/notes/NoteEditor";

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line/60 bg-card p-4">
      <div className="label-xs mb-2 flex items-center gap-1.5"><Icon size={10} /> {label}</div>
      <div className="text-2xl font-semibold tabular-nums text-t1">{value}</div>
    </div>
  );
}

function filterNotes(notes: Note[], scope: NoteScope): Note[] {
  if (scope === "all") return notes.filter((note) => !note.is_archived);
  if (scope === "unfiled") return notes.filter((note) => note.folder_id === null && !note.is_archived);
  if (scope === "pinned") return notes.filter((note) => note.is_pinned && !note.is_archived);
  if (scope === "archived") return notes.filter((note) => note.is_archived);
  return notes.filter((note) => note.folder_id === scope && !note.is_archived);
}

export default function NotesPage() {
  const { t } = useTranslation();
  const { data: notes = [] } = useNotes();
  const { data: folders = [] } = useNoteFolders();
  const createNote = useCreateNote();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedScope, setSelectedScope] = useState<NoteScope>("all");
  const [quickNote, setQuickNote] = useState("");

  useEffect(() => {
    if (selectedId !== null && !notes.some((note) => note.id === selectedId)) setSelectedId(null);
  }, [notes, selectedId]);

  const selectedNote = notes.find((note) => note.id === selectedId);
  const selectedFolder = selectedNote?.folder_id ? folders.find((folder) => folder.id === selectedNote.folder_id) ?? null : null;
  const scopedNotes = filterNotes(notes, selectedScope);
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
      { title: content.slice(0, 48), content, folder_id: typeof selectedScope === "number" ? selectedScope : null },
      { onSuccess: (note) => { setQuickNote(""); setSelectedId(note.id); } }
    );
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-line/60 bg-bg text-t1">
      <NoteList
        notes={notes}
        folders={folders}
        selectedId={selectedId}
        selectedScope={selectedScope}
        onSelect={setSelectedId}
        onSelectScope={(scope) => {
          setSelectedScope(scope);
          setSelectedId(null);
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedNote ? (
          <NoteEditor note={selectedNote} folder={selectedFolder} />
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <div>
              <div className="label-xs mb-1">{t("notes.workspace")}</div>
              <h1 className="text-xl font-semibold text-t1">{t("notes.title")}</h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FileText} label={t("notes.stat_notes")} value={notes.length} />
              <StatCard icon={Pin} label={t("notes.stat_pinned")} value={pinned.length} />
              <StatCard icon={BarChart3} label={t("notes.stat_todos")} value={openTasks} />
              <StatCard icon={Tags} label={t("notes.stat_tags")} value={allTags.size} />
            </div>

            <div className="rounded-xl border border-line/60 bg-card p-4">
              <div className="label-xs mb-3 flex items-center gap-1.5"><Plus size={10} /> {t("notes.quick_note")}</div>
              <div className="flex gap-2">
                <textarea
                  value={quickNote}
                  onChange={(event) => setQuickNote(event.target.value)}
                  placeholder={t("notes.quick_placeholder")}
                  rows={3}
                  className="min-w-0 flex-1 resize-none rounded-lg border border-line/60 bg-surface px-3 py-2 text-[13px] text-t1 outline-none placeholder:text-t3 focus:border-accent/50"
                />
                <button
                  onClick={createQuickNote}
                  disabled={!quickNote.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-line/60 bg-card p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5"><Pin size={10} /> {t("notes.stat_pinned")}</div>
                <div className="space-y-1">
                  {pinned.slice(0, 6).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      className="block w-full rounded-lg border border-line/40 bg-surface px-3 py-2 text-left text-[13px] text-t1 transition-colors hover:border-accent/30"
                    >
                      {note.title || t("notes.untitled")}
                    </button>
                  ))}
                  {!pinned.length && <p className="text-[13px] text-t3">{t("notes.no_pinned")}</p>}
                </div>
              </section>

              <section className="rounded-xl border border-line/60 bg-card p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5"><Clock size={10} /> {t("notes.recent")}</div>
                <div className="space-y-1">
                  {scopedNotes.slice(0, 6).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      className="block w-full rounded-lg border border-line/40 bg-surface px-3 py-2 text-left transition-colors hover:border-accent/30"
                    >
                      <div className="text-[13px] text-t1">{note.title || t("notes.untitled")}</div>
                      <div className="mt-0.5 text-[11px] text-t3">{new Date(note.updated_at).toLocaleString()}</div>
                    </button>
                  ))}
                  {!scopedNotes.length && <p className="text-[13px] text-t3">{t("notes.no_notes")}</p>}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
