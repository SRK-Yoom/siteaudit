"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  score: number;
  label?: string;
}

interface ScoreChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const color = score >= 90 ? "#4ade80" : score >= 70 ? "#818cf8" : score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="bg-ink-light border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-xl font-black" style={{ color }}>{score}<span className="text-xs text-white/40 font-normal ml-1">/100</span></p>
    </div>
  );
}

export function ScoreChart({ data }: ScoreChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-white/25 text-sm">Run your first audit to see your score history</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#0a0a0f" }}
          activeDot={{ r: 6, fill: "#818cf8", strokeWidth: 2, stroke: "#0a0a0f" }}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
