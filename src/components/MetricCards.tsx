import React from 'react';
import { Users, Car, CreditCard, ArrowUpRight } from 'lucide-react';

interface MetricCardsProps {
  usersCount?: number;
  dispatchedCount?: number;
  totalVehicles?: number;
  monthlyVolume?: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  usersCount = 6,
  dispatchedCount = 2,
  totalVehicles = 6,
  monthlyVolume = 24850000,
}) => {
  return (
    <div className="space-y-2.5">
      {/* 1. Royal Blue Card - ACTIVE VIP CLIENTS NOW */}
      <div className="bg-[#1b64f2] text-white rounded-xl p-3 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none">
        <div className="flex justify-between items-center">
          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-white/90">
            ACTIVE VIP CLIENTS NOW
          </span>
          <Users className="w-4 h-4 text-white/90 stroke-[2.2]" />
        </div>

        <div className="my-1.5">
          <span className="text-[25px] sm:text-[27px] font-black tracking-tight leading-none tabular-nums text-white">
            {usersCount} Accounts
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-white leading-none">
            <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Live Firestore</span>
          </span>
          <span className="text-[10.5px] text-white/85 font-medium">Benin VIP Club members</span>
        </div>
      </div>

      {/* 2. Vibrant Green Card - FLEET VEHICLES ON DISPATCH */}
      <div className="bg-[#21b04b] text-white rounded-xl p-3 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none">
        <div className="flex justify-between items-center">
          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-white/90">
            FLEET VEHICLES ON DISPATCH
          </span>
          <Car className="w-4 h-4 text-white/90 stroke-[2.2]" />
        </div>

        <div className="my-1.5">
          <span className="text-[25px] sm:text-[27px] font-black tracking-tight leading-none tabular-nums text-white">
            {dispatchedCount} Dispatched
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-white leading-none">
            <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>Active Convoy</span>
          </span>
          <span className="text-[10.5px] text-white/85 font-medium">of {totalVehicles} registered fleet cars</span>
        </div>
      </div>

      {/* 3. Golden Amber Card - CURRENT MONTH VOLUME */}
      <div className="bg-[#e89a07] text-white rounded-xl p-3 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none">
        <div className="flex justify-between items-center">
          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-white/90">
            CURRENT MONTH VOLUME
          </span>
          <CreditCard className="w-4 h-4 text-white/90 stroke-[2.2]" />
        </div>

        <div className="my-1.5">
          <span className="text-[24px] sm:text-[26px] font-black tracking-tight leading-none tabular-nums text-white">
            ₦{monthlyVolume.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-white leading-none">
            <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>₦ NGN</span>
          </span>
          <span className="text-[10.5px] text-white/85 font-medium">live fleet bookings & corporate passes</span>
        </div>
      </div>
    </div>
  );
};
