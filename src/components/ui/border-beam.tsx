"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
}

export default function BorderBeam({
  className,
  size = 80,
  duration = 10,
  colorFrom = "#A3BFA8",
  colorTo = "#7D9B84",
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--color-from": colorFrom,
          "--color-to": colorTo,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:1px_solid_transparent]",
        "[background:linear-gradient(white,white)_padding-box,conic-gradient(from_var(--angle),transparent_0%,var(--color-from)_40%,var(--color-to)_60%,transparent_100%)_border-box]",
        "[animation:border-beam_calc(var(--duration)*1s)_linear_infinite]",
        className
      )}
    />
  );
}
