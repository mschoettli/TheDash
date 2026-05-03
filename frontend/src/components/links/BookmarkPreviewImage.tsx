import { Camera, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRefreshLinkPreview } from "../../hooks/useLinks";
import FaviconImg from "../ui/FaviconImg";
import RemoteImage from "../ui/RemoteImage";

interface BookmarkPreviewImageProps {
  link: Link;
  variant?: "card" | "drawer";
  showRefresh?: boolean;
}

export default function BookmarkPreviewImage({
  link,
  variant = "card",
  showRefresh = false,
}: BookmarkPreviewImageProps) {
  const { t } = useTranslation();
  const refreshPreview = useRefreshLinkPreview();
  const [imageFailed, setImageFailed] = useState(false);
  const [requestedFallback, setRequestedFallback] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setRequestedFallback(false);
  }, [link.id, link.image_url]);

  const preferredSource = useMemo(() => {
    if (link.image_url && !imageFailed) return link.image_url;
    if (link.screenshot_url && link.screenshot_status === "ready") return link.screenshot_url;
    return null;
  }, [imageFailed, link.image_url, link.screenshot_status, link.screenshot_url]);

  const shouldRequestScreenshot =
    imageFailed &&
    !link.screenshot_url &&
    link.screenshot_status !== "pending" &&
    !refreshPreview.isPending &&
    !requestedFallback;

  useEffect(() => {
    if (!shouldRequestScreenshot) return;
    setRequestedFallback(true);
    refreshPreview.mutate(link.id);
  }, [link.id, refreshPreview, shouldRequestScreenshot]);

  const heightClass = variant === "drawer" ? "h-52" : "h-40";
  const fallback = (
    <div className={`${heightClass} flex items-center justify-center border-b border-line/40 bg-card/70`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <FaviconImg url={link.url} name={link.name} explicitIconUrl={link.icon_url} size={variant === "drawer" ? 52 : 30} />
        {link.screenshot_status === "pending" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-t3">
            <RefreshCw size={12} className="animate-spin" />
            {t("link.preview_pending")}
          </span>
        )}
        {link.screenshot_status === "failed" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-t3">
            <Camera size={12} />
            {t("link.preview_failed")}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative overflow-hidden bg-card ${variant === "drawer" ? "" : "rounded-t-xl"}`}>
      <RemoteImage
        src={preferredSource}
        className={`${heightClass} w-full object-cover`}
        fallback={fallback}
        onError={() => {
          if (preferredSource === link.image_url) setImageFailed(true);
        }}
      />
      {showRefresh && (
        <button
          type="button"
          onClick={() => refreshPreview.mutate(link.id)}
          disabled={refreshPreview.isPending}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-surface/85 px-2.5 py-1 text-[11px] font-semibold text-t2 shadow-sm backdrop-blur transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshPreview.isPending ? "animate-spin" : ""} />
          {t("link.refresh_preview")}
        </button>
      )}
    </div>
  );
}
