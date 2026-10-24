import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Fração preenchida, 0–1 (acima de 1 fica cheio). */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Cor do arco via text-* (ex.: "text-primary", "text-warning"). */
  className?: string;
  trackClassName?: string;
  /** Conteúdo no centro do anel (ex.: o percentual). */
  children?: React.ReactNode;
  label?: string;
}

export function ProgressRing({
  value,
  size = 88,
  strokeWidth = 8,
  className,
  trackClassName,
  children,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(Math.max(value, 0), 1);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn("stroke-muted", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
          className={cn("text-primary transition-[stroke-dashoffset] duration-700 ease-out", className)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
