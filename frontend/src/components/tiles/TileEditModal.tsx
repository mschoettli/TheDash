import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import { useCreateTile, useUpdateTile, useDeleteTile, Tile, TileProvider } from "../../hooks/useTiles";

interface Props {
  open: boolean;
  onClose: () => void;
  tile?: Tile;
}

export default function TileEditModal({ open, onClose, tile }: Props) {
  const { t } = useTranslation();
  const isEdit = Boolean(tile);

  const [name, setName] = useState(tile?.name ?? "");
  const [url, setUrl] = useState(tile?.url ?? "");
  const [iconUrl, setIconUrl] = useState(tile?.icon_url ?? "");
  const [style, setStyle] = useState<Tile["style"]>(tile?.style ?? "card");
  const [apiUrl, setApiUrl] = useState(tile?.api_url ?? "");
  const [apiKey, setApiKey] = useState(tile?.api_key ?? "");
  const [provider, setProvider] = useState<TileProvider>(tile?.provider ?? "none");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(tile?.name ?? "");
      setUrl(tile?.url ?? "");
      setIconUrl(tile?.icon_url ?? "");
      setStyle(tile?.style ?? "card");
      setApiUrl(tile?.api_url ?? "");
      setApiKey(tile?.api_key ?? "");
      setProvider(tile?.provider ?? "none");
      setConfirmDelete(false);
    }
  }, [open, tile]);

  const create = useCreateTile();
  const update = useUpdateTile();
  const del = useDeleteTile();

  const handleSave = () => {
    const data = {
      name,
      url,
      icon_url: iconUrl || null,
      style,
      api_url: apiUrl || null,
      api_key: apiKey || null,
      provider,
      sort_order: tile?.sort_order ?? 0,
    };

    if (isEdit && tile) {
      update.mutate({ id: tile.id, ...data }, { onSuccess: onClose });
    } else {
      create.mutate(data, { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (!tile) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    del.mutate(tile.id, { onSuccess: onClose });
  };

  const styleOptions: Array<{ value: Tile["style"]; label: string }> = [
    { value: "card", label: t("settings.style_card") },
    { value: "compact", label: t("settings.style_compact") },
    { value: "minimal", label: t("settings.style_minimal") },
  ];

  const providerOptions: Array<{ value: TileProvider; label: string }> = [
    { value: "none", label: t("tile.provider_none") },
    { value: "jellyfin", label: "Jellyfin" },
    { value: "plex", label: "Plex" },
    { value: "emby", label: "Emby" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t("tile.edit_title") : t("tile.add_title")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.name")} *
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Service"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.url")} *
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://server:8080"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.icon")}
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.style")}
          </label>
          <div className="flex gap-2">
            {styleOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStyle(value)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  style === value
                    ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.provider")}
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as TileProvider)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {providerOptions.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.api")}
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://media-server:8096"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t("tile.api_key")}
          </label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Optional token"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!name || !url}
            className="flex-1 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {t("tile.save")}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                confirmDelete
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500"
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