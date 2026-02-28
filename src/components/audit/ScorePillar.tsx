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

function getBar(score: number) {
  if (score >= 90) return "bg-green-400";
  if (score >= 70) return "bg-indigo-400";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

function getBadge(score: number): { text: string; cls: string } {
  if (score >= 90) return { text: "Excellent", cls: "text-green-400 bg-green-400/10 border-green-400/20" };
  if (score >= 70) return { text: "Good", cls: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" };
  if (score >= 50) return { text: "Fair", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  return { text: "Poor", cls: "text-red-400 bg-red-400/10 border-red-400/20" };
}

export function ScorePillar({ label, description, score, points, maxPoints, delay = 0, icon }: ScorePillarProps) {
  const [width, setWidth] = useState(0);
  const bar = getBar(score);
  const badge = getBadge(score);

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/60 shrink-0">
            {icon}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{label}</p>
            <p className="text-xs text-white/40 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-2xl font-black text-white tabular-nums">{score}</span>
          <span className="text-xs text-white/30 ml-1">/100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${bar}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
          {badge.text}
        </span>
        <span className="text-xs text-white/30">
          <span className="text-white/60 font-medium">{points}</span> / {maxPoints} pts
        </span>
      </div>
    </div>
  );
}
