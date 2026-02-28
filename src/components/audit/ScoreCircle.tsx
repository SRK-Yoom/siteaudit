"use client";

import { useEffect, useState } from "react";

interface ScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

function getColor(score: number) {
  if (score >= 90) return { stroke: "#4ade80", text: "text-green-400", label: "Excellent", ring: "#4ade8040" };
  if (score >= 70) return { stroke: "#818cf8", text: "text-indigo-400", label: "Good", ring: "#818cf840" };
  if (score >= 50) return { stroke: "#fbbf24", text: "text-amber-400", label: "Needs Work", ring: "#fbbf2440" };
  return { stroke: "#f87171", text: "text-red-400", label: "Critical", ring: "#f8717140" };
}

export function ScoreCircle({ score, size = 220, strokeWidth = 14, animate = true }: ScoreCircleProps) {
  const [display, setDisplay] = useState(animate ? 0 : score);
  const [progress, setProgress] = useState(animate ? 0 : score);

  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;
  const color = getColor(score);

  useEffect(() => {
    if (!animate) return;
    const duration = 1600;
    const start = performance.now();
    const raf = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * score));
      setProgress(eased * score);
      if (t < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [score, animate]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: `drop-shadow(0 0 28px ${color.ring})`,
        }}
      >
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-black tabular-nums leading-none ${color.text}`}>
            {display}
          </span>
          <span className="text-sm text-white/30 font-medium mt-1">out of 100</span>
        </div>
      </div>
      <span
        className={`text-sm font-bold px-4 py-1.5 rounded-full bg-white/5 border border-white/10 ${color.text}`}
      >
        {color.label}
      </span>
    </div>
  );
}
