import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useCreateTile, useUpdateTile, useDeleteTile, Tile, TileProvider } from "../../hooks/useTiles";
import { useDashboard, useCreateDashboardItem } from "../../hooks/useDashboard";
import IconPicker from "../ui/IconPicker";
import { detectIconKey, iconValue, isRegistryIcon } from "../../lib/iconRegistry";

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";
const selectCls = `${input} appearance-none`;

function normalizeServiceUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    parsed.pathname = parsed.pathname.replace(/\/web\/?$/i, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return withScheme;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  tile?: Tile;
  initial?: Partial<Tile>;
  /** Pre-select section when creating a new tile */
  defaultSectionId?: number | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-xs mb-1.5">{label}</div>
      {children}
    </div>
  );
}

export default function TileEditModal({ open, onClose, tile, initial, defaultSectionId }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(tile);
  const { data: dashboard } = useDashboard();
  const sections = dashboard?.sections ?? [];

  const [name, setName] = useState(tile?.name ?? initial?.name ?? "");
  const [url, setUrl] = useState(tile?.url ?? initial?.url ?? "");
  const [iconUrl, setIconUrl] = useState(tile?.icon_url ?? initial?.icon_url ?? "");
  const [iconTouched, setIconTouched] = useState(false);
  const [style, setStyle] = useState<Tile["style"]>(tile?.style ?? initial?.style ?? "card");
  const [apiUrl, setApiUrl] = useState(tile?.api_url ?? initial?.api_url ?? "");
  const [apiKey, setApiKey] = useState(tile?.api_key ?? initial?.api_key ?? "");
  const [provider, setProvider] = useState<TileProvider>(tile?.provider ?? initial?.provider ?? "none");
  const [showAddress, setShowAddress] = useState(tile?.show_address ?? initial?.show_address ?? true);
  const [sectionId, setSectionId] = useState<number | null>(defaultSectionId ?? sections[0]?.id ?? null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(tile?.name ?? initial?.name ?? "");
      setUrl(tile?.url ?? initial?.url ?? "");
      setIconUrl(tile?.icon_url ?? initial?.icon_url ?? "");
      setIconTouched(false);
      setStyle(tile?.style ?? initial?.style ?? "card");
      setApiUrl(tile?.api_url ?? initial?.api_url ?? "");
      setApiKey(tile?.api_key ?? initial?.api_key ?? "");
      setProvider(tile?.provider ?? initial?.provider ?? "none");
      setShowAddress(tile?.show_address ?? initial?.show_address ?? true);
      setSectionId(defaultSectionId ?? sections[0]?.id ?? null);
      setDeleteOpen(false);
      setSaveError(null);
    }
  }, [open, tile, initial, defaultSectionId, sections]);

  useEffect(() => {
    if (!open || tile || initial?.icon_url || iconTouched || (!name.trim() && !url.trim())) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/logos/resolve?${new URLSearchParams({ name, url }).toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((result) => {
          if (result.status === "found" && result.value) {
            setIconUrl(result.value);
          } else if (!iconUrl) {
            setIconUrl(iconValue(detectIconKey(name)));
          }
        })
        .catch(() => {
          if (!iconUrl) setIconUrl(iconValue(detectIconKey(name)));
        });
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, tile, initial, iconTouched, iconUrl, name, url]);

  useEffect(() => {
    if (provider === "none" || apiUrl.trim()) return;
    setApiUrl(normalizeServiceUrl(url));
  }, [provider, apiUrl, url]);

  const create = useCreateTile();
  const update = useUpdateTile();
  const del = useDeleteTile();
  const createDashboardItem = useCreateDashboardItem();

  const isSaving = create.isPending || update.isPending;

  const handleSave = () => {
    setSaveError(null);
    const data = {
      name: name.trim(),
      url: url.trim(),
      icon_url: iconUrl || null,
      style,
      api_url: apiUrl ? normalizeServiceUrl(apiUrl) : null,
      api_key: apiKey || null,
      provider,
      show_address: showAddress,
      sort_order: tile?.sort_order ?? 0,
    };

    if (isEdit && tile) {
      update.mutate(
        { id: tile.id, ...data },
        {
          onSuccess: onClose,
          onError: (err) => setSaveError(err instanceof Error ? err.message : "Fehler beim Speichern"),
        }
      );
    } else {
      create.mutate(data, {
        onSuccess: (newTile) => {
          // After creating the tile, add it to the selected section as a dashboard item
          if (sectionId != null) {
            const section = sections.find((s) => s.id === sectionId);
            const nextOrder = section?.items.length ?? 0;
            createDashboardItem.mutate(
              { section_id: sectionId, item_type: "tile", item_id: newTile.id, sort_order: nextOrder },
              { onSuccess: onClose, onError: (err) => setSaveError(err instanceof Error ? err.message : "Fehler beim Hinzufügen zur Sektion") }
            );
          } else {
            onClose();
          }
        },
        onError: (err) => setSaveError(err instanceof Error ? err.message : "Fehler beim Erstellen"),
      });
    }
  };

  const handleDelete = () => {
    if (!tile) return;
    del.mutate(tile.id, {
      onSuccess: onClose,
      onError: (err) => setSaveError(err instanceof Error ? err.message : "Fehler beim Löschen"),
    });
  };

  const styleOptions = [
    { value: "card" as const, label: t("settings.style_card") },
    { value: "compact" as const, label: t("settings.style_compact") },
    { value: "minimal" as const, label: t("settings.style_minimal") },
    { value: "banner" as const, label: "Banner" },
    { value: "metric" as const, label: "Metric" },
  ];

  const providerOptions = [
    { value: "none" as TileProvider, label: t("tile.provider_none") },
    { value: "jellyfin" as TileProvider, label: "Jellyfin" },
    { value: "plex" as TileProvider, label: "Plex" },
    { value: "emby" as TileProvider, label: "Emby" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("tile.edit_title") : t("tile.add_title")}>
      <div className="space-y-4">
        <Field label={`${t("tile.name")} *`}>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="My Service" />
        </Field>

        <Field label={`${t("tile.url")} *`}>
          <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://server:8080" />
        </Field>

        <Field label={t("tile.icon")}>
          <input
            className={input}
            value={iconUrl}
            onChange={(e) => {
              setIconTouched(true);
              setIconUrl(e.target.value);
            }}
            placeholder="https://... or logo:selfhst:jellyfin"
          />
        </Field>

        <IconPicker
          value={isRegistryIcon(iconUrl) ? iconUrl : null}
          name={name}
          url={url}
          onChange={(value) => {
            setIconTouched(true);
            setIconUrl(value);
          }}
        />

        <Field label={t("tile.style")}>
          <div className="grid grid-cols-5 overflow-hidden rounded-lg border border-line/60">
            {styleOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStyle(value)}
                className={`py-1.5 px-3 text-[13px] font-medium transition-colors ${
                  style === value ? "bg-accent text-bg" : "text-t2 hover:bg-line/30 hover:text-t1"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <label className="flex items-center justify-between rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t2">
          <span>{t("tile.show_address")}</span>
          <input type="checkbox" checked={showAddress} onChange={(e) => setShowAddress(e.target.checked)} />
        </label>

        {/* Section selector — only for new tiles when sections exist */}
        {!isEdit && sections.length > 0 && (
          <Field label="Sektion">
            <select
              className={selectCls}
              value={sectionId ?? ""}
              onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t("tile.provider")}>
          <select value={provider} onChange={(e) => setProvider(e.target.value as TileProvider)} className={selectCls}>
            {providerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </Field>

        <Field label={t("tile.api")}>
          <input className={input} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://media-server:8096" />
        </Field>

        <Field label={t("tile.api_key")}>
          <input className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional token" />
        </Field>

        {saveError && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-500">
            <AlertCircle size={13} className="shrink-0" />
            {saveError}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !url.trim() || isSaving}
            className="flex-1 rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {isSaving ? "Speichern..." : t("tile.save")}
          </button>
          {isEdit && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-t2 transition-colors hover:border-rose-400/40 hover:text-rose-400"
            >
              {t("tile.delete")}
            </button>
          )}
        </div>
      </div>

      {tile && (
        <ConfirmDialog
          open={deleteOpen}
          title={t("tile.delete_title")}
          description={t("tile.delete_description", { name: tile.name })}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          isPending={del.isPending}
        />
      )}
    </Modal>
  );
}
