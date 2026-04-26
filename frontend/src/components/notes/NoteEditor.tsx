import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import MDEditor from "@uiw/react-md-editor";
import { AlertCircle, Archive, CheckCircle2, Code, Eye, Heading2, ListChecks, Loader2, Pin, RotateCcw, Sparkles, Table2, Tags } from "lucide-react";
import { fetchNoteTagSuggestions, Note, NoteFolder, useUpdateNote } from "../../hooks/useNotes";
import { useSettingsStore } from "../../store/useSettingsStore";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  note: Note;
  folder: NoteFolder | null;
}

export default function NoteEditor({ note, folder }: Props) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState(note.tags.join(", "));
  const [tagLoading, setTagLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<{ title: string; content: string; tags?: string[] } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTagInput(note.tags.join(", "));
    setSaveState("idle");
    setLastPayload(null);
  }, [note.id, note.title, note.content, note.tags]);

  async function persist(target: { title: string; content: string; tags?: string[] }) {
    setSaveState("saving");
    setLastPayload(target);
    try {
      await updateNote.mutateAsync({ id: note.id, ...target });
      setSaveState("saved");
      setLastSavedAt(new Date().toISOString());
    } catch {
      setSaveState("error");
    }
  }

  const scheduleUpdate = (newTitle: string, newContent: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { void persist({ title: newTitle, content: newContent }); }, 800);
  };

  const handleTitleChange = (val: string) => { setTitle(val); scheduleUpdate(val, content); };
  const saveTitleNow = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    void persist({ title: title.trim() || t("notes.untitled"), content });
  };
  const handleContentChange = (val: string | undefined) => {
    const newContent = val ?? "";
    setContent(newContent);
    scheduleUpdate(title, newContent);
  };

  const saveTags = () => {
    const tags = tagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
    void persist({ title, content, tags });
  };

  const suggestTags = async () => {
    setTagLoading(true);
    try {
      const suggestions = await fetchNoteTagSuggestions({ title, content });
      const current = tagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
      setTagInput(Array.from(new Set([...current, ...suggestions.map((tag) => tag.name)]).values()).join(", "));
    } finally {
      setTagLoading(false);
    }
  };

  const insertMarkdown = (snippet: string) => {
    const next = content ? `${content}\n${snippet}` : snippet;
    setContent(next);
    scheduleUpdate(title, next);
  };

  const saveLabel =
    saveState === "saving" ? t("notes.saving") :
    saveState === "saved"  ? t("notes.saved")  :
    saveState === "error"  ? t("notes.save_error") :
                             t("notes.autosave");

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-bg">
      <div className="space-y-3 border-b border-line/60 px-5 py-4">
        <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-t3">
          <span>{folder?.title ?? t("notes.unfiled")}</span>
          <span>/</span>
          <span className="truncate text-accent">{title || t("notes.untitled")}</span>
        </div>
        <input
          className="w-full bg-transparent text-xl font-semibold text-t1 focus:outline-none placeholder:text-t3"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={saveTitleNow}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveTitleNow();
              event.currentTarget.blur();
            }
          }}
          placeholder={t("notes.untitled")}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-line/60 bg-card px-3 py-2">
            <Tags size={14} className="text-t3" />
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onBlur={saveTags}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveTags(); } }}
              placeholder={t("notes.tags_placeholder")}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t3"
            />
          </div>
          <button
            onClick={suggestTags}
            disabled={tagLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] font-medium text-accent disabled:opacity-50"
          >
            <Sparkles size={13} /> {tagLoading ? t("notes.suggesting_tags") : t("notes.ai_tags")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-t3">
          {saveState === "saving" && <Loader2 size={12} className="animate-spin" />}
          {saveState === "saved"  && <CheckCircle2 size={12} className="text-emerald-400" />}
          {saveState === "error"  && <AlertCircle size={12} className="text-rose-400" />}
          <span>{saveLabel}</span>
          {lastSavedAt && saveState !== "saving" && (
            <span className="text-t3">
              · {new Date(lastSavedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          {saveState === "error" && lastPayload && (
            <button
              onClick={() => void persist(lastPayload)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-line hover:bg-line/30"
            >
              <RotateCcw size={11} /> {t("notes.retry")}
            </button>
          )}

          <span className="ml-auto flex items-center gap-1">
            <button
              onClick={() => updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned })}
              className={`rounded-lg border border-line/50 px-2 py-1 transition-colors ${note.is_pinned ? "text-accent" : "text-t3 hover:text-t1"}`}
            >
              <Pin size={12} />
            </button>
            <button
              onClick={() => updateNote.mutate({ id: note.id, is_archived: !note.is_archived })}
              className={`rounded-lg border border-line/50 px-2 py-1 transition-colors ${note.is_archived ? "text-amber-400" : "text-t3 hover:text-t1"}`}
            >
              <Archive size={12} />
            </button>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Heading", icon: Heading2, snippet: "## Heading" },
            { label: "Task", icon: ListChecks, snippet: "- [ ] Task" },
            { label: "Code", icon: Code, snippet: "```\ncode\n```" },
            { label: "Table", icon: Table2, snippet: "| Column | Value |\n| --- | --- |\n| Item | Detail |" },
          ].map(({ label, icon: Icon, snippet }) => (
            <button
              key={label}
              onClick={() => insertMarkdown(snippet)}
              className="inline-flex items-center gap-1 rounded-lg border border-line/50 px-2 py-1 text-[11px] text-t3 hover:text-accent hover:border-accent/30 transition-colors"
            >
              <Icon size={12} /> {label}
            </button>
          ))}
          <span className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2 py-1 text-[11px] text-accent/80">
            <Eye size={12} /> Live Preview
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden" data-color-mode={theme}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          preview="live"
          style={{ height: "100%", borderRadius: 0, border: "none" }}
        />
      </div>
    </div>
  );
}
