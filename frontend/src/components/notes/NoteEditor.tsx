import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import MDEditor from "@uiw/react-md-editor";
import { AlertCircle, Archive, CheckCircle2, Code, Eye, Heading2, ListChecks, Loader2, Pin, RotateCcw, Table2 } from "lucide-react";
import { Note, useUpdateNote } from "../../hooks/useNotes";
import { useSettingsStore } from "../../store/useSettingsStore";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  note: Note;
}

export default function NoteEditor({ note }: Props) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<{ title: string; content: string } | null>(
    null
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSaveState("idle");
    setLastPayload(null);
  }, [note.id, note.title, note.content]);

  async function persist(target: { title: string; content: string }) {
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
    debounceTimer.current = setTimeout(() => {
      void persist({ title: newTitle, content: newContent });
    }, 800);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleUpdate(val, content);
  };

  const handleContentChange = (val: string | undefined) => {
    const newContent = val ?? "";
    setContent(newContent);
    scheduleUpdate(title, newContent);
  };

  const insertMarkdown = (snippet: string) => {
    const nextContent = content ? `${content}\n${snippet}` : snippet;
    setContent(nextContent);
    scheduleUpdate(title, nextContent);
  };

  const saveLabel =
    saveState === "saving"
      ? t("notes.saving")
      : saveState === "saved"
      ? t("notes.saved")
      : saveState === "error"
      ? t("notes.save_error")
      : t("notes.autosave");

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-950">
      <div className="space-y-3 border-b border-slate-800 px-6 py-4">
        <input
          className="w-full bg-transparent text-2xl font-semibold text-slate-100 focus:outline-none placeholder:text-slate-600"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("notes.untitled")}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {saveState === "saving" && <Loader2 size={13} className="animate-spin" />}
          {saveState === "saved" && <CheckCircle2 size={13} className="text-emerald-500" />}
          {saveState === "error" && <AlertCircle size={13} className="text-rose-500" />}
          <span>{saveLabel}</span>
          {lastSavedAt && saveState !== "saving" && (
            <span className="text-slate-400">
              · {new Date(lastSavedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          {saveState === "error" && lastPayload && (
            <button
              onClick={() => void persist(lastPayload)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <RotateCcw size={12} /> {t("notes.retry")}
            </button>
          )}
          <span className="ml-auto flex items-center gap-1">
            <button onClick={() => updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned })} className={`rounded-lg border border-slate-800 px-2 py-1 ${note.is_pinned ? "text-cyan-300" : "text-slate-500"}`}><Pin size={13} /></button>
            <button onClick={() => updateNote.mutate({ id: note.id, is_archived: !note.is_archived })} className={`rounded-lg border border-slate-800 px-2 py-1 ${note.is_archived ? "text-amber-300" : "text-slate-500"}`}><Archive size={13} /></button>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => insertMarkdown("## Heading")} className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-cyan-300"><Heading2 size={13} /> Heading</button>
          <button onClick={() => insertMarkdown("- [ ] Task")} className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-cyan-300"><ListChecks size={13} /> Task</button>
          <button onClick={() => insertMarkdown("```\\ncode\\n```")} className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-cyan-300"><Code size={13} /> Code</button>
          <button onClick={() => insertMarkdown("| Column | Value |\\n| --- | --- |\\n| Item | Detail |")} className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-cyan-300"><Table2 size={13} /> Table</button>
          <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200"><Eye size={13} /> Live Preview</span>
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
