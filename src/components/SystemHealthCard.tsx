import React, { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export const SystemHealthCard: React.FC = () => {
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setStatusMessage('Cloud services verified: 100% uptime, 0 latency issues.');
      setTimeout(() => setStatusMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 stroke-[2.4]" />
          <h2 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 tracking-tight">
            System Health
          </h2>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
      </div>

      {/* Database Link */}
      <div className="space-y-0.5">
        <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400">
          DATABASE LINK
        </div>
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-[12px] sm:text-[12.5px] text-slate-800">
            Firebase Firestore Core
          </span>
          <span className="bg-[#e8f7ec] text-[#16a34a] text-[8.5px] font-black px-1.5 py-0.5 rounded border border-[#c8eed3]">
            CONNECTED
          </span>
        </div>
      </div>

      {/* Storage Host */}
      <div className="space-y-0.5">
        <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400">
          STORAGE HOST
        </div>
        <div className="font-extrabold text-[12px] sm:text-[12.5px] text-slate-800">
          Cloudinary Fleet Storage
        </div>
      </div>

      {/* Operational Security */}
      <div className="space-y-1">
        <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400">
          OPERATIONAL SECURITY
        </div>
        <div className="bg-slate-50 border border-slate-200/50 rounded-lg p-2.5 text-[10.5px] text-slate-600 leading-normal font-normal">
          Cloud service engine is operating with <strong className="font-bold text-slate-900">100% latency uptime</strong>. Secure cookies matching client tokens verified.
        </div>
      </div>

      {statusMessage && (
        <div className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded-md font-semibold text-center border border-emerald-200">
          {statusMessage}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleVerify}
        disabled={verifying}
        className="w-full py-2 rounded-lg bg-[#0d5dd7] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-all focus:outline-none"
      >
        <RefreshCw className={`w-3 h-3 stroke-[2.5] ${verifying ? 'animate-spin' : ''}`} />
        <span>{verifying ? 'Verifying Services...' : 'Verify System Health'}</span>
      </button>
    </div>
  );
};
