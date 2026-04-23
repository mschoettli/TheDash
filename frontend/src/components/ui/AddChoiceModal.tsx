import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Link2 } from "lucide-react";
import Modal from "./Modal";
import TileEditModal from "../tiles/TileEditModal";
import LinkEditModal from "../links/LinkEditModal";

interface AddChoiceModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddChoiceModal({ open, onClose }: AddChoiceModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"widget" | "link" | null>(null);

  const handleClose = () => {
    setMode(null);
    onClose();
  };

  if (mode === "widget") {
    return <TileEditModal open onClose={handleClose} />;
  }
  if (mode === "link") {
    return <LinkEditModal open onClose={handleClose} />;
  }

  return (
    <Modal open={open} onClose={onClose} title={t("add.title")} maxWidth="max-w-sm">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setMode("widget")}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
        >
          <LayoutGrid
            size={32}
            className="text-slate-400 group-hover:text-indigo-500 transition-colors"
          />
          <div className="text-center">
            <div className="font-semibold text-sm text-slate-700 dark:text-slate-200">
              {t("add.widget")}
            </div>
            <div className="text-xs text-slate-400 mt-1">{t("add.widget_desc")}</div>
          </div>
        </button>
        <button
          onClick={() => setMode("link")}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
        >
          <Link2
            size={32}
            className="text-slate-400 group-hover:text-indigo-500 transition-colors"
          />
          <div className="text-center">
            <div className="font-semibold text-sm text-slate-700 dark:text-slate-200">
              {t("add.link")}
            </div>
            <div className="text-xs text-slate-400 mt-1">{t("add.link_desc")}</div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
