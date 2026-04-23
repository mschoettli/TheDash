import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotes } from "../hooks/useNotes";
import NoteList from "../components/notes/NoteList";
import NoteEditor from "../components/notes/NoteEditor";

export default function NotesPage() {
  const { t } = useTranslation();
  const { data: notes } = useNotes();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!notes?.length) {
      setSelectedId(null);
      return;
    }
    if (!notes.some((note) => note.id === selectedId)) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  const selectedNote = notes?.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full -m-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <NoteList
        notes={notes ?? []}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id === -1 ? null : id)}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800">
        {selectedNote ? (
          <NoteEditor note={selectedNote} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            {t("notes.no_notes")}
          </div>
        )}
      </div>
    </div>
  );
}
