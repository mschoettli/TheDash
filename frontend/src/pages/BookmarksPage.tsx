import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  Bookmark,
  CheckSquare,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Link2,
  List,
  Plus,
  Search,
  Sparkles,
  Star,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Section, SectionsData, useCreateSection, useDeleteSection, useSections, useUpdateSection } from "../hooks/useSections";
import { checkLink, Link, suggestAutoTags, useBulkLinks, useReorderLinks } from "../hooks/useLinks";
import { useTags } from "../hooks/useTags";
import BookmarkCard from "../components/links/BookmarkCard";
import LinkEditModal from "../components/links/LinkEditModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveSection = "all" | "favorites" | "archive" | "unsectioned" | "untagged" | "recent" | "metadata_failed" | "unread" | "read" | number;
type ViewMode = "grid" | "list";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesSearch(link: Link, query: string, collectionTitle = ""): boolean {
  const v = query.trim().toLowerCase();
  if (!v) return true;
  const tokens = v.split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    const [operator, ...rest] = token.split(":");
    const value = rest.join(":");
    if (operator === "tag" && value) return link.tags.some((tag) => tag.name.toLowerCase().includes(value));
    if ((operator === "collection" || operator === "section") && value) return collectionTitle.toLowerCase().includes(value);
    if (operator === "is" && value === "favorite") return Boolean(link.is_favorite);
    if (operator === "is" && value === "archived") return Boolean(link.is_archived);
    if (operator === "is" && value === "read") return Boolean(link.is_read);
    if (operator === "is" && value === "unread") return !link.is_read;
    if (operator === "is" && value === "untagged") return link.tags.length === 0;
    if (operator === "url" && value) return link.url.toLowerCase().includes(value);
    if (operator === "title" && value) return link.name.toLowerCase().includes(value);
    return [link.name, link.url, link.description ?? "", link.note ?? "", collectionTitle, ...link.tags.map((t) => t.name)]
      .join(" ")
      .toLowerCase()
      .includes(token);
  });
}

function isLikelyUrl(value: string): boolean {
  const input = value.trim();
  if (!input) return false;
  if (/^https?:\/\//i.test(input)) return true;
  if (/^(localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(input)) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/.*)?$/.test(input);
}

// ─── Unsectioned Sidebar Item ─────────────────────────────────────────────────

function UnsectionedSidebarItem({
  count, isActive, isDropOver, onSelect,
}: {
  count: number;
  isActive: boolean;
  isDropOver: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({
    id: "sidebar:unsectioned",
    data: { type: "sidebar-unsectioned" },
  });
  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all ${
        isActive
          ? "bg-accent/15 font-semibold text-accent"
          : isDropOver
          ? "bg-accent/10 text-accent ring-1 ring-accent/40"
          : "text-t2 hover:bg-line/20 hover:text-t1"
      }`}
    >
      <span className={isActive ? "text-accent" : "text-t3"}><Bookmark size={14} /></span>
      <span className="flex-1 text-left">{t("bookmarks.unsectioned", "Unsortiert")}</span>
      <span className={`text-[11px] ${isActive ? "text-accent/70" : "text-t3"}`}>{count}</span>
    </div>
  );
}

// ─── Sortable Sidebar Section ──────────────────────────────────────────────────

function SortableSidebarSection({
  section, isActive, isDropOver, onSelect, onRename, onDelete,
}: {
  section: Section;
  isActive: boolean;
  isDropOver: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef: setSortRef, transform, transition, isDragging } = useSortable({
    id: `section:${section.id}`,
    data: { type: "section" },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `sidebar:${section.id}`,
    data: { type: "sidebar-section", sectionId: section.id },
  });

  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(section.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sortStyle = { transform: CSS.Transform.toString(transform), transition };

  return (
    <>
      <div
        ref={setSortRef}
        style={sortStyle}
        className={isDragging ? "opacity-40" : ""}
      >
        {/* The button itself is the drop target */}
        <div
          ref={setDropRef}
          className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-all ${
            isActive
              ? "bg-accent/15 font-semibold text-accent"
              : isDropOver
              ? "bg-accent/10 text-accent ring-1 ring-accent/40"
              : "text-t2 hover:bg-line/20 hover:text-t1"
          }`}
        >
          {/* Drag handle */}
          <button
            className="shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={12} className="text-t3" />
          </button>

          {/* Title (inline edit) */}
          {editing ? (
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={() => { onRename(localTitle); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onRename(localTitle); setEditing(false); }
                if (e.key === "Escape") { setLocalTitle(section.title); setEditing(false); }
              }}
            />
          ) : (
            <button
              className="min-w-0 flex-1 truncate text-left"
              onClick={onSelect}
              onDoubleClick={() => { setLocalTitle(section.title); setEditing(true); }}
            >
              {section.title}
            </button>
          )}

          {/* Count + actions */}
          <span className={`shrink-0 text-[11px] ${isActive ? "text-accent/70" : "text-t3"}`}>{section.links.length}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-t3 hover:text-rose-400"
            title={t("bookmarks.delete_section")}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("bookmarks.delete_section")}
        description={t("bookmarks.delete_section_description", { title: section.title })}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { onDelete(); setConfirmDelete(false); }}
      />
    </>
  );
}

// ─── Sortable Bookmark ─────────────────────────────────────────────────────────

function SortableBookmark({
  link, view, collectionTitle, selected, selectable, onSelect,
}: {
  link: Link;
  view: ViewMode;
  collectionTitle?: string;
  selected: boolean;
  selectable: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `link:${link.id}`,
    data: { type: "link", sectionId: link.section_id },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handle = (
    <button
      onClick={(event) => event.stopPropagation()}
      className="flex h-7 w-7 cursor-grab items-center justify-center rounded-lg border border-line/50 bg-surface/90 text-t3 shadow-sm transition-colors hover:text-accent active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={13} />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <BookmarkCard
        link={link}
        collectionTitle={collectionTitle}
        variant={view}
        dragHandle={handle}
        isDragging={isDragging}
        selected={selected}
        selectable={selectable}
        onSelect={onSelect}
      />
    </div>
  );
}

// ─── Drag Preview ──────────────────────────────────────────────────────────────

function DragPreview({ link }: { link: Link }) {
  return (
    <div className="w-[200px] rounded-xl border border-accent/50 bg-card p-3 shadow-2xl shadow-accent/20 opacity-95">
      <div className="truncate text-[13px] font-semibold text-t1">{link.name}</div>
      <div className="mt-0.5 truncate text-[11px] text-t3">
        {(() => { try { return new URL(link.url).hostname.replace(/^www\./, ""); } catch { return link.url; } })()}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BookmarksPage() {
  const { t } = useTranslation();
  const { data: sectionsData, isLoading, refetch: refetchSections } = useSections();
  const sections = (sectionsData as SectionsData | undefined)?.sections;
  const unsectionedLinks = (sectionsData as SectionsData | undefined)?.unsectionedLinks ?? [];
  const { data: allTags } = useTags();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderLinks = useReorderLinks();
  const bulkLinks = useBulkLinks();

  // ─ UI state ─────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<ActiveSection>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureChecking, setCaptureChecking] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<Partial<Link> | null>(null);
  const [linkDraft, setLinkDraft] = useState<Partial<Link> | null>(null);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [addingSectionTitle, setAddingSectionTitle] = useState("");
  const [addingSectionOpen, setAddingSectionOpen] = useState(false);
  const addSectionInputRef = useRef<HTMLInputElement>(null);

  // ─ DnD state ────────────────────────────────────────────────────────────────
  const [sectionsDraft, setSectionsDraft] = useState<Section[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropOverSidebarId, setDropOverSidebarId] = useState<number | null>(null);
  const [dropOverUnsectioned, setDropOverUnsectioned] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─ Data ─────────────────────────────────────────────────────────────────────
  const displaySections = sectionsDraft ?? sections ?? [];
  const allLinks = useMemo(
    () => [...displaySections.flatMap((s) => s.links), ...unsectionedLinks],
    [displaySections, unsectionedLinks]
  );
  const hasPendingPreviews = useMemo(
    () => allLinks.some((link) => link.screenshot_status === "pending"),
    [allLinks]
  );
  const favoriteLinks = useMemo(() => allLinks.filter((l) => l.is_favorite && !l.is_archived), [allLinks]);
  const archiveLinks = useMemo(() => allLinks.filter((l) => l.is_archived), [allLinks]);
  const unreadLinks = useMemo(() => allLinks.filter((l) => !l.is_read && !l.is_archived), [allLinks]);
  const readLinks = useMemo(() => allLinks.filter((l) => l.is_read && !l.is_archived), [allLinks]);
  const untaggedLinks = useMemo(() => allLinks.filter((l) => !l.is_archived && l.tags.length === 0), [allLinks]);
  const recentLinks = useMemo(
    () => [...allLinks].filter((l) => !l.is_archived).sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))).slice(0, 30),
    [allLinks]
  );
  const metadataFailedLinks = useMemo(
    () => allLinks.filter((l) => !l.is_archived && !l.description && !l.image_url && !l.screenshot_url && !l.icon_url),
    [allLinks]
  );
  const topTags = useMemo(
    () => [...(allTags ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5),
    [allTags]
  );
  const defaultSectionId = displaySections[0]?.id ?? null;

  useEffect(() => {
    if (!hasPendingPreviews) return;
    const interval = window.setInterval(() => {
      refetchSections();
    }, 2500);
    return () => window.clearInterval(interval);
  }, [hasPendingPreviews, refetchSections]);
  const sectionTitleById = useMemo(() => new Map(displaySections.map((s) => [s.id, s.title])), [displaySections]);

  const visibleLinks = useMemo(() => {
    let base: Link[];
    if (activeSection === "all") base = allLinks.filter((l) => !l.is_archived);
    else if (activeSection === "favorites") base = favoriteLinks;
    else if (activeSection === "archive") base = archiveLinks;
    else if (activeSection === "unread") base = unreadLinks;
    else if (activeSection === "read") base = readLinks;
    else if (activeSection === "unsectioned") base = unsectionedLinks.filter((l) => !l.is_archived);
    else if (activeSection === "untagged") base = untaggedLinks;
    else if (activeSection === "recent") base = recentLinks;
    else if (activeSection === "metadata_failed") base = metadataFailedLinks;
    else base = displaySections.find((s) => s.id === activeSection)?.links ?? [];
    return base.filter((l) => {
      const tagMatch = activeTag ? l.tags.some((t) => t.name === activeTag) : true;
      return tagMatch && matchesSearch(l, query, l.section_id ? sectionTitleById.get(l.section_id) ?? "" : "");
    });
  }, [activeSection, activeTag, allLinks, archiveLinks, displaySections, favoriteLinks, metadataFailedLinks, query, readLinks, recentLinks, sectionTitleById, unreadLinks, unsectionedLinks, untaggedLinks]);

  // ─ Active drag item ─────────────────────────────────────────────────────────
  const activeLinkId = activeId?.startsWith("link:") ? Number(activeId.split(":")[1]) : null;
  const activeLink = activeLinkId ? allLinks.find((l) => l.id === activeLinkId) : null;

  // ─ URL Capture ──────────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!captureUrl.trim()) return;
    const url = captureUrl.trim();
    setCaptureChecking(true);
    setCaptureError(null);
    try {
      const result = await checkLink(url);
      if (result.exists && result.bookmark) {
        setEditingLink(result.bookmark);
        setCaptureError(t("bookmarks.duplicate_found", "Dieses Lesezeichen existiert bereits."));
        return;
      }
      const captureSectionId = typeof activeSection === "number" ? activeSection : null;
      setCaptureDraft({
        section_id: captureSectionId,
        url: result.metadata.url,
        name: result.metadata.title,
        description: result.metadata.description,
        image_url: result.metadata.image_url,
        icon_url: result.metadata.icon_url,
        tags: result.auto_tags.map((tag, i) => ({
          id: -i - 1,
          name: tag.name,
          source: tag.source,
          created_at: new Date().toISOString(),
        })),
      } as Partial<Link>);
    } catch (err) {
      let name = url;
      try { name = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ""); }
      catch { name = url; }
      setCaptureDraft({
        section_id: null,
        url, name,
        tags: suggestAutoTags(url, name).map((tag, i) => ({
          id: -i - 1, name: tag, source: "auto" as const, created_at: new Date().toISOString(),
        })),
      } as Partial<Link>);
      setCaptureError(err instanceof Error ? err.message : t("bookmarks.capture_error", "Prüfung fehlgeschlagen."));
    } finally {
      setCaptureChecking(false);
    }
  };

  const toggleSelection = (id: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulk = (
    action: "archive" | "favorite" | "read" | "move" | "add_tags" | "remove_tags" | "delete",
    payload: Record<string, unknown> = {}
  ) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    bulkLinks.mutate({ ids, action, payload }, { onSuccess: clearSelection });
  };

  // ─ Section operations ────────────────────────────────────────────────────────
  const handleCreateSection = () => {
    if (!addingSectionTitle.trim()) return;
    createSection.mutate(
      { title: addingSectionTitle.trim() },
      { onSuccess: () => { setAddingSectionTitle(""); setAddingSectionOpen(false); } }
    );
  };
  const handleRenameSection = (id: number, title: string) => {
    updateSection.mutate({ id, title });
  };
  const handleDeleteSection = (id: number) => {
    deleteSection.mutate(id, {
      onSuccess: () => {
        if (activeSection === id) setActiveSection("all");
      },
    });
  };

  // ─ DnD: reorder links within section ────────────────────────────────────────
  const handleReorderLinks = (sectionId: number | null, orderedIds: number[]) => {
    const items = orderedIds.map((id, idx) => ({
      id,
      section_id: sectionId,
      sort_order: idx,
    }));
    reorderLinks.mutate(items);
  };

  // ─ DnD: move link to different section ──────────────────────────────────────
  const handleMoveToSection = (linkId: number, targetSectionId: number | null) => {
    const link = allLinks.find((l) => l.id === linkId);
    if (!link || link.section_id === targetSectionId) return;
    const newOrder = targetSectionId === null
      ? unsectionedLinks.length
      : (displaySections.find((s) => s.id === targetSectionId)?.links.length ?? 0);
    reorderLinks.mutate([{ id: linkId, section_id: targetSectionId, sort_order: newOrder }]);
    setActiveSection(targetSectionId === null ? "unsectioned" : targetSectionId);
  };

  // ─ DnD: reorder sections ────────────────────────────────────────────────────
  const handleReorderSections = (orderedIds: number[]) => {
    orderedIds.forEach((id, idx) => {
      updateSection.mutate({ id, sort_order: idx });
    });
  };

  // ─ Custom collision detection ────────────────────────────────────────────────
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const id = String(args.active.id);

    if (id.startsWith("link:")) {
      // Try sidebar sections first (pointer-within for precise hit)
      const sidebarDrops = args.droppableContainers.filter((c) => String(c.id).startsWith("sidebar:"));
      const hits = pointerWithin({ ...args, droppableContainers: sidebarDrops });
      if (hits.length > 0) return hits;
      // Then grid sortables
      const gridItems = args.droppableContainers.filter((c) => String(c.id).startsWith("link:"));
      return closestCenter({ ...args, droppableContainers: gridItems });
    }

    if (id.startsWith("section:")) {
      const secs = args.droppableContainers.filter((c) => String(c.id).startsWith("section:"));
      return closestCenter({ ...args, droppableContainers: secs });
    }

    return closestCenter(args);
  }, []);

  const handleDragOver = (e: DragOverEvent) => {
    const { over, active } = e;
    if (!String(active.id).startsWith("link:")) { setDropOverSidebarId(null); setDropOverUnsectioned(false); return; }
    if (over?.data.current?.type === "sidebar-section") {
      setDropOverSidebarId(Number(over.data.current.sectionId));
      setDropOverUnsectioned(false);
    } else if (over?.data.current?.type === "sidebar-unsectioned") {
      setDropOverUnsectioned(true);
      setDropOverSidebarId(null);
    } else {
      setDropOverSidebarId(null);
      setDropOverUnsectioned(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDropOverSidebarId(null);
    setDropOverUnsectioned(false);
    if (!over || active.id === over.id) return;

    const ak = String(active.id);
    const ok = String(over.id);

    // Section reorder
    if (ak.startsWith("section:") && ok.startsWith("section:")) {
      const cur = displaySections.map((s) => s.id);
      const oi = cur.indexOf(Number(ak.split(":")[1]));
      const ni = cur.indexOf(Number(ok.split(":")[1]));
      if (oi >= 0 && ni >= 0) {
        const reordered = arrayMove(cur, oi, ni);
        setSectionsDraft(arrayMove([...displaySections], oi, ni));
        handleReorderSections(reordered);
      }
      return;
    }

    // Link dropped on sidebar section = cross-section move
    if (ak.startsWith("link:") && ok.startsWith("sidebar:")) {
      const linkId = Number(ak.split(":")[1]);
      const targetKey = ok.split(":")[1];
      const targetSectionId = targetKey === "unsectioned" ? null : Number(targetKey);
      handleMoveToSection(linkId, targetSectionId);
      return;
    }

    // Link reorder within same section
    if (ak.startsWith("link:") && ok.startsWith("link:")) {
      const aId = Number(ak.split(":")[1]);
      const oId = Number(ok.split(":")[1]);
      const aLink = allLinks.find((l) => l.id === aId);
      const oLink = allLinks.find((l) => l.id === oId);
      if (!aLink || !oLink || aLink.section_id !== oLink.section_id) return;

      const sectionId = aLink.section_id;
      const sectionLinks = sectionId === null
        ? unsectionedLinks
        : (displaySections.find((s) => s.id === sectionId)?.links ?? []);
      const ids = sectionLinks.map((l) => l.id);
      const oi = ids.indexOf(aId);
      const ni = ids.indexOf(oId);
      if (oi >= 0 && ni >= 0) {
        handleReorderLinks(sectionId, arrayMove(ids, oi, ni));
      }
    }
  };

  // ─ Render ────────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex gap-5">
      <div className="w-52 shrink-0 space-y-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 rounded-xl bg-card animate-pulse" />)}
      </div>
      <div className="flex-1 grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-48 rounded-xl bg-card animate-pulse" />)}
      </div>
    </div>
  );

  const isReorderable = typeof activeSection === "number" || activeSection === "unsectioned";
  const commandIsUrl = isLikelyUrl(captureUrl);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveId(null); setDropOverSidebarId(null); setDropOverUnsectioned(false); setSectionsDraft(null); }}
    >
      <div className="flex min-h-0 gap-5 text-t1">

        {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-52 shrink-0">
          <div className="sticky top-0 space-y-0.5">
            {/* Page title */}
            <div className="mb-4 px-1">
              <div className="label-xs mb-1">{t("bookmarks.library")}</div>
              <h1 className="text-lg font-semibold text-t1">{t("bookmarks.title")}</h1>
            </div>

            {/* User collections */}
            {displaySections.length > 0 && (
              <div className="label-xs mb-2 px-3">{t("bookmarks.collections", "Collections")}</div>
            )}
            <SortableContext
              items={displaySections.map((s) => `section:${s.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {displaySections.map((section) => (
                <SortableSidebarSection
                  key={section.id}
                  section={section}
                  isActive={activeSection === section.id}
                  isDropOver={dropOverSidebarId === section.id}
                  onSelect={() => setActiveSection(section.id)}
                  onRename={(title) => handleRenameSection(section.id, title)}
                  onDelete={() => handleDeleteSection(section.id)}
                />
              ))}
            </SortableContext>

            {/* Add section */}
            {addingSectionOpen ? (
              <div className="mt-1 flex items-center gap-1 rounded-xl border border-line/50 px-2 py-1">
                <input
                  ref={addSectionInputRef}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-t1 outline-none placeholder:text-t3"
                  placeholder={t("bookmarks.section_title")}
                  value={addingSectionTitle}
                  onChange={(e) => setAddingSectionTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSection();
                    if (e.key === "Escape") { setAddingSectionTitle(""); setAddingSectionOpen(false); }
                  }}
                />
                <button
                  onClick={handleCreateSection}
                  disabled={!addingSectionTitle.trim()}
                  className="rounded-lg bg-accent px-2 py-1 text-[11px] font-semibold text-bg disabled:opacity-40"
                >
                  +
                </button>
                <button onClick={() => { setAddingSectionTitle(""); setAddingSectionOpen(false); }} className="text-t3 hover:text-t1">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSectionOpen(true)}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-t3 transition-colors hover:text-t1"
              >
                <Plus size={12} /> {t("bookmarks.add_section")}
              </button>
            )}

            {/* Smart views */}
            <div className="mt-5 border-t border-line/40 pt-3">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-t3/70">{t("bookmarks.smart_views", "Smart Views")}</div>
            {[
              {
                id: "all" as const, icon: <Bookmark size={13} />, label: t("bookmarks.view_all", "All"),
                count: allLinks.filter((l) => !l.is_archived).length,
              },
              {
                id: "favorites" as const, icon: <Star size={13} />, label: t("link.favorite"),
                count: favoriteLinks.length,
              },
              {
                id: "unread" as const, icon: <EyeOff size={13} />, label: t("bookmarks.unread", "Unread"),
                count: unreadLinks.length,
              },
              {
                id: "read" as const, icon: <Eye size={13} />, label: t("bookmarks.read", "Read"),
                count: readLinks.length,
              },
              {
                id: "archive" as const, icon: <Archive size={13} />, label: t("link.archive"),
                count: archiveLinks.length,
              },
              {
                id: "untagged" as const, icon: <Tags size={13} />, label: t("bookmarks.untagged", "Nicht getaggt"),
                count: untaggedLinks.length,
              },
              {
                id: "recent" as const, icon: <Sparkles size={13} />, label: t("bookmarks.recent", "Zuletzt hinzugefügt"),
                count: recentLinks.length,
              },
              {
                id: "metadata_failed" as const, icon: <X size={13} />, label: t("bookmarks.metadata_failed", "Metadaten fehlen"),
                count: metadataFailedLinks.length,
              },
            ].map(({ id, icon, label, count }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] transition-all ${
                  activeSection === id
                    ? "bg-accent/10 font-semibold text-accent"
                    : "text-t3 hover:bg-line/15 hover:text-t2"
                }`}
              >
                <span className={activeSection === id ? "text-accent" : "text-t3"}>{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                <span className={`text-[11px] ${activeSection === id ? "text-accent/70" : "text-t3"}`}>{count}</span>
              </button>
            ))}
            </div>

            {/* Unsectioned */}
            {unsectionedLinks.length > 0 && (
              <UnsectionedSidebarItem
                count={unsectionedLinks.filter((l) => !l.is_archived).length}
                isActive={activeSection === "unsectioned"}
                isDropOver={dropOverUnsectioned}
                onSelect={() => setActiveSection("unsectioned")}
              />
            )}

            {allTags && allTags.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setTagsOpen((value) => !value)}
                  className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-t3 transition-colors hover:bg-line/20 hover:text-t1"
                >
                  <Tags size={13} />
                  <span className="flex-1 text-left">{t("link.tags")}</span>
                  <span className="rounded-full border border-line/50 px-2 py-0.5 text-[10px] normal-case tracking-normal">
                    {activeTag ? activeTag : allTags.length}
                  </span>
                </button>
                {tagsOpen && (
                  <div className="mt-1 max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    {allTags.slice(0, 24).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] transition-all ${
                          activeTag === tag.name
                            ? "bg-accent/15 font-semibold text-accent"
                            : "text-t2 hover:bg-line/20 hover:text-t1"
                        }`}
                      >
                        <Tags size={12} className={activeTag === tag.name ? "text-accent" : "text-t3"} />
                        <span className="min-w-0 flex-1 truncate text-left">{tag.name}</span>
                        <span className="text-[10px] text-t3">{tag.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 w-full items-center gap-2 rounded-[1rem] border border-line/60 bg-card/80 px-3 py-[0.62rem] shadow-sm transition-colors focus-within:border-accent/40 focus-within:shadow-[0_0_0_3px_rgb(var(--accent)/0.13)] sm:w-[180px] sm:max-w-[180px]">
              {commandIsUrl ? <Link2 size={15} className="shrink-0 text-accent" /> : <Search size={15} className="shrink-0 text-t3" />}
              <input
                value={captureUrl}
                onChange={(e) => {
                  const value = e.target.value;
                  setCaptureUrl(value);
                  if (isLikelyUrl(value)) setQuery("");
                  else setQuery(value);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (commandIsUrl) handleCapture();
                  else setQuery(captureUrl);
                }}
                placeholder={t("bookmarks.command_placeholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-t1 outline-none placeholder:text-t3"
              />
              {captureUrl.trim() && (
                <button
                  onClick={() => {
                    setCaptureUrl("");
                    setQuery("");
                  }}
                  className="text-t3 hover:text-t1"
                >
                  <X size={14} />
                </button>
              )}
              {commandIsUrl ? (
                <button
                  onClick={handleCapture}
                  disabled={captureChecking}
                  className="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-bg hover:opacity-90 disabled:opacity-40"
                >
                  {captureChecking ? t("link.suggesting_tags") : t("bookmarks.add_link")}
                </button>
              ) : (
                <button
                  onClick={() => setLinkDraft({ section_id: typeof activeSection === "number" ? activeSection : (activeSection === "unsectioned" ? null : defaultSectionId), name: "", url: "", tags: [] } as Partial<Link>)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line/60 px-3 py-1 text-[11px] font-semibold text-t2 transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <Plus size={14} /> {t("bookmarks.add_link")}
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex overflow-hidden rounded-full border border-line/60">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 transition-colors ${view === "grid" ? "bg-accent text-bg" : "text-t3 hover:bg-line/30 hover:text-t1"}`}
                title="Grid"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 transition-colors ${view === "list" ? "bg-accent text-bg" : "text-t3 hover:bg-line/30 hover:text-t1"}`}
                title="List"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {captureError && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] font-medium text-amber-500">
              {captureError}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/25 bg-accent/10 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                <CheckSquare size={14} /> {selectedIds.size} {t("bookmarks.selected", "ausgewählt")}
              </span>
              <button onClick={() => runBulk("favorite", { favorite: true })} className="rounded-lg border border-line/50 bg-card px-2.5 py-1.5 text-[12px] text-t2 hover:text-amber-400">
                {t("link.favorite")}
              </button>
              <button onClick={() => runBulk("archive", { archived: true })} className="rounded-lg border border-line/50 bg-card px-2.5 py-1.5 text-[12px] text-t2 hover:text-accent">
                {t("link.archive")}
              </button>
              <button onClick={() => runBulk("read", { read: true })} className="rounded-lg border border-line/50 bg-card px-2.5 py-1.5 text-[12px] text-t2 hover:text-accent">
                {t("link.mark_read")}
              </button>
              <select
                className="rounded-lg border border-line/50 bg-card px-2.5 py-1.5 text-[12px] text-t2 outline-none"
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  runBulk("move", { section_id: e.target.value === "unsectioned" ? null : Number(e.target.value) });
                  e.currentTarget.value = "";
                }}
              >
                <option value="">{t("bookmarks.move_to", "Verschieben nach...")}</option>
                <option value="unsectioned">{t("bookmarks.unsectioned", "Unsortiert")}</option>
                {displaySections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
              </select>
              <input
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                className="min-w-32 rounded-lg border border-line/50 bg-card px-2.5 py-1.5 text-[12px] text-t1 outline-none placeholder:text-t3"
                placeholder={t("link.tags")}
              />
              <button
                onClick={() => {
                  const tags = bulkTagInput.split(",").map((tag) => tag.trim()).filter(Boolean);
                  if (tags.length) runBulk("add_tags", { tags });
                  setBulkTagInput("");
                }}
                className="rounded-lg border border-line/50 bg-card px-2.5 py-1.5 text-[12px] text-t2 hover:text-accent"
              >
                + Tags
              </button>
              <button onClick={() => setBulkDeleteOpen(true)} className="rounded-lg border border-rose-500/25 bg-card px-2.5 py-1.5 text-[12px] text-rose-500 hover:bg-rose-500/10">
                {t("common.delete")}
              </button>
              <button onClick={clearSelection} className="ml-auto rounded-lg px-2.5 py-1.5 text-[12px] text-t3 hover:text-t1">
                {t("common.cancel")}
              </button>
            </div>
          )}

          {/* Tag filter */}
          {allTags && allTags.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setActiveTag(null)}
                className={`shrink-0 rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors ${
                  activeTag === null
                    ? "bg-accent text-bg"
                    : "border border-line/50 bg-card text-t2 hover:text-t1"
                }`}
              >
                {t("bookmarks.all_tags")} <span className="opacity-60">{visibleLinks.length}</span>
              </button>
              {topTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                  className={`shrink-0 rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors ${
                    activeTag === tag.name
                      ? "bg-accent text-bg"
                      : "border border-line/50 bg-card text-t2 hover:text-t1"
                  }`}
                >
                  {tag.name} <span className="opacity-60">{tag.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Section heading when inside a section */}
          {(typeof activeSection === "number" || activeSection === "unsectioned") && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-t1">
                  {activeSection === "unsectioned"
                    ? t("bookmarks.unsectioned", "Unsortiert")
                    : displaySections.find((s) => s.id === activeSection)?.title}
                </h2>
                <span className="rounded-full border border-line/50 bg-surface px-2 py-0.5 text-[11px] text-t3">
                  {visibleLinks.length}
                </span>
              </div>
              {isReorderable && (
                <span className="text-[11px] text-t3">Drag to reorder</span>
              )}
            </div>
          )}

          {/* Empty state */}
          {visibleLinks.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-t3">
              {query || activeTag ? "Keine Treffer für diese Suche." : "Noch keine Lesezeichen hier."}
            </div>
          ) : (
            /* Bookmark grid / list with DnD */
            isReorderable ? (
              <SortableContext
                items={visibleLinks.map((l) => `link:${l.id}`)}
                strategy={view === "list" ? verticalListSortingStrategy : rectSortingStrategy}
              >
                <div className={view === "list" ? "space-y-2" : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
                  {visibleLinks.map((link) => (
                    <SortableBookmark
                      key={link.id}
                      link={link}
                      view={view}
                      collectionTitle={link.section_id ? sectionTitleById.get(link.section_id) : t("bookmarks.unsectioned", "Unsortiert")}
                      selected={selectedIds.has(link.id)}
                      selectable
                      onSelect={(checked) => toggleSelection(link.id, checked)}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              /* Non-reorderable views (All, Favorites, Archive) — just grid */
              <div className={view === "list" ? "space-y-2" : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
                {visibleLinks.map((link) => (
                  <BookmarkCard
                    key={link.id}
                    link={link}
                    collectionTitle={link.section_id ? sectionTitleById.get(link.section_id) : t("bookmarks.unsectioned", "Unsortiert")}
                    variant={view}
                    selected={selectedIds.has(link.id)}
                    selectable
                    onSelect={(checked) => toggleSelection(link.id, checked)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* DragOverlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {activeLink && (
          <div className="cursor-grabbing rotate-1 scale-105">
            <DragPreview link={activeLink} />
          </div>
        )}
      </DragOverlay>

      {/* Modals */}
      <LinkEditModal
        open={Boolean(captureDraft)}
        onClose={() => { setCaptureDraft(null); setCaptureUrl(""); }}
        initial={captureDraft ?? undefined}
        defaultSectionId={captureDraft?.section_id ?? defaultSectionId}
      />
      <LinkEditModal
        open={Boolean(linkDraft)}
        onClose={() => setLinkDraft(null)}
        initial={linkDraft ?? undefined}
        defaultSectionId={linkDraft?.section_id ?? defaultSectionId}
      />
      <LinkEditModal
        open={Boolean(editingLink)}
        onClose={() => setEditingLink(null)}
        link={editingLink ?? undefined}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={t("link.delete_title")}
        description={t("bookmarks.bulk_delete_description", { count: selectedIds.size })}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => { runBulk("delete"); setBulkDeleteOpen(false); }}
        isPending={bulkLinks.isPending}
      />
    </DndContext>
  );
}
