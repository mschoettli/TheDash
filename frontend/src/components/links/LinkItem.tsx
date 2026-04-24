import { useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { Link } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import LinkEditModal from "./LinkEditModal";

interface Props {
  link: Link;
  onPreview?: (link: Link) => void;
}

export default function LinkItem({ link, onPreview }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const content = (
    <>
      <FaviconImg
        url={link.url}
        name={link.name}
        size={20}
        explicitIconUrl={link.icon_url}
      />
      <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
        {link.name}
      </span>
    </>
  );

  return (
    <div className="group relative flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      {onPreview ? (
        <button
          onClick={() => onPreview(link)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {content}
        </button>
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          {content}
        </a>
      )}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-slate-600 transition-all"
      >
        <ExternalLink size={13} />
      </a>
      <button
        onClick={() => setEditOpen(true)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-indigo-500 transition-all"
      >
        <Pencil size={13} />
      </button>
      <LinkEditModal open={editOpen} onClose={() => setEditOpen(false)} link={link} />
    </div>
  );
}
