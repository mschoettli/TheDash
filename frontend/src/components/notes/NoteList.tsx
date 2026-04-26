import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronRight, Copy, Edit3, FileText, Folder, FolderPlus, Inbox, Pin, Plus, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../ui/ConfirmDialog";
import {
  Note,
  NoteFolder,
  useCreateNote,
  useCreateNoteFolder,
  useDeleteNote,
  useDeleteNoteFolder,
  useUpdateNote,
  useUpdateNoteFolder,
} from "../../hooks/useNotes";

export type NoteScope = "all" | "unfiled" | "pinned" | "archived" | number;

interface Props {
  notes: Note[];
  folders: NoteFolder[];
  selectedId: number | null;
  selectedScope: NoteScope;
  onSelect: (id: number | null) => void;
  onSelectScope: (scope: NoteScope) => void;
}

function folderNotes(notes: Note[], folderId: number | null): Note[] {
  return notes
    .filter((note) => note.folder_id === folderId && !note.is_archived)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

function noteTitle(note: Note): string {
  return note.title.trim() || "Untitled";
}

export default function NoteList({ notes, folders, selectedId, selectedScope, onSelect, onSelectScope }: Props) {
  const { t } = useTranslation();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const createFolder = useCreateNoteFolder();
  const updateFolder = useUpdateNoteFolder();
  const deleteFolder = useDeleteNoteFolder();

  const [openFolders, setOpenFolders] = useState<Set<number>>(() => new Set(folders.map((folder) => folder.id)));
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [folderTitle, setFolderTitle] = useState("");
  const [dragNoteId, setDragNoteId] = useState<number | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<Note | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<NoteFolder | null>(null);

  useEffect(() => {
    setOpenFolders((current) => {
      const next = new Set(current);
      folders.forEach((folder) => next.add(folder.id));
      return next;
    });
  }, [folders]);

  const unfiled = useMemo(() => folderNotes(notes, null), [notes]);
  const activeNotes = notes.filter((note) => !note.is_archived);
  const pinned = activeNotes.filter((note) => note.is_pinned);
  const archived = notes.filter((note) => note.is_archived);
  const childFolders = useMemo(() => {
    const groups = new Map<number | null, NoteFolder[]>();
    folders.forEach((folder) => {
      const key = folder.parent_id ?? null;
      groups.set(key, [...(groups.get(key) ?? []), folder]);
    });
    groups.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)));
    return groups;
  }, [folders]);

  const createInFolder = (folderId: number | null) => {
    createNote.mutate({ folder_id: folderId, title: t("notes.new_note") }, { onSuccess: (note) => onSelect(note.id) });
  };

  const createSubFolder = (parentId: number | null) => {
    createFolder.mutate({ title: t("notes.new_folder"), parent_id: parentId });
  };

  const toggleFolder = (folderId: number) => {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const startRenameFolder = (folder: NoteFolder) => {
    setEditingFolderId(folder.id);
    setFolderTitle(folder.title);
  };

  const saveFolderTitle = () => {
    if (!editingFolderId || !folderTitle.trim()) return;
    updateFolder.mutate({ id: editingFolderId, title: folderTitle.trim() }, { onSuccess: () => setEditingFolderId(null) });
  };

  const moveDraggedNote = (folderId: number | null) => {
    if (!dragNoteId) return;
    updateNote.mutate({ id: dragNoteId, folder_id: folderId });
    setDragNoteId(null);
  };

  const duplicateNote = (note: Note) => {
    createNote.mutate({
      title: `${noteTitle(note)} ${t("notes.copy_suffix")}`,
      content: note.content,
      folder_id: note.folder_id,
      tags: note.tags,
    });
  };

  const scopeButton = (scope: NoteScope, icon: React.ElementType, label: string, count: number) => {
    const Icon = icon;
    const active = selectedScope === scope;
    return (
      <button
        onClick={() => onSelectScope(scope)}
        onDragOver={(event) => scope === "unfiled" && event.preventDefault()}
        onDrop={() => scope === "unfiled" && moveDraggedNote(null)}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
          active ? "bg-accent/10 text-accent" : "text-t2 hover:bg-line/20 hover:text-t1"
        }`}
      >
        <Icon size={14} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-[11px] text-t3">{count}</span>
      </button>
    );
  };

  const renderNote = (note: Note) => (
    <div
      key={note.id}
      draggable
      onDragStart={() => setDragNoteId(note.id)}
      onClick={() => onSelect(note.id)}
      className={`group ml-6 cursor-pointer rounded-lg border px-2.5 py-2 transition-all ${
        selectedId === note.id ? "border-accent/30 bg-accent/10" : "border-transparent hover:border-line/40 hover:bg-line/15"
      }`}
    >
      <div className="flex items-start gap-2">
        <FileText size={13} className="mt-0.5 shrink-0 text-t3" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-t1">{noteTitle(note)}</div>
          <div className="mt-0.5 text-[10px] text-t3">{new Date(note.updated_at).toLocaleString()}</div>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={(event) => { event.stopPropagation(); updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned }); }} className="rounded p-0.5 text-t3 hover:text-accent">
            <Pin size={11} />
          </button>
          <button onClick={(event) => { event.stopPropagation(); duplicateNote(note); }} className="rounded p-0.5 text-t3 hover:text-accent">
            <Copy size={11} />
          </button>
          <button onClick={(event) => { event.stopPropagation(); updateNote.mutate({ id: note.id, is_archived: !note.is_archived }); }} className="rounded p-0.5 text-t3 hover:text-amber-500">
            <Archive size={11} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setDeleteNoteTarget(note);
            }}
            className="rounded p-0.5 text-t3 hover:text-rose-500"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderFolder = (folder: NoteFolder, depth = 0): React.ReactNode => {
    const notesInFolder = folderNotes(notes, folder.id);
    const children = childFolders.get(folder.id) ?? [];
    const isOpen = openFolders.has(folder.id);
    const isActive = selectedScope === folder.id;
    return (
      <div key={folder.id}>
        <div
          className="group flex items-center gap-1 rounded-lg px-1 py-1"
          style={{ paddingLeft: depth * 12 + 4 }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => moveDraggedNote(folder.id)}
        >
          <button onClick={() => toggleFolder(folder.id)} className="rounded p-1 text-t3 hover:bg-line/30 hover:text-t1">
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <button
            onClick={() => onSelectScope(folder.id)}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
              isActive ? "bg-accent/10 text-accent" : "text-t2 hover:bg-line/20 hover:text-t1"
            }`}
          >
            <Folder size={13} />
            {editingFolderId === folder.id ? (
              <input
                autoFocus
                value={folderTitle}
                onChange={(event) => setFolderTitle(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onBlur={saveFolderTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveFolderTitle();
                  if (event.key === "Escape") setEditingFolderId(null);
                }}
                className="min-w-0 flex-1 rounded border border-line/60 bg-card px-1 text-[13px] text-t1 outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate">{folder.title}</span>
            )}
            <span className="text-[11px] text-t3">{notesInFolder.length}</span>
          </button>
          <button onClick={() => createInFolder(folder.id)} className="rounded p-1 text-t3 opacity-0 hover:bg-line/30 hover:text-accent group-hover:opacity-100">
            <Plus size={12} />
          </button>
          <button onClick={() => createSubFolder(folder.id)} className="rounded p-1 text-t3 opacity-0 hover:bg-line/30 hover:text-accent group-hover:opacity-100" title={t("notes.create_subfolder")}>
            <FolderPlus size={12} />
          </button>
          <button onClick={() => startRenameFolder(folder)} className="rounded p-1 text-t3 opacity-0 hover:bg-line/30 hover:text-accent group-hover:opacity-100">
            <Edit3 size={12} />
          </button>
          <button onClick={() => setDeleteFolderTarget(folder)} className="rounded p-1 text-t3 opacity-0 hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100">
            <Trash2 size={12} />
          </button>
        </div>
        {isOpen && (
          <div className="space-y-0.5">
            {notesInFolder.map(renderNote)}
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-line/60 bg-surface">
      <div className="border-b border-line/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="label-xs mb-0.5">Knowledge</div>
            <h2 className="text-[15px] font-semibold text-t1">{t("notes.title")}</h2>
          </div>
          <button
            onClick={() => createFolder.mutate({ title: t("notes.new_folder") })}
            className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-line/30 hover:text-t1"
            title={t("notes.create_folder")}
          >
            <FolderPlus size={15} />
          </button>
        </div>
        <button
          onClick={() => createInFolder(typeof selectedScope === "number" ? selectedScope : null)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> {t("notes.new_note")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-3 space-y-0.5">
          {scopeButton("all", FileText, t("notes.all_notes"), activeNotes.length)}
          {scopeButton("unfiled", Inbox, t("notes.unfiled"), unfiled.length)}
          {scopeButton("pinned", Star, t("notes.stat_pinned"), pinned.length)}
          {scopeButton("archived", Archive, t("notes.archive"), archived.length)}
        </div>

        {unfiled.length > 0 && <div className="mb-3 space-y-0.5">{unfiled.map(renderNote)}</div>}

        <div className="space-y-1">
          {(childFolders.get(null) ?? []).map((folder) => renderFolder(folder))}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteNoteTarget)}
        title={t("notes.delete_note_title")}
        description={t("notes.delete_note_description", { title: deleteNoteTarget?.title || t("notes.untitled") })}
        onCancel={() => setDeleteNoteTarget(null)}
        onConfirm={() => {
          if (!deleteNoteTarget) return;
          deleteNote.mutate(deleteNoteTarget.id, {
            onSuccess: () => {
              if (selectedId === deleteNoteTarget.id) onSelect(null);
              setDeleteNoteTarget(null);
            },
          });
        }}
        isPending={deleteNote.isPending}
      />
      <ConfirmDialog
        open={Boolean(deleteFolderTarget)}
        title={t("notes.delete_folder_title")}
        description={t("notes.delete_folder_description", { title: deleteFolderTarget?.title ?? "" })}
        onCancel={() => setDeleteFolderTarget(null)}
        onConfirm={() => {
          if (!deleteFolderTarget) return;
          deleteFolder.mutate(deleteFolderTarget.id, { onSuccess: () => setDeleteFolderTarget(null) });
        }}
        isPending={deleteFolder.isPending}
      />
    </aside>
  );
}
