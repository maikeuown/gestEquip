'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  targetRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  visible: boolean;
}

export default function Tooltip({ targetRef, children, visible }: TooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible || !targetRef.current || !tooltipRef.current || !mounted) return;

    const updatePosition = () => {
      const rect = targetRef.current!.getBoundingClientRect();
      const tooltipRect = tooltipRef.current!.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // Default: position below the target, centered horizontally
      let top = rect.bottom + 8;
      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

      // Flip up if near bottom edge
      if (top + tooltipRect.height > viewportH - 16) {
        top = rect.top - tooltipRect.height - 8;
      }

      // Clamp horizontally
      if (left < 8) left = 8;
      if (left + tooltipRect.width > viewportW - 8) {
        left = viewportW - tooltipRect.width - 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [visible, targetRef, mounted]);

  if (!visible || !mounted) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999] bg-slate-900 text-white text-sm rounded-lg shadow-xl border border-slate-700 p-3 max-w-sm pointer-events-none"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body,
  );
}
