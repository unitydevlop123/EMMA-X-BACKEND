import React, { useState, useEffect } from 'react';

export const WelcomeCard: React.FC = () => {
  const [formattedTime, setFormattedTime] = useState('11/6/2026,  02:09 AM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'AM' : 'AM';
      hours = hours % 12 || 12;
      const hoursStr = hours.toString().padStart(2, '0');
      setFormattedTime(`${month}/${day}/${year},  ${hoursStr}:${minutes} ${ampm}`);
    };
    updateTime();
  }, []);

  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Top line: Welcome Back, Admin + Core Pill */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[17px] sm:text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Welcome Back, <br />Admin
          </h1>
        </div>

        {/* Pill matching FrontDesk Core v1.4 */}
        <div className="shrink-0 pt-0.5">
          <span className="inline-block bg-[#eef5ff] text-[#0d5dd7] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#dbe9fe]">
            Emma X Core v2.4
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-[11.5px] text-slate-500 font-normal mt-1.5 leading-snug">
        Here is the active operating status and fleet tracking panel for today
      </p>

      {/* Footer Timestamp */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10.5px]">
        <span className="text-slate-400 font-medium">Last Updated:</span>
        <span className="text-slate-800 font-bold tabular-nums">{formattedTime}</span>
      </div>
    </div>
  );
};
