"use client";

import { useEffect, useState } from "react";

interface ScorePillarProps {
  label: string;
  description: string;
  score: number;
  points: number;
  maxPoints: number;
  delay?: number;
  icon: React.ReactNode;
}

function getAccentColor(score: number) {
  if (score >= 90) return { bar: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", text: "#059669" };
  if (score >= 70) return { bar: "#7C3AED", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.15)", text: "#7C3AED" };
  if (score >= 50) return { bar: "#F59E0B", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.2)", text: "#D97706" };
  return { bar: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.18)", text: "#DC2626" };
}

function getLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

export function ScorePillar({ label, description, score, points, maxPoints, delay = 0, icon }: ScorePillarProps) {
  const [width, setWidth] = useState(0);
  const safeScore = score ?? 0;
  const safePoints = points ?? 0;
  const safeMaxPoints = maxPoints ?? 100;
  const accent = getAccentColor(safeScore);

  useEffect(() => {
    const t = setTimeout(() => setWidth(safeScore), delay);
    return () => clearTimeout(t);
  }, [safeScore, delay]);

  return (
    <div className="card rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accent.bg, border: `1px solid ${accent.border}`, color: accent.text }}
          >
            {icon}
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">{label || "—"}</p>
            <p className="text-xs text-ink-3 mt-0.5 leading-snug">{description}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-black tabular-nums" style={{ color: accent.text }}>{safeScore}</span>
          <span className="text-xs text-ink-4 ml-0.5">/100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, background: accent.bar }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color: accent.text, background: accent.bg, border: `1px solid ${accent.border}` }}
        >
          {getLabel(safeScore)}
        </span>
        <span className="text-xs text-ink-4">
          <span className="text-ink-3 font-medium">{safePoints}</span> / {safeMaxPoints} pts
        </span>
      </div>
    </div>
  );
}
