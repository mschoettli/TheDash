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
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950/90">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">Knowledge</div>
            <h2 className="mt-1 text-base font-semibold text-slate-100">Notizen</h2>
          </div>
          <button onClick={() => createFolder.mutate({ title: "Neuer Ordner" })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-cyan-300" title="Ordner erstellen">
            <FolderPlus size={16} />
          </button>
        </div>
        <button onClick={() => createInFolder(selectedFolderId)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950">
          <Plus size={15} /> Neue Notiz
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button onClick={() => onSelectFolder(null)} className={`mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${selectedFolderId === null ? "bg-cyan-400/10 text-cyan-100" : "text-slate-400 hover:bg-slate-900"}`}>
          <span>Alle Notizen</span>
          <span className="text-xs text-slate-500">{notes.length}</span>
        </button>

        <div className="space-y-1">
          {folders.map((folder) => {
            const count = notes.filter((note) => note.folder_id === folder.id).length;
            return (
              <div key={folder.id} className="group">
                <button onClick={() => onSelectFolder(folder.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${selectedFolderId === folder.id ? "bg-cyan-400/10 text-cyan-100" : "text-slate-400 hover:bg-slate-900"}`}>
                  <Folder size={15} />
                  <span className="min-w-0 flex-1 truncate">{folder.title}</span>
                  <span className="text-xs text-slate-600">{count}</span>
                  <span onClick={(event) => { event.stopPropagation(); createInFolder(folder.id); }} className="rounded p-1 opacity-0 hover:bg-slate-800 group-hover:opacity-100"><Plus size={12} /></span>
                  <span onClick={(event) => { event.stopPropagation(); if (window.confirm(`Ordner ${folder.title} löschen?`)) deleteFolder.mutate(folder.id); }} className="rounded p-1 opacity-0 hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"><Trash2 size={12} /></span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-1">
          {notes
            .filter((note) => selectedFolderId === null || note.folder_id === selectedFolderId)
            .map((note) => (
              <div key={note.id} onClick={() => onSelect(note.id)} className={`group cursor-pointer rounded-xl border px-3 py-2 ${selectedId === note.id ? "border-cyan-400/40 bg-cyan-400/10" : "border-slate-900 bg-slate-900/50 hover:border-slate-700"}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-100">{note.title || "Ohne Titel"}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{new Date(note.updated_at).toLocaleString()}</div>
                  </div>
                  <button onClick={(event) => { event.stopPropagation(); if (window.confirm("Notiz löschen?")) deleteNote.mutate(note.id, { onSuccess: () => selectedId === note.id && onSelect(-1) }); }} className="rounded p-1 text-slate-600 opacity-0 hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );
}
