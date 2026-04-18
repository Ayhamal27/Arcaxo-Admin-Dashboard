'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';

interface TooltipHintProps {
  text: string;
}

export function TooltipHint({ text }: TooltipHintProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span className="relative inline-flex">
      <Info
        size={12}
        className="text-[#9CA3AF] cursor-pointer"
        onMouseEnter={(e) => {
          const rect = (e.currentTarget as Element).getBoundingClientRect();
          setPos({ x: rect.left + rect.width / 2, y: rect.bottom });
        }}
        onMouseLeave={() => setPos(null)}
      />
      {pos && (
        <span
          className="fixed z-50 -translate-x-1/2 rounded px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal whitespace-nowrap pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y + 6,
            backgroundColor: '#191919',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
