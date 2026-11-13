import React from 'react';
import { Home, Car, BookOpen, Users } from 'lucide-react';

interface BottomNavBarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab = 'home',
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-6 h-12 flex items-center justify-around shadow-[0_-1px_2px_rgba(0,0,0,0.02)] select-none">
      <button
        onClick={() => onTabChange?.('home')}
        aria-label="Home Dashboard"
        className={`p-1.5 transition-colors ${
          activeTab === 'home' ? 'text-[#0d5dd7]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Home className={`w-4.5 h-4.5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
      </button>

      <button
        onClick={() => onTabChange?.('fleet')}
        aria-label="Fleet Inventory"
        className={`p-1.5 transition-colors ${
          activeTab === 'fleet' ? 'text-[#0d5dd7]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Car className={`w-4.5 h-4.5 ${activeTab === 'fleet' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
      </button>

      <button
        onClick={() => onTabChange?.('bookings')}
        aria-label="Bookings & Dispatch"
        className={`p-1.5 transition-colors ${
          activeTab === 'bookings' ? 'text-[#0d5dd7]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <BookOpen className={`w-4.5 h-4.5 ${activeTab === 'bookings' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
      </button>

      <button
        onClick={() => onTabChange?.('users')}
        aria-label="VIP Users & Members"
        className={`p-1.5 transition-colors ${
          activeTab === 'users' ? 'text-[#0d5dd7]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Users className={`w-4.5 h-4.5 ${activeTab === 'users' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
      </button>
    </nav>
  );
};

