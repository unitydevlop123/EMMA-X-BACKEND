import React from 'react';
import { Menu, ChevronLeft } from 'lucide-react';

interface EmmaXHeaderProps {
  onMenuClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const EmmaXHeader: React.FC<EmmaXHeaderProps> = ({ onMenuClick, showBack, onBack }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d5dd7] text-white px-3.5 h-14 flex items-center justify-between shadow-sm select-none">
      {/* Left: Back button (if inside a subpage) OR Emma X Hexagon Logo */}
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-1 -ml-1 text-white hover:text-white/80 active:scale-95 transition-transform flex items-center"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.8]" />
          </button>
        ) : (
          /* Hexagon Emblem from Image 97 */
          <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
              <polygon
                points="50 3, 90 25, 90 75, 50 97, 10 75, 10 25"
                fill="#083885"
                stroke="#ff7700"
                strokeWidth="9"
              />
            </svg>
            <span className="absolute font-black text-[#ff7700] text-xs leading-none">X</span>
          </div>
        )}

        {/* Header Text matching IMG_0811 / IMG_0812 */}
        <div className="flex items-baseline">
          <span className="font-extrabold text-[15px] sm:text-base tracking-tight text-white">
            Emma X Logistics Admin
          </span>
        </div>
      </div>

      {/* Right: Hamburger Menu in rounded box */}
      <button
        onClick={onMenuClick}
        aria-label="Open Navigation Menu"
        className="w-9 h-9 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all focus:outline-none"
      >
        <Menu className="w-5 h-5 stroke-[2.2]" />
      </button>
    </header>
  );
};
