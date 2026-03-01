"use client";

import { useEffect, useRef } from "react";

interface ScoreCircleProps {
  score: number;
  size?: number;
}

function getGradientId(score: number) {
  if (score >= 90) return "grad-excellent";
  if (score >= 70) return "grad-good";
  if (score >= 50) return "grad-fair";
  return "grad-poor";
}

function getLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Critical";
}

function getLabelColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 70) return "#7C3AED";
  if (score >= 50) return "#D97706";
  return "#DC2626";
}

export function ScoreCircle({ score, size = 200 }: ScoreCircleProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const r = (size / 2) * 0.78;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeWidth = size * 0.055;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(circumference);
    const t = setTimeout(() => {
      el.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.34,1.1,0.64,1)";
      el.style.strokeDashoffset = String(circumference - (score / 100) * circumference);
    }, 150);
    return () => clearTimeout(t);
  }, [score, circumference]);

  const gradId = getGradientId(score);
  const label = getLabel(score);
  const labelColor = getLabelColor(score);

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="score-glow">
        <defs>
          <linearGradient id="grad-excellent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="grad-good" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id="grad-fair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="grad-poor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />

        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Score number */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fontWeight="900"
          fill="#0F0A1E"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {score}
        </text>
        <text
          x={cx} y={cy + size * 0.14}
          textAnchor="middle"
          fontSize={size * 0.075}
          fill="#9CA3AF"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
        >
          / 100
        </text>
      </svg>

      {/* Label badge */}
      <div
        className="mt-2 px-3 py-1 rounded-full text-xs font-bold"
        style={{
          color: labelColor,
          background: `${labelColor}14`,
          border: `1px solid ${labelColor}25`,
        }}
      >
        {label}
      </div>
    </div>
  );
}
