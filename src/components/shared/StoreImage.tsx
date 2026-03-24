'use client';

import { useState, useEffect } from 'react';
import { Store } from 'lucide-react';
import { getFacadeSignedUrlAction } from '@/actions/stores/get-facade-signed-url';

interface StoreImageProps {
  src?: string | null;
  alt: string;
  size?: number;
}

export function StoreImage({ src, alt, size = 71 }: StoreImageProps) {
  const [error, setError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    // If already a full URL, use immediately (no flash)
    if (src?.startsWith('http://') || src?.startsWith('https://')) return src;
    return null;
  });

  useEffect(() => {
    if (!src) return;
    // Full URLs are already set via initializer
    if (src.startsWith('http://') || src.startsWith('https://')) return;

    // Bucket path — resolve to signed URL
    let cancelled = false;
    getFacadeSignedUrlAction(src).then((url) => {
      if (!cancelled) setResolvedSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || error || !resolvedSrc) {
    return (
      <div
        className="rounded-[5px] bg-[#F0F0F5] flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Store className="w-6 h-6 text-[#D0D5DD]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      width={size}
      height={size}
      className="rounded-[5px] object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
