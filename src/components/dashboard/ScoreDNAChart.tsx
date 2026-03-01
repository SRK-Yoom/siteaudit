"use client";

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import type { IndustryKey } from "./IndustryOnboarding";

// Industry average scores per pillar (0–100)
// Ordered: Performance, TechnicalSEO, Content, GEO, AEO, Accessibility, CRO, Analytics
export const INDUSTRY_BENCHMARKS: Record<string, number[]> = {
  ecommerce:             [60, 65, 62, 45, 30, 58, 72, 78],
  saas:                  [68, 72, 65, 55, 42, 62, 75, 82],
  real_estate:           [52, 58, 58, 48, 35, 50, 65, 52],
  professional_services: [50, 58, 55, 45, 30, 50, 60, 48],
  healthcare:            [48, 55, 52, 42, 28, 55, 58, 45],
  financial:             [58, 65, 60, 50, 35, 60, 62, 68],
  hospitality:           [55, 58, 60, 48, 30, 52, 70, 58],
  education:             [52, 60, 65, 48, 38, 58, 55, 48],
  media:                 [62, 65, 72, 55, 45, 60, 52, 65],
  local_business:        [48, 52, 50, 42, 28, 48, 65, 42],
  nonprofit:             [45, 52, 55, 40, 30, 52, 55, 38],
  recruitment:           [55, 60, 58, 48, 35, 55, 65, 58],
  legal:                 [48, 55, 55, 45, 30, 52, 58, 45],
  fitness:               [55, 58, 55, 45, 30, 55, 68, 50],
  manufacturing:         [45, 52, 50, 42, 25, 48, 52, 40],
};

const PILLAR_LABELS = ["Performance", "Tech SEO", "Content", "GEO", "AEO", "A11y", "Conversion", "Analytics"];

interface Props {
  pillars: Record<string, { score: number }>;
  industry?: string | null;
}

export function ScoreDNAChart({ pillars, industry }: Props) {
  const pillarKeys = ["performance", "technicalSeo", "contentKeywords", "geoReadiness", "aeoReadiness", "accessibility", "cro", "analytics"];

  const benchmarks = industry ? INDUSTRY_BENCHMARKS[industry] : null;

  const data = PILLAR_LABELS.map((label, i) => {
    const key = pillarKeys[i];
    return {
      subject: label,
      score: pillars[key]?.score ?? 0,
      benchmark: benchmarks ? benchmarks[i] : undefined,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="rgba(124,58,237,0.12)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fontWeight: 600, fill: "#6B7280" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: "#9CA3AF" }}
          tickCount={4}
        />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, fontSize: 12 }}
          formatter={(value) => [`${value ?? 0}`]}
        />
        {benchmarks && (
          <Radar
            name="Industry Avg"
            dataKey="benchmark"
            stroke="#D1D5DB"
            fill="#D1D5DB"
            fillOpacity={0.15}
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
        )}
        <Radar
          name="Your Score"
          dataKey="score"
          stroke="#7C3AED"
          fill="url(#dnaGradient)"
          fillOpacity={0.35}
          strokeWidth={2}
        />
        <defs>
          <radialGradient id="dnaGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#DB2777" stopOpacity={0.2} />
          </radialGradient>
        </defs>
        {benchmarks && (
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => value === "score" ? "Your Score" : "Industry Avg"}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
