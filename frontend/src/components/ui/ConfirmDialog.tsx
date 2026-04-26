import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onCancel,
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-line/60 bg-card p-3">
          <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${destructive ? "bg-rose-500/10 text-rose-500" : "bg-accent/10 text-accent"}`}>
            <AlertTriangle size={18} />
          </span>
          <p className="text-[13px] leading-6 text-t2">{description}</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium text-t2 transition-colors hover:bg-line/20 hover:text-t1 disabled:opacity-50"
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${destructive ? "bg-rose-500 text-white" : "bg-accent text-bg"}`}
          >
            {confirmLabel ?? t("common.delete")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
