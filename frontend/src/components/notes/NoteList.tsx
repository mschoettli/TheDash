import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Folder,
  FolderPlus,
  GripVertical,
  Inbox,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../ui/ConfirmDialog";
import {
  Note,
  NoteFolder,
  useCreateNote,
  useCreateNoteFolder,
  useDeleteNote,
  useDeleteNoteFolder,
  useReorderNotes,
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

function sortedFolderNotes(notes: Note[], folderId: number | null): Note[] {
  return notes
    .filter((n) => n.folder_id === folderId && !n.is_archived)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

// ── Drag overlay preview ──────────────────────────────────────────────────────
function NoteDragOverlay({ note }: { note: Note }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-card px-3 py-2 shadow-xl shadow-black/30 opacity-95">
      <GripVertical size={12} className="text-t3" />
      <FileText size={12} className="shrink-0 text-t3" />
      <span className="text-[13px] font-medium text-t1">{note.title || "Untitled"}</span>
    </div>
  );
}

// ── Sortable note row ─────────────────────────────────────────────────────────
interface NoteRowProps {
  note: Note;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (note: Note) => void;
  onDuplicate: (note: Note) => void;
  updateNote: ReturnType<typeof useUpdateNote>;
}

function SortableNoteRow({ note, selectedId, onSelect, onDelete, onDuplicate, updateNote }: NoteRowProps) {
  const { t } = useTranslation();
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: `note:${note.id}`,
    data: { type: "note", folderId: note.folder_id ?? null },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      onClick={() => onSelect(note.id)}
      className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all ${
        selectedId === note.id
          ? "border border-accent/25 bg-accent/10 text-accent"
          : "border border-transparent hover:border-line/25 hover:bg-line/15"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab touch-none text-t3 opacity-0 transition-opacity group-hover:opacity-50 hover:!opacity-100 active:cursor-grabbing"
        tabIndex={-1}
        title="Drag to reorder"
      >
        <GripVertical size={12} />
      </button>

      <FileText size={12} className="shrink-0 text-t3" />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium leading-5 text-t1">
          {note.title || t("notes.untitled")}
        </div>
      </div>

      {note.is_pinned && <Pin size={9} className="shrink-0 text-accent/70" />}

      {/* Hover actions (4 max) */}
      <div
        className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned })}
          className={`rounded p-1 transition-colors ${note.is_pinned ? "text-accent" : "text-t3 hover:text-accent"}`}
          title={t("link.favorite")}
        >
          <Pin size={11} />
        </button>
        <button
          onClick={() => updateNote.mutate({ id: note.id, is_archived: !note.is_archived })}
          className={`rounded p-1 transition-colors ${note.is_archived ? "text-amber-400" : "text-t3 hover:text-amber-400"}`}
          title={t("link.archive")}
        >
          <Archive size={11} />
        </button>
        <button
          onClick={() => onDuplicate(note)}
          className="rounded p-1 text-t3 transition-colors hover:text-accent"
          title="Duplicate"
        >
          <Copy size={11} />
        </button>
        <button
          onClick={() => onDelete(note)}
          className="rounded p-1 text-t3 transition-colors hover:text-rose-500"
          title={t("notes.delete")}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Folder block (recursive) ──────────────────────────────────────────────────
interface FolderBlockProps {
  folder: NoteFolder;
  allNotes: Note[];
  query: string;
  selectedId: number | null;
  selectedScope: NoteScope;
  depth: number;
  openFolders: Set<number>;
  childFolders: Map<number | null, NoteFolder[]>;
  onSelect: (id: number) => void;
  onSelectScope: (scope: NoteScope) => void;
  onDeleteNote: (note: Note) => void;
  onDuplicateNote: (note: Note) => void;
  onDeleteFolder: (folder: NoteFolder) => void;
  createNote: ReturnType<typeof useCreateNote>;
  createFolder: ReturnType<typeof useCreateNoteFolder>;
  updateFolder: ReturnType<typeof useUpdateNoteFolder>;
  updateNote: ReturnType<typeof useUpdateNote>;
  toggleFolder: (id: number) => void;
}

function FolderBlock({
  folder,
  allNotes,
  query,
  selectedId,
  selectedScope,
  depth,
  openFolders,
  childFolders,
  onSelect,
  onSelectScope,
  onDeleteNote,
  onDuplicateNote,
  onDeleteFolder,
  createNote,
  createFolder,
  updateFolder,
  updateNote,
  toggleFolder,
}: FolderBlockProps) {
  const { t } = useTranslation();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(folder.title);

  // Drop target: accepts notes being moved to this folder
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `folder:${folder.id}`,
    data: { type: "folder", folderId: folder.id },
  });

  const notesInFolder = useMemo(
    () => sortedFolderNotes(allNotes, folder.id),
    [allNotes, folder.id]
  );

  const filteredNotes = useMemo(
    () =>
      query
        ? notesInFolder.filter(
            (n) =>
              n.title.toLowerCase().includes(query.toLowerCase()) ||
              n.content.toLowerCase().includes(query.toLowerCase())
          )
        : notesInFolder,
    [notesInFolder, query]
  );

  const subfolders = childFolders.get(folder.id) ?? [];
  const isOpen = openFolders.has(folder.id);
  const isActive = selectedScope === folder.id;

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft !== folder.title) {
      updateFolder.mutate({ id: folder.id, title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  return (
    <div>
      {/* Folder header — droppable zone */}
      <div
        ref={setDropRef}
        className={`group flex items-center gap-1 rounded-lg transition-all ${
          isOver ? "bg-accent/8 ring-1 ring-accent/30" : ""
        }`}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          onClick={() => toggleFolder(folder.id)}
          className="shrink-0 rounded p-1 text-t3 hover:bg-line/30 hover:text-t1"
        >
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            className="min-w-0 flex-1 rounded border border-line/60 bg-card px-2 py-1 text-[13px] text-t1 outline-none focus:border-accent/50"
          />
        ) : (
          <button
            onClick={() => onSelectScope(folder.id)}
            onDoubleClick={() => {
              setEditingTitle(true);
              setTitleDraft(folder.title);
            }}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
              isActive ? "bg-accent/10 text-accent" : "text-t2 hover:bg-line/20 hover:text-t1"
            }`}
          >
            <Folder size={13} />
            <span className="min-w-0 flex-1 truncate">{folder.title}</span>
            <span className="text-[11px] text-t3">{notesInFolder.length}</span>
          </button>
        )}

        {/* Folder actions */}
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() =>
              createNote.mutate(
                { folder_id: folder.id, title: t("notes.new_note") },
                { onSuccess: (n) => onSelect(n.id) }
              )
            }
            className="rounded p-1 text-t3 hover:text-accent"
            title={t("notes.new_note")}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() =>
              createFolder.mutate({ title: t("notes.new_folder"), parent_id: folder.id })
            }
            className="rounded p-1 text-t3 hover:text-accent"
            title={t("notes.create_subfolder")}
          >
            <FolderPlus size={12} />
          </button>
          <button
            onClick={() => onDeleteFolder(folder)}
            className="rounded p-1 text-t3 hover:text-rose-500"
            title={t("common.delete")}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Contents */}
      {isOpen && (filteredNotes.length > 0 || subfolders.length > 0) && (
        <div className="mt-0.5 space-y-0.5 pl-3">
          <SortableContext
            items={filteredNotes.map((n) => `note:${n.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {filteredNotes.map((note) => (
              <SortableNoteRow
                key={note.id}
                note={note}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDeleteNote}
                onDuplicate={onDuplicateNote}
                updateNote={updateNote}
              />
            ))}
          </SortableContext>

          {subfolders.map((child) => (
            <FolderBlock
              key={child.id}
              folder={child}
              allNotes={allNotes}
              query={query}
              selectedId={selectedId}
              selectedScope={selectedScope}
              depth={depth + 1}
              openFolders={openFolders}
              childFolders={childFolders}
              onSelect={onSelect}
              onSelectScope={onSelectScope}
              onDeleteNote={onDeleteNote}
              onDuplicateNote={onDuplicateNote}
              onDeleteFolder={onDeleteFolder}
              createNote={createNote}
              createFolder={createFolder}
              updateFolder={updateFolder}
              updateNote={updateNote}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main NoteList ─────────────────────────────────────────────────────────────
export default function NoteList({
  notes,
  folders,
  selectedId,
  selectedScope,
  onSelect,
  onSelectScope,
}: Props) {
  const { t } = useTranslation();

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const createFolder = useCreateNoteFolder();
  const updateFolder = useUpdateNoteFolder();
  const deleteFolder = useDeleteNoteFolder();
  const reorderNotes = useReorderNotes();

  const [openFolders, setOpenFolders] = useState<Set<number>>(() => new Set(folders.map((f) => f.id)));
  const [query, setQuery] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<Note | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<NoteFolder | null>(null);

  // Auto-open new folders
  useEffect(() => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      folders.forEach((f) => next.add(f.id));
      return next;
    });
  }, [folders]);

  const toggleFolder = useCallback((id: number) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const childFolders = useMemo(() => {
    const groups = new Map<number | null, NoteFolder[]>();
    folders.forEach((f) => {
      const key = f.parent_id ?? null;
      groups.set(key, [...(groups.get(key) ?? []), f]);
    });
    groups.forEach((items) =>
      items.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    );
    return groups;
  }, [folders]);

  const rootFolders = childFolders.get(null) ?? [];
  const activeNotes = notes.filter((n) => !n.is_archived);
  const pinned = activeNotes.filter((n) => n.is_pinned);
  const archived = notes.filter((n) => n.is_archived);
  const unfiled = useMemo(() => sortedFolderNotes(notes, null), [notes]);

  const filteredUnfiled = useMemo(
    () =>
      query
        ? unfiled.filter(
            (n) =>
              n.title.toLowerCase().includes(query.toLowerCase()) ||
              n.content.toLowerCase().includes(query.toLowerCase())
          )
        : unfiled,
    [unfiled, query]
  );

  const duplicateNote = useCallback(
    (note: Note) => {
      createNote.mutate({
        title: `${note.title || "Untitled"} ${t("notes.copy_suffix")}`,
        content: note.content,
        folder_id: note.folder_id,
        tags: note.tags,
      });
    },
    [createNote, t]
  );

  // ── dnd-kit ───────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Unfiled droppable
  const { setNodeRef: setUnfiledRef, isOver: isOverUnfiled } = useDroppable({
    id: "scope:unfiled",
    data: { type: "scope", scope: "unfiled" },
  });

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeId = String(args.active.id);
    if (activeId.startsWith("note:")) {
      const noteContainers = args.droppableContainers.filter((c) =>
        String(c.id).startsWith("note:")
      );
      const folderContainers = args.droppableContainers.filter(
        (c) => String(c.id).startsWith("folder:") || c.id === "scope:unfiled"
      );
      // First: exact pointer-inside note rows (for sort)
      const noteHits = pointerWithin({ ...args, droppableContainers: noteContainers });
      if (noteHits.length > 0) return noteHits;
      // Second: pointer inside folder headers (for move)
      const folderHits = pointerWithin({ ...args, droppableContainers: folderContainers });
      if (folderHits.length > 0) return folderHits;
      // Fallback: closest note
      return closestCenter({ ...args, droppableContainers: noteContainers });
    }
    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("note:")) setActiveNoteId(parseInt(id.split(":")[1]));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNoteId(null);
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (!activeId.startsWith("note:")) return;

    const noteId = parseInt(activeId.split(":")[1]);
    const activeNote = notes.find((n) => n.id === noteId);
    if (!activeNote) return;

    if (overId.startsWith("note:")) {
      const overNoteId = parseInt(overId.split(":")[1]);
      const overNote = notes.find((n) => n.id === overNoteId);
      if (!overNote) return;

      if (activeNote.folder_id === overNote.folder_id) {
        // Same folder: reorder
        const siblings = sortedFolderNotes(notes, activeNote.folder_id ?? null);
        const oldIdx = siblings.findIndex((n) => n.id === noteId);
        const newIdx = siblings.findIndex((n) => n.id === overNoteId);
        if (oldIdx === newIdx) return;
        const reordered = arrayMove(siblings, oldIdx, newIdx);
        reorderNotes.mutate(
          reordered.map((n, i) => ({ id: n.id, folder_id: n.folder_id ?? null, sort_order: i }))
        );
      } else {
        // Different folder: move to that folder at end
        reorderNotes.mutate([{ id: noteId, folder_id: overNote.folder_id ?? null, sort_order: 9999 }]);
      }
    } else if (overId.startsWith("folder:")) {
      const folderId = parseInt(overId.split(":")[1]);
      reorderNotes.mutate([{ id: noteId, folder_id: folderId, sort_order: 9999 }]);
    } else if (overId === "scope:unfiled") {
      reorderNotes.mutate([{ id: noteId, folder_id: null, sort_order: 9999 }]);
    }
  };

  const activeNote = activeNoteId ? notes.find((n) => n.id === activeNoteId) : null;

  // ── Scope nav items ───────────────────────────────────────────────────────
  const scopeItems: Array<[NoteScope, React.ElementType, string, number]> = [
    ["all", FileText, t("notes.all_notes"), activeNotes.length],
    ["unfiled", Inbox, t("notes.unfiled"), unfiled.length],
    ["pinned", Star, t("notes.stat_pinned"), pinned.length],
    ["archived", Archive, t("notes.archive"), archived.length],
  ];

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-line/60 bg-surface">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-2 border-b border-line/40 p-4">
        <div className="flex items-center justify-between">
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
          onClick={() =>
            createNote.mutate(
              {
                folder_id: typeof selectedScope === "number" ? selectedScope : null,
                title: t("notes.new_note"),
              },
              { onSuccess: (n) => onSelect(n.id) }
            )
          }
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> {t("notes.new_note")}
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-line/50 bg-card px-2.5 py-1.5">
          <Search size={13} className="shrink-0 text-t3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("notes.search")}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-t1 outline-none placeholder:text-t3"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-t3 hover:text-t1 text-[10px]">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Scope nav ──────────────────────────────────────────────────── */}
      <div className="space-y-0.5 border-b border-line/30 px-2 py-2">
        {scopeItems.map(([scope, Icon, label, count]) => (
          <button
            key={String(scope)}
            onClick={() => onSelectScope(scope)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
              selectedScope === scope
                ? "bg-accent/10 text-accent"
                : "text-t2 hover:bg-line/20 hover:text-t1"
            }`}
          >
            <Icon size={14} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="text-[11px] text-t3">{count}</span>
          </button>
        ))}
      </div>

      {/* ── Tree ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Unfiled notes */}
          <div
            ref={setUnfiledRef}
            className={`mx-2 space-y-0.5 rounded-lg transition-all ${
              isOverUnfiled ? "bg-accent/6 ring-1 ring-accent/25" : ""
            }`}
          >
            <SortableContext
              items={filteredUnfiled.map((n) => `note:${n.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {filteredUnfiled.map((note) => (
                <SortableNoteRow
                  key={note.id}
                  note={note}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onDelete={setDeleteNoteTarget}
                  onDuplicate={duplicateNote}
                  updateNote={updateNote}
                />
              ))}
            </SortableContext>
          </div>

          {/* Folder tree */}
          {rootFolders.length > 0 && (
            <div className="mx-2 mt-2 space-y-0.5">
              {rootFolders.map((folder) => (
                <FolderBlock
                  key={folder.id}
                  folder={folder}
                  allNotes={notes}
                  query={query}
                  selectedId={selectedId}
                  selectedScope={selectedScope}
                  depth={0}
                  openFolders={openFolders}
                  childFolders={childFolders}
                  onSelect={onSelect}
                  onSelectScope={onSelectScope}
                  onDeleteNote={setDeleteNoteTarget}
                  onDuplicateNote={duplicateNote}
                  onDeleteFolder={setDeleteFolderTarget}
                  createNote={createNote}
                  createFolder={createFolder}
                  updateFolder={updateFolder}
                  updateNote={updateNote}
                  toggleFolder={toggleFolder}
                />
              ))}
            </div>
          )}

          <DragOverlay dropAnimation={null}>
            {activeNote && <NoteDragOverlay note={activeNote} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Confirm dialogs ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteNoteTarget)}
        title={t("notes.delete_note_title")}
        description={t("notes.delete_note_description", {
          title: deleteNoteTarget?.title || t("notes.untitled"),
        })}
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
        description={t("notes.delete_folder_description", {
          title: deleteFolderTarget?.title ?? "",
        })}
        onCancel={() => setDeleteFolderTarget(null)}
        onConfirm={() => {
          if (!deleteFolderTarget) return;
          deleteFolder.mutate(deleteFolderTarget.id, {
            onSuccess: () => setDeleteFolderTarget(null),
          });
        }}
        isPending={deleteFolder.isPending}
      />
    </aside>
  );
}
