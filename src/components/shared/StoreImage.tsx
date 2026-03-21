'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';

interface StoreImageProps {
  src?: string | null;
  alt: string;
  size?: number;
}

export function StoreImage({ src, alt, size = 71 }: StoreImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
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
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-[5px] object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
