import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  Clock,
  FileText,
  Folder,
  Inbox,
  Pin,
  Plus,
  Search,
  Tags,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Note, useCreateNote, useNoteFolders, useNotes } from "../hooks/useNotes";
import NoteList, { NoteScope } from "../components/notes/NoteList";
import NoteEditor from "../components/notes/NoteEditor";

// Strip Markdown syntax for a clean preview snippet
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")         // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // bold
    .replace(/\*([^*]+)\*/g, "$1")        // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "")   // code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[[^\]]*\]\([^)]*\)/g, "$1") // links
    .replace(/^[-*+]\s+/gm, "")           // list bullets
    .replace(/^>\s+/gm, "")               // blockquotes
    .replace(/^-{3,}$/gm, "")             // horizontal rules
    .replace(/- \[[ x]\] /g, "")          // checkboxes
    .replace(/\n{2,}/g, " ")              // collapse blank lines
    .replace(/\n/g, " ")                  // collapse newlines
    .trim();
}

// Compact stat chip used in the overview header strip
function StatChip({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-line/60 bg-card text-t2 hover:border-accent/25"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-accent/15" : "bg-line/20"
        }`}
      >
        <Icon size={14} className={active ? "text-accent" : "text-t3"} />
      </span>
      <div>
        <div className="text-[16px] font-bold tabular-nums leading-none text-t1">{value}</div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-t3">{label}</div>
      </div>
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
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId !== null && !notes.some((n) => n.id === selectedId)) setSelectedId(null);
  }, [notes, selectedId]);

  const selectedNote = notes.find((n) => n.id === selectedId);
  const selectedFolder = selectedNote?.folder_id
    ? folders.find((f) => f.id === selectedNote.folder_id) ?? null
    : null;

  const pinned = notes.filter((n) => n.is_pinned && !n.is_archived);
  const archived = notes.filter((n) => n.is_archived);
  const unfiled = notes.filter((n) => n.folder_id === null && !n.is_archived);
  const recent = [...notes].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const openTasks = useMemo(
    () => notes.reduce((total, n) => total + (n.content.match(/- \[ \]/g)?.length ?? 0), 0),
    [notes]
  );
  const allTags = useMemo(() => new Set(notes.flatMap((n) => n.tags)), [notes]);

  const feedNotes = useMemo(() => {
    return recent.filter((n) => {
      const tagMatch = activeTag ? n.tags.includes(activeTag) : true;
      const q = query.trim().toLowerCase();
      const searchMatch =
        !q || [n.title, n.content, ...n.tags].join(" ").toLowerCase().includes(q);
      return tagMatch && searchMatch && !n.is_archived;
    });
  }, [recent, activeTag, query]);

  const createQuickNote = () => {
    const content = quickNote.trim();
    if (!content) return;
    createNote.mutate(
      {
        title: content.slice(0, 60),
        content,
        folder_id: typeof selectedScope === "number" ? selectedScope : null,
      },
      {
        onSuccess: (note) => {
          setQuickNote("");
          setSelectedId(note.id);
        },
      }
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
            {/* Page header */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="label-xs mb-1">{t("notes.workspace")}</div>
                <h1 className="text-xl font-semibold text-t1">{t("notes.title")}</h1>
              </div>
            </div>

            {/* Quick Note — elevated above everything */}
            <div className="rounded-xl border border-accent/20 bg-card p-4">
              <div className="label-xs mb-2 flex items-center gap-1.5 text-accent/70">
                <Plus size={10} /> {t("notes.quick_note")}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      createQuickNote();
                    }
                  }}
                  placeholder={t("notes.quick_placeholder")}
                  rows={2}
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
              <div className="mt-1.5 text-[10px] text-t3">
                Ctrl+Enter to save
              </div>
            </div>

            {/* Compact stats strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              <StatChip
                icon={FileText}
                label={t("notes.stat_notes")}
                value={notes.filter((n) => !n.is_archived).length}
                onClick={() => setSelectedScope("all")}
              />
              <StatChip
                icon={Folder}
                label={t("notes.folders")}
                value={folders.length}
              />
              <StatChip
                icon={Pin}
                label={t("notes.stat_pinned")}
                value={pinned.length}
                onClick={() => setSelectedScope("pinned")}
              />
              <StatChip
                icon={BarChart3}
                label={t("notes.stat_todos")}
                value={openTasks}
              />
              <StatChip
                icon={Inbox}
                label={t("notes.unfiled")}
                value={unfiled.length}
                onClick={() => setSelectedScope("unfiled")}
              />
              <StatChip
                icon={Archive}
                label={t("notes.archive")}
                value={archived.length}
                onClick={() => setSelectedScope("archived")}
              />
              <StatChip
                icon={Tags}
                label={t("notes.stat_tags")}
                value={allTags.size}
              />
            </div>

            {/* Search + tag filter */}
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-line/60 bg-card px-3 py-2">
                <Search size={14} className="text-t3" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("notes.search")}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t3"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setActiveTag(null)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                    activeTag === null ? "bg-accent text-bg" : "border border-line bg-card text-t2 hover:border-accent/30"
                  }`}
                >
                  {t("bookmarks.all_tags")}
                </button>
                {Array.from(allTags).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                      activeTag === tag ? "bg-accent text-bg" : "border border-line bg-card text-t2 hover:border-accent/30"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes feed */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="label-xs flex items-center gap-1.5">
                  <FileText size={10} /> {t("notes.feed")}
                </div>
                <span className="text-[11px] text-t3">{feedNotes.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {feedNotes.map((note) => {
                  const folder = note.folder_id
                    ? folders.find((f) => f.id === note.folder_id)
                    : null;
                  const preview = stripMarkdown(note.content);
                  return (
                    <NoteCard
                      key={note.id}
                      note={note}
                      folder={folder?.title ?? null}
                      preview={preview}
                      onClick={() => setSelectedId(note.id)}
                      t={t}
                    />
                  );
                })}
                {!feedNotes.length && (
                  <div className="col-span-full py-10 text-center text-[13px] text-t3">
                    {t("notes.no_notes")}
                  </div>
                )}
              </div>
            </section>

            {/* Pinned + Recent row */}
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-line/60 bg-card p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5">
                  <Pin size={10} /> {t("notes.stat_pinned")}
                </div>
                <div className="space-y-1">
                  {pinned.slice(0, 6).map((n) => (
                    <NoteListRow
                      key={n.id}
                      note={n}
                      subtitle={null}
                      onClick={() => setSelectedId(n.id)}
                      t={t}
                    />
                  ))}
                  {!pinned.length && (
                    <p className="text-[13px] text-t3">{t("notes.no_pinned")}</p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-line/60 bg-card p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5">
                  <Clock size={10} /> {t("notes.recent")}
                </div>
                <div className="space-y-1">
                  {recent.slice(0, 6).map((n) => (
                    <NoteListRow
                      key={n.id}
                      note={n}
                      subtitle={new Date(n.updated_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      onClick={() => setSelectedId(n.id)}
                      t={t}
                    />
                  ))}
                  {!recent.length && (
                    <p className="text-[13px] text-t3">{t("notes.no_notes")}</p>
                  )}
                </div>
              </section>
            </div>

            {/* Folders grid */}
            {folders.length > 0 && (
              <section className="rounded-xl border border-line/60 bg-card p-4">
                <div className="label-xs mb-3 flex items-center gap-1.5">
                  <Folder size={10} /> {t("notes.folders")}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {folders.map((folder) => {
                    const count = notes.filter(
                      (n) => n.folder_id === folder.id && !n.is_archived
                    ).length;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setSelectedScope(folder.id)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line/50 bg-surface p-3 text-left transition-colors hover:border-accent/35"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder size={14} className="shrink-0 text-t3" />
                          <span className="truncate text-[13px] font-semibold text-t1">
                            {folder.title}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  folder,
  preview,
  onClick,
  t,
}: {
  note: Note;
  folder: string | null;
  preview: string;
  onClick: () => void;
  t: (key: string) => string;
}) {
  return (
    <button
      onClick={onClick}
      className="group min-h-[140px] rounded-2xl border border-line/60 bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-t1">
            {note.title || t("notes.untitled")}
          </div>
          <div className="mt-0.5 text-[11px] text-t3">
            {folder ?? t("notes.unfiled")} ·{" "}
            {new Date(note.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        {note.is_pinned && <Pin size={13} className="shrink-0 text-accent" />}
      </div>

      {preview ? (
        <p className="line-clamp-3 text-[12px] leading-5 text-t2">{preview}</p>
      ) : (
        <p className="text-[12px] italic text-t3">{t("notes.empty_preview")}</p>
      )}

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent/80"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="rounded-md px-1 py-0.5 text-[10px] text-t3">
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ── Simple list row (pinned / recent panels) ──────────────────────────────────
function NoteListRow({
  note,
  subtitle,
  onClick,
  t,
}: {
  note: Note;
  subtitle: string | null;
  onClick: () => void;
  t: (key: string) => string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-line/40 hover:bg-surface"
    >
      <FileText size={13} className="shrink-0 text-t3" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-t1">{note.title || t("notes.untitled")}</div>
        {subtitle && <div className="mt-0.5 text-[11px] text-t3">{subtitle}</div>}
      </div>
      {note.is_pinned && <Pin size={10} className="shrink-0 text-accent/60" />}
    </button>
  );
}
