import { ReactNode, useState } from "react";

interface RemoteImageProps {
  src: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
  onError?: () => void;
}

export default function RemoteImage({ src, alt = "", className = "", fallback, onError }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback}</>;
  const imageSrc = src.startsWith("/") ? src : `/api/image?url=${encodeURIComponent(src)}`;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}
