"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export interface MonthRevenue {
  month: string; // e.g. "1月"
  product: number;
  experience: number;
  discount?: number; // 行銷折扣消耗
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#EDE8DC] rounded-xl px-4 py-3 shadow-md text-xs">
      <p className="font-semibold text-[#3D4A42] mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="mb-0.5">
          {p.name}：NT${p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function RevenueChart({ data }: { data: MonthRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#6B8872" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6B8872" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `NT$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#6B8872", paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="product"
          name="產品營收"
          stroke="#7D9B84"
          strokeWidth={2}
          dot={{ r: 3, fill: "#7D9B84" }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="experience"
          name="體驗營收"
          stroke="#D97706"
          strokeWidth={2}
          dot={{ r: 3, fill: "#D97706" }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="discount"
          name="折扣消耗"
          stroke="#9333EA"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={{ r: 2, fill: "#9333EA" }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
