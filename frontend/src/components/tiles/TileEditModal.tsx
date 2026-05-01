import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Image } from "lucide-react";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useCreateTile, useUpdateTile, useDeleteTile, Tile, TileProvider } from "../../hooks/useTiles";
import { useDashboard, useCreateDashboardItem } from "../../hooks/useDashboard";
import IconPicker from "../ui/IconPicker";
import IconBadge from "../ui/IconBadge";
import { detectIconKey, iconValue, isRegistryIcon, logoLabelFromValue } from "../../lib/iconRegistry";

const input =
  "w-full rounded-xl border border-line/50 bg-card px-3 py-2 text-[13px] text-t1 outline-none placeholder:text-t3 focus:border-accent/50";

interface Props {
  open: boolean;
  onClose: () => void;
  tile?: Tile;
  initial?: Partial<Tile>;
  defaultSectionId?: number | null;
}

const STYLE_OPTIONS: { value: Tile["style"]; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "compact", label: "Compact" },
  { value: "minimal", label: "Minimal" },
  { value: "banner", label: "Banner" },
  { value: "metric", label: "Metric" },
];

const PROVIDER_OPTIONS: { value: TileProvider; label: string }[] = [
  { value: "none", label: "None" },
  { value: "jellyfin", label: "Jellyfin" },
  { value: "plex", label: "Plex" },
  { value: "emby", label: "Emby" },
];

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

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line/45 bg-card/55 p-4">
      <div className="label-xs mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function IconPickerModal({
  open,
  onClose,
  iconUrl,
  name,
  url,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  iconUrl: string;
  name: string;
  url: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t("modal.change_logo")} maxWidth="max-w-md">
      <div className="space-y-4">
        <div>
          <div className="label-xs mb-1.5">{t("modal.logo_url_key")}</div>
          <input
            className={input}
            value={iconUrl}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... or logo:selfhst:jellyfin"
          />
        </div>
        <IconPicker
          value={isRegistryIcon(iconUrl) ? iconUrl : null}
          name={name}
          url={url}
          onChange={onChange}
        />
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-accent py-2.5 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
        >
          {t("modal.apply_logo")}
        </button>
      </div>
    </Modal>
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
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [style, setStyle] = useState<Tile["style"]>(tile?.style ?? initial?.style ?? "card");
  const [apiUrl, setApiUrl] = useState(tile?.api_url ?? initial?.api_url ?? "");
  const [apiKey, setApiKey] = useState(tile?.api_key ?? initial?.api_key ?? "");
  const [provider, setProvider] = useState<TileProvider>(tile?.provider ?? initial?.provider ?? "none");
  const [showAddress, setShowAddress] = useState(tile?.show_address ?? initial?.show_address ?? true);
  const [sectionId, setSectionId] = useState<number | null>(defaultSectionId ?? sections[0]?.id ?? null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
    setIconPickerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || tile || initial?.icon_url || iconTouched || (!name.trim() && !url.trim())) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/logos/resolve?${new URLSearchParams({ name, url }).toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((result) => {
          if (result.status === "found" && result.value) setIconUrl(result.value);
          else if (!iconUrl) setIconUrl(iconValue(detectIconKey(name)));
        })
        .catch(() => { if (!iconUrl) setIconUrl(iconValue(detectIconKey(name))); });
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [open, tile, initial, iconTouched, iconUrl, name, url]);

  useEffect(() => {
    if (provider === "none" || apiUrl.trim()) return;
    setApiUrl(normalizeServiceUrl(url));
  }, [provider]);

  const create = useCreateTile();
  const update = useUpdateTile();
  const del = useDeleteTile();
  const createDashboardItem = useCreateDashboardItem();
  const isSaving = create.isPending || update.isPending;
  const previewIcon = iconUrl || iconValue(detectIconKey(name));
  const iconLabel = logoLabelFromValue(previewIcon) ?? previewIcon;

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
      update.mutate({ id: tile.id, ...data }, {
        onSuccess: onClose,
        onError: (err) => setSaveError(err instanceof Error ? err.message : "Save failed"),
      });
    } else {
      create.mutate(data, {
        onSuccess: (newTile) => {
          if (sectionId != null) {
            const section = sections.find((s) => s.id === sectionId);
            createDashboardItem.mutate(
              { section_id: sectionId, item_type: "tile", item_id: newTile.id, sort_order: section?.items.length ?? 0 },
              { onSuccess: onClose, onError: (err) => setSaveError(err instanceof Error ? err.message : "Add failed") }
            );
          } else {
            setSaveError("Tile saved. Create a section first to show it on the dashboard.");
          }
        },
        onError: (err) => setSaveError(err instanceof Error ? err.message : "Create failed"),
      });
    }
  };

  const handleDelete = () => {
    if (!tile) return;
    del.mutate(tile.id, {
      onSuccess: onClose,
      onError: (err) => setSaveError(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEdit ? t("tile.edit_title") : t("tile.add_title")} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <FieldGroup title={t("modal.identity")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="label-xs mb-1.5">{t("tile.name")} *</div>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jellyfin" />
              </div>
              <div>
                <div className="label-xs mb-1.5">{t("tile.url")} *</div>
                <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://server:8080" />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-line/40 bg-surface/45 p-3">
              <IconBadge value={previewIcon} name={name} size={38} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-t1">{name || t("modal.automatic_logo")}</div>
                <div className="truncate text-[11px] text-t3">{iconLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setIconPickerOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line/50 px-3 py-2 text-[12px] font-semibold text-t2 transition-colors hover:border-accent/35 hover:text-accent"
              >
                <Image size={13} /> {t("modal.change_logo")}
              </button>
            </div>
          </FieldGroup>

          <FieldGroup title={t("modal.display")}>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line/45 bg-surface/40 p-1 sm:grid-cols-5">
              {STYLE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStyle(value)}
                  className={`rounded-lg px-2 py-2 text-[12px] font-semibold transition-colors ${
                    style === value ? "bg-accent text-bg shadow-sm" : "text-t3 hover:bg-line/25 hover:text-t1"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-1 items-center justify-between rounded-xl border border-line/45 bg-surface/40 px-3 py-2.5 text-[13px] font-medium text-t2">
                {t("tile.show_address")}
                <input type="checkbox" checked={showAddress} onChange={(e) => setShowAddress(e.target.checked)} />
              </label>
              {!isEdit && sections.length > 0 && (
                <select
                  className={`${input} sm:max-w-56`}
                  value={sectionId ?? ""}
                  onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              )}
            </div>
          </FieldGroup>

          <FieldGroup title={t("modal.integration")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="label-xs mb-1.5">Provider</div>
                <select value={provider} onChange={(e) => setProvider(e.target.value as TileProvider)} className={input}>
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.value === "none" ? t("modal.none") : option.label}</option>
                  ))}
                </select>
              </div>
              {provider !== "none" && (
                <div>
                  <div className="label-xs mb-1.5">{t("tile.api")}</div>
                  <input className={input} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="http://media-server:8096" />
                </div>
              )}
              {provider !== "none" && (
                <div className="sm:col-span-2">
                  <div className="label-xs mb-1.5">{t("tile.api_key")}</div>
                  <input className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Token (optional)" />
                </div>
              )}
            </div>
          </FieldGroup>

          {saveError && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-500">
              <AlertCircle size={13} className="shrink-0" />
              {saveError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!name.trim() || !url.trim() || isSaving}
              className="flex-1 rounded-xl bg-accent py-2.5 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isSaving ? t("common.saving") : t("tile.save")}
            </button>
            {isEdit && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="rounded-xl border border-line/60 px-4 py-2.5 text-[13px] font-semibold text-t2 transition-colors hover:border-rose-400/40 hover:text-rose-400"
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

      <IconPickerModal
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        iconUrl={iconUrl}
        name={name}
        url={url}
        onChange={(v) => { setIconTouched(true); setIconUrl(v); }}
      />
    </>
  );
}
