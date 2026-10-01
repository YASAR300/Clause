"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(94, 106, 210, 0.14)",
  radius = "rounded-xl",
  ...props
}) {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--mouse-x", `-1000px`);
    cardRef.current.style.setProperty("--mouse-y", `-1000px`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative overflow-hidden border border-border bg-surface",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)] transition-all duration-300",
        "hover:border-border-strong",
        radius,
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, -1000px) var(--mouse-y, -1000px), ${spotlightColor}, transparent 60%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
