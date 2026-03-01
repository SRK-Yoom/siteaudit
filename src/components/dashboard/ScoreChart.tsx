"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint { date: string; score: number }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const color = score >= 90 ? "#059669" : score >= 70 ? "#7C3AED" : score >= 50 ? "#D97706" : "#DC2626";
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-ink-4 mb-1">{label}</p>
      <p className="text-xl font-black" style={{ color }}>{score}<span className="text-xs text-ink-4 font-normal ml-1">/100</span></p>
    </div>
  );
}

export function ScoreChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-ink-4 text-sm">Run your first audit to see score history</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(124,58,237,0.15)", strokeWidth: 1 }} />
        <Area type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2.5} fill="url(#scoreGrad)"
          dot={{ r: 4, fill: "#7C3AED", strokeWidth: 2, stroke: "#FFFFFF" }}
          activeDot={{ r: 6, fill: "#A855F7", strokeWidth: 2, stroke: "#FFFFFF" }}
          animationDuration={800} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
