import { useEffect, useMemo, useState } from "react";
import { Archive, BarChart3, Clock, FileText, Folder, Inbox, Pin, Plus, Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Note, useCreateNote, useNoteFolders, useNotes } from "../hooks/useNotes";
import NoteList, { NoteScope } from "../components/notes/NoteList";
import NoteEditor from "../components/notes/NoteEditor";

function DashboardTile({
  icon: Icon,
  label,
  value,
  description,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-line/60 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
          <Icon size={18} />
        </span>
        <span className="text-2xl font-semibold tabular-nums text-t1">{value}</span>
      </div>
      <div className="text-[14px] font-semibold text-t1">{label}</div>
      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-t3">{description}</div>
    </button>
  );
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
  const pinned = notes.filter((note) => note.is_pinned && !note.is_archived);
  const archived = notes.filter((note) => note.is_archived);
  const unfiled = notes.filter((note) => note.folder_id === null && !note.is_archived);
  const recent = [...notes].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
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
              <DashboardTile icon={FileText} label={t("notes.stat_notes")} value={notes.length} description={t("notes.tile_all_desc")} onClick={() => setSelectedScope("all")} />
              <DashboardTile icon={Folder} label={t("notes.folders")} value={folders.length} description={t("notes.tile_folders_desc")} />
              <DashboardTile icon={Pin} label={t("notes.stat_pinned")} value={pinned.length} description={t("notes.tile_pinned_desc")} onClick={() => setSelectedScope("pinned")} />
              <DashboardTile icon={BarChart3} label={t("notes.stat_todos")} value={openTasks} description={t("notes.tile_todos_desc")} />
              <DashboardTile icon={Inbox} label={t("notes.unfiled")} value={unfiled.length} description={t("notes.tile_unfiled_desc")} onClick={() => setSelectedScope("unfiled")} />
              <DashboardTile icon={Archive} label={t("notes.archive")} value={archived.length} description={t("notes.tile_archive_desc")} onClick={() => setSelectedScope("archived")} />
              <DashboardTile icon={Tags} label={t("notes.stat_tags")} value={allTags.size} description={t("notes.tile_tags_desc")} />
              <DashboardTile icon={Clock} label={t("notes.recent")} value={recent.length ? new Date(recent[0].updated_at).toLocaleDateString() : "-"} description={t("notes.tile_recent_desc")} />
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
                  {recent.slice(0, 6).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      className="block w-full rounded-lg border border-line/40 bg-surface px-3 py-2 text-left transition-colors hover:border-accent/30"
                    >
                      <div className="text-[13px] text-t1">{note.title || t("notes.untitled")}</div>
                      <div className="mt-0.5 text-[11px] text-t3">{new Date(note.updated_at).toLocaleString()}</div>
                    </button>
                  ))}
                  {!recent.length && <p className="text-[13px] text-t3">{t("notes.no_notes")}</p>}
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-line/60 bg-card p-4">
              <div className="label-xs mb-3 flex items-center gap-1.5"><Folder size={10} /> {t("notes.folders")}</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {folders.map((folder) => {
                  const count = notes.filter((note) => note.folder_id === folder.id && !note.is_archived).length;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedScope(folder.id)}
                      className="rounded-xl border border-line/50 bg-surface p-3 text-left transition-colors hover:border-accent/35"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-[13px] font-semibold text-t1">{folder.title}</div>
                        <div className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">{count}</div>
                      </div>
                      <div className="mt-1 text-[11px] text-t3">{t("notes.folder_tile_desc")}</div>
                    </button>
                  );
                })}
                {!folders.length && <p className="text-[13px] text-t3">{t("notes.no_folders")}</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
