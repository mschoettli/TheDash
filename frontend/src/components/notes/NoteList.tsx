import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Note, useCreateNote, useDeleteNote } from "../../hooks/useNotes";

interface Props {
  notes: Note[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function NoteList({ notes, selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("notes.title")}
        </span>
        <button
          onClick={() =>
            createNote.mutate(undefined, {
              onSuccess: (note) => onSelect(note.id),
            })
          }
          disabled={createNote.isPending}
          className="p-1 rounded text-slate-400 hover:text-indigo-500 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {notes.length === 0 && (
          <div className="px-4 py-6 text-xs text-slate-400 text-center">
            {t("notes.no_notes")}
          </div>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
              selectedId === note.id
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
            }`}
            onClick={() => onSelect(note.id)}
          >
            <span className="flex-1 text-sm truncate">{note.title || t("notes.untitled")}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNote.mutate(note.id, {
                  onSuccess: () => {
                    if (selectedId === note.id) onSelect(-1);
                  },
                });
              }}
              disabled={deleteNote.isPending}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
