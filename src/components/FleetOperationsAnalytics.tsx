import React, { useState } from 'react';
import { TrendingUp, Activity } from 'lucide-react';

export const FleetOperationsAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'sales' | 'occupancy'>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tabsData = {
    revenue: {
      points: [14.2, 16.5, 18.9, 21.4, 23.2, 24.85],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      peakValue: '₦24,850,000',
      peakLabel: 'INTERACTIVE PEAK',
      format: (val: number) => `₦${(val).toFixed(1)}M`,
    },
    sales: {
      points: [380, 510, 640, 780, 910, 1140],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      peakValue: '1,140 Trips',
      peakLabel: 'INTERACTIVE PEAK',
      format: (val: number) => `${val} Trips`,
    },
    occupancy: {
      points: [60, 68, 76, 82, 89, 96],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      peakValue: '96% Fleet',
      peakLabel: 'INTERACTIVE PEAK',
      format: (val: number) => `${val}% Occupancy`,
    },
  };

  const current = tabsData[activeTab];

  // SVG parameters
  const svgWidth = 340;
  const svgHeight = 100;
  const padX = 20;
  const padY = 16;

  const minV = Math.min(...current.points) * 0.88;
  const maxV = Math.max(...current.points) * 1.05;

  const coords = current.points.map((val, idx) => {
    const x = padX + (idx / (current.points.length - 1)) * (svgWidth - padX * 2);
    const y = svgHeight - padY - ((val - minV) / (maxV - minV)) * (svgHeight - padY * 2);
    return { x, y, val, label: current.labels[idx] };
  });

  const pathD = coords.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight} L ${coords[0].x} ${svgHeight} Z`;

  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
      {/* Title */}
      <div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#1d63ff] stroke-[2.4]" />
          <h2 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 tracking-tight">
            Fleet Operations Analytics
          </h2>
        </div>
        <p className="text-[10.5px] text-slate-400 font-normal mt-0.5">
          Bespoke dynamic statistics trackings (Jan - Jun 2026)
        </p>
      </div>

      {/* Segmented Filter Buttons */}
      <div className="inline-flex p-0.5 bg-slate-50 border border-slate-200/60 rounded-lg">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-3 py-0.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === 'revenue'
              ? 'bg-white text-[#1d63ff] shadow-xs border border-slate-200/70'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-3 py-0.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === 'sales'
              ? 'bg-white text-[#1d63ff] shadow-xs border border-slate-200/70'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Sales
        </button>
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`px-3 py-0.5 rounded-md text-[11px] font-bold transition-all ${
            activeTab === 'occupancy'
              ? 'bg-white text-[#1d63ff] shadow-xs border border-slate-200/70'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Occupancy
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-4 pb-0.5">
        {/* Floating Peak Tooltip */}
        <div className="absolute top-0 right-1 bg-slate-50/95 border border-slate-200/80 rounded-lg px-2.5 py-0.5 shadow-2xs pointer-events-none text-right">
          <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400">
            {hoveredIndex !== null ? current.labels[hoveredIndex] + ' PEAK' : current.peakLabel}
          </div>
          <div className="text-[11.5px] font-extrabold text-slate-800 tabular-nums">
            {hoveredIndex !== null ? current.format(current.points[hoveredIndex]) : current.peakValue}
          </div>
        </div>

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 overflow-visible select-none">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d63ff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1d63ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted lines */}
          <line x1="10" y1={svgHeight * 0.25} x2={svgWidth - 10} y2={svgHeight * 0.25} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />
          <line x1="10" y1={svgHeight * 0.55} x2={svgWidth - 10} y2={svgHeight * 0.55} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />
          <line x1="10" y1={svgHeight * 0.85} x2={svgWidth - 10} y2={svgHeight * 0.85} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />

          {/* Shaded Area */}
          <path d={areaD} fill="url(#curveGradient)" />

          {/* Blue Line */}
          <path d={pathD} fill="none" stroke="#1d63ff" strokeWidth="2.4" strokeLinecap="round" />

          {/* Points */}
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? '4.5' : '3'}
              fill="#ffffff"
              stroke="#1d63ff"
              strokeWidth="2"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer transition-all duration-150"
            />
          ))}
        </svg>

        {/* X-Axis Month Labels */}
        <div className="flex justify-between px-3 pt-0.5 text-[9.5px] font-medium text-slate-400 select-none">
          {current.labels.map((lbl, idx) => (
            <span key={lbl} className={hoveredIndex === idx ? 'text-[#1d63ff] font-bold' : ''}>
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
        <div className="text-slate-500 font-medium">
          Graph Period: <span className="font-extrabold text-slate-800">First Half 2026</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <Activity className="w-3 h-3 text-emerald-500 stroke-[2.2]" />
          <span>Live feeds synced</span>
        </div>
      </div>
    </div>
  );
};
