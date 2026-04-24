import { Folder, FolderPlus, Plus, Trash2 } from "lucide-react";
import {
  Note,
  NoteFolder,
  useCreateNote,
  useCreateNoteFolder,
  useDeleteNote,
  useDeleteNoteFolder,
} from "../../hooks/useNotes";

interface Props {
  notes: Note[];
  folders: NoteFolder[];
  selectedId: number | null;
  selectedFolderId: number | null;
  onSelect: (id: number) => void;
  onSelectFolder: (id: number | null) => void;
}

export default function NoteList({ notes, folders, selectedId, selectedFolderId, onSelect, onSelectFolder }: Props) {
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const createFolder = useCreateNoteFolder();
  const deleteFolder = useDeleteNoteFolder();

  const createInFolder = (folderId: number | null) => {
    createNote.mutate({ folder_id: folderId, title: "Neue Notiz" }, { onSuccess: (note) => onSelect(note.id) });
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line/60 bg-surface">
      <div className="border-b border-line/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="label-xs mb-0.5">Knowledge</div>
            <h2 className="text-[15px] font-semibold text-t1">Notizen</h2>
          </div>
          <button
            onClick={() => createFolder.mutate({ title: "Neuer Ordner" })}
            className="rounded-lg p-1.5 text-t3 hover:bg-line/30 hover:text-t1 transition-colors"
            title="Ordner erstellen"
          >
            <FolderPlus size={15} />
          </button>
        </div>
        <button
          onClick={() => createInFolder(selectedFolderId)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Neue Notiz
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelectFolder(null)}
          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
            selectedFolderId === null ? "bg-accent/10 text-accent" : "text-t2 hover:bg-line/20 hover:text-t1"
          }`}
        >
          <span>Alle Notizen</span>
          <span className="text-[11px] text-t3">{notes.length}</span>
        </button>

        <div className="space-y-0.5 mb-4">
          {folders.map((folder) => {
            const count = notes.filter((n) => n.folder_id === folder.id).length;
            return (
              <div key={folder.id} className="group">
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    selectedFolderId === folder.id ? "bg-accent/10 text-accent" : "text-t2 hover:bg-line/20 hover:text-t1"
                  }`}
                >
                  <Folder size={13} />
                  <span className="min-w-0 flex-1 truncate">{folder.title}</span>
                  <span className="text-[11px] text-t3">{count}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); createInFolder(folder.id); }}
                    className="rounded p-0.5 opacity-0 hover:bg-line/40 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus size={11} />
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Ordner "${folder.title}" löschen?`)) deleteFolder.mutate(folder.id); }}
                    className="rounded p-0.5 opacity-0 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={11} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-0.5">
          {notes
            .filter((n) => selectedFolderId === null || n.folder_id === selectedFolderId)
            .map((note) => (
              <div
                key={note.id}
                onClick={() => onSelect(note.id)}
                className={`group cursor-pointer rounded-lg border px-3 py-2 transition-all ${
                  selectedId === note.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-transparent hover:border-line/40 hover:bg-line/15"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-t1">{note.title || "Ohne Titel"}</div>
                    <div className="mt-0.5 text-[10px] text-t3">{new Date(note.updated_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Notiz löschen?")) deleteNote.mutate(note.id, { onSuccess: () => selectedId === note.id && onSelect(-1) });
                    }}
                    className="rounded p-0.5 text-t3 opacity-0 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}
