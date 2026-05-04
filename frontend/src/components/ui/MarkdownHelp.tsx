import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

const examples = [
  { key: "heading", syntax: "# Heading\n## Section" },
  { key: "emphasis", syntax: "**Bold**\n*Italic*" },
  { key: "lists", syntax: "- Item\n1. Step" },
  { key: "checklists", syntax: "- [ ] Open task\n- [x] Done task" },
  { key: "links", syntax: "[TheDash](https://example.com)" },
  { key: "images", syntax: "![Alt text](https://example.com/image.png)" },
  { key: "code", syntax: "`inline code`\n\n```bash\ncommand\n```" },
  { key: "tables", syntax: "| Name | Value |\n| --- | --- |\n| API | Ready |" },
  { key: "quotes", syntax: "> Important note" },
  { key: "wiki_links", syntax: "[[Runbook]]\n[[Service|Display name]]" },
];

export function MarkdownHelpButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-surface/70 px-2.5 py-1 text-[11px] font-semibold text-t2 transition-colors hover:border-accent/40 hover:text-accent"
      >
        <HelpCircle size={12} />
        {t("markdown_help.open")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("markdown_help.title")} maxWidth="max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((example) => (
            <div key={example.key} className="rounded-2xl border border-line/60 bg-card/70 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-t2">
                {t(`markdown_help.${example.key}`)}
              </div>
              <pre className="overflow-x-auto rounded-xl bg-surface/80 p-3 text-[12px] leading-5 text-t1">
                <code>{example.syntax}</code>
              </pre>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
