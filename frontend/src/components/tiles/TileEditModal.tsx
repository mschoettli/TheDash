import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import { useCreateTile, useUpdateTile, useDeleteTile, Tile, TileProvider } from "../../hooks/useTiles";
import IconPicker from "../ui/IconPicker";
import { detectIconKey, iconValue, isRegistryIcon } from "../../lib/iconRegistry";

const input = "w-full rounded-lg border border-line/60 bg-card px-3 py-2 text-[13px] text-t1 outline-none focus:border-accent/50 placeholder:text-t3";
const selectCls = `${input} appearance-none`;

interface Props {
  open: boolean;
  onClose: () => void;
  tile?: Tile;
  initial?: Partial<Tile>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-xs mb-1.5">{label}</div>
      {children}
    </div>
  );
}

export default function TileEditModal({ open, onClose, tile, initial }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(tile);

  const [name, setName] = useState(tile?.name ?? initial?.name ?? "");
  const [url, setUrl] = useState(tile?.url ?? initial?.url ?? "");
  const [iconUrl, setIconUrl] = useState(tile?.icon_url ?? initial?.icon_url ?? "");
  const [style, setStyle] = useState<Tile["style"]>(tile?.style ?? initial?.style ?? "card");
  const [apiUrl, setApiUrl] = useState(tile?.api_url ?? initial?.api_url ?? "");
  const [apiKey, setApiKey] = useState(tile?.api_key ?? initial?.api_key ?? "");
  const [provider, setProvider] = useState<TileProvider>(tile?.provider ?? initial?.provider ?? "none");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(tile?.name ?? initial?.name ?? "");
      setUrl(tile?.url ?? initial?.url ?? "");
      setIconUrl(tile?.icon_url ?? initial?.icon_url ?? "");
      setStyle(tile?.style ?? initial?.style ?? "card");
      setApiUrl(tile?.api_url ?? initial?.api_url ?? "");
      setApiKey(tile?.api_key ?? initial?.api_key ?? "");
      setProvider(tile?.provider ?? initial?.provider ?? "none");
      setConfirmDelete(false);
    }
  }, [open, tile, initial]);

  useEffect(() => {
    if (!open || tile || initial?.icon_url || iconUrl) return;
    if (name.trim()) setIconUrl(iconValue(detectIconKey(name)));
  }, [open, tile, initial, iconUrl, name]);

  const create = useCreateTile();
  const update = useUpdateTile();
  const del = useDeleteTile();

  const handleSave = () => {
    const data = { name, url, icon_url: iconUrl || null, style, api_url: apiUrl || null, api_key: apiKey || null, provider, sort_order: tile?.sort_order ?? 0 };
    if (isEdit && tile) update.mutate({ id: tile.id, ...data }, { onSuccess: onClose });
    else create.mutate(data, { onSuccess: onClose });
  };

  const handleDelete = () => {
    if (!tile) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    del.mutate(tile.id, { onSuccess: onClose });
  };

  const styleOptions = [
    { value: "card" as const, label: t("settings.style_card") },
    { value: "compact" as const, label: t("settings.style_compact") },
    { value: "minimal" as const, label: t("settings.style_minimal") },
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
          <input className={input} value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
        </Field>

        <IconPicker value={isRegistryIcon(iconUrl) ? iconUrl : null} name={name} onChange={setIconUrl} />

        <Field label={t("tile.style")}>
          <div className="inline-flex overflow-hidden rounded-lg border border-line/60">
            {styleOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStyle(value)}
                className={`flex-1 py-1.5 px-3 text-[13px] font-medium transition-colors ${
                  style === value ? "bg-accent text-bg" : "text-t2 hover:bg-line/30 hover:text-t1"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

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

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!name || !url}
            className="flex-1 rounded-lg bg-accent py-2 text-[13px] font-semibold text-bg disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {t("tile.save")}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                confirmDelete
                  ? "bg-rose-500 text-white"
                  : "border border-line text-t2 hover:border-rose-400/40 hover:text-rose-400"
              }`}
            >
              {confirmDelete ? t("common.yes") : t("tile.delete")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
