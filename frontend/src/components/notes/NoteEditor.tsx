import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import MDEditor from "@uiw/react-md-editor";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
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

  const saveLabel =
    saveState === "saving"
      ? t("notes.saving")
      : saveState === "saved"
      ? t("notes.saved")
      : saveState === "error"
      ? t("notes.save_error")
      : t("notes.autosave");

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
        <input
          className="w-full text-lg font-semibold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("notes.untitled")}
        />
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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