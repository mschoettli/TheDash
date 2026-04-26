import { ReactNode, useState } from "react";

interface RemoteImageProps {
  src: string | null;
  alt?: string;
  className?: string;
  fallback: ReactNode;
}

export default function RemoteImage({ src, alt = "", className = "", fallback }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      src={`/api/image?url=${encodeURIComponent(src)}`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
