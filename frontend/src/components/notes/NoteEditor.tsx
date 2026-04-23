import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import MDEditor from "@uiw/react-md-editor";
import { Note, useUpdateNote } from "../../hooks/useNotes";
import { useSettingsStore } from "../../store/useSettingsStore";

interface Props {
  note: Note;
}

export default function NoteEditor({ note }: Props) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id, note.title, note.content]);

  const scheduleUpdate = (newTitle: string, newContent: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateNote.mutate({ id: note.id, title: newTitle, content: newContent });
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
        <input
          className="w-full text-lg font-semibold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("notes.untitled")}
        />
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
