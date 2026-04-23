import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import AddChoiceModal from "./AddChoiceModal";

export default function AddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center"
        style={{ background: "rgb(var(--accent))" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Hinzufügen"
      >
        <Plus size={24} />
      </motion.button>
      <AddChoiceModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
