import { ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
          <motion.div
            className={`modal-panel relative flex max-h-[calc(100vh-2rem)] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-line/70 shadow-2xl`}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.14 }}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-line/60 px-5 py-3.5">
                <h2 className="text-[15px] font-semibold text-t1">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-line/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
