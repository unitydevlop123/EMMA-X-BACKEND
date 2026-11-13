import React from 'react';
import {
  Car,
  BookOpen,
  Calendar,
  Ticket,
  MessageSquare,
  Megaphone,
  Users,
  Settings,
  Video,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface ManageOperationalDataGridProps {
  onTileClick?: (tileId: string) => void;
}

export const ManageOperationalDataGrid: React.FC<ManageOperationalDataGridProps> = ({
  onTileClick,
}) => {
  const tiles = [
    {
      id: 'vehicles',
      title: 'All Vehicles',
      icon: Car,
      iconColor: 'text-[#0d5dd7]',
      border: 'border-slate-200/80 bg-white hover:border-blue-400',
      isNew: false,
    },
    {
      id: 'bookings',
      title: 'Bookings & Sales',
      icon: BookOpen,
      iconColor: 'text-[#0d5dd7]',
      border: 'border-slate-200/80 bg-white hover:border-blue-400',
      isNew: false,
    },
    {
      id: 'calendar',
      title: 'Booking Calendar',
      icon: Calendar,
      iconColor: 'text-[#6366f1]',
      border: 'border-slate-200/80 bg-white hover:border-indigo-400',
      isNew: false,
    },
    {
      id: 'frontend-video',
      title: 'Frontend Video',
      icon: Video,
      iconColor: 'text-purple-600',
      border: 'border-[#fde68a] bg-[#fffdfa] hover:border-purple-400',
      textColor: 'text-[#92400e]',
      isNew: true,
    },
    {
      id: 'promo-cards',
      title: 'Promo Cards',
      icon: Sparkles,
      iconColor: 'text-[#f59e0b]',
      border: 'border-[#fde68a] bg-[#fffdfa] hover:border-amber-400',
      textColor: 'text-[#92400e]',
      isNew: true,
    },
    {
      id: 'services',
      title: 'Services',
      icon: ShieldCheck,
      iconColor: 'text-[#0d5dd7]',
      border: 'border-[#fde68a] bg-[#fffdfa] hover:border-blue-400',
      textColor: 'text-[#92400e]',
      isNew: true,
    },
    {
      id: 'subscription-plans',
      title: 'Subscription Plans',
      icon: Building2,
      iconColor: 'text-purple-600',
      border: 'border-[#fde68a] bg-[#fffdfa] hover:border-purple-400',
      textColor: 'text-[#92400e]',
      isNew: true,
    },
    {
      id: 'users',
      title: 'Manage Users',
      icon: Users,
      iconColor: 'text-[#0d5dd7]',
      border: 'border-slate-200/80 bg-white hover:border-blue-400',
      isNew: false,
    },
    {
      id: 'promos',
      title: 'Promo Codes',
      icon: Ticket,
      iconColor: 'text-[#f59e0b]',
      border: 'border-slate-200/80 bg-white hover:border-amber-400',
      isNew: false,
    },
    {
      id: 'reviews',
      title: 'Guest Reviews',
      icon: MessageSquare,
      iconColor: 'text-[#0d9488]',
      border: 'border-slate-200/80 bg-white hover:border-teal-400',
      isNew: false,
    },
    {
      id: 'alerts',
      title: 'Fleet Alerts Ticker',
      icon: Megaphone,
      iconColor: 'text-[#f59e0b]',
      border: 'border-slate-200/80 bg-white hover:border-amber-400',
      isNew: false,
    },
    {
      id: 'editor',
      title: 'Fleet Editor',
      icon: Settings,
      iconColor: 'text-[#0d5dd7]',
      border: 'border-slate-200/80 bg-white hover:border-blue-400',
      isNew: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/60 shadow-sm space-y-3">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
        MANAGE FLEET OPERATIONAL DATA
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.id}
              onClick={() => onTileClick?.(tile.id)}
              className={`relative border rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center select-none min-h-[96px] cursor-pointer transition-all duration-150 active:scale-[0.98] ${tile.border}`}
            >
              {tile.isNew && (
                <span className="absolute top-2 right-2 bg-[#f59e0b] text-white text-[8px] font-black uppercase px-1 py-0.2 rounded leading-none">
                  NEW
                </span>
              )}

              <div className="mb-2">
                <Icon className={`w-6 h-6 stroke-[2] ${tile.iconColor}`} />
              </div>

              <span
                className={`text-[12px] font-bold leading-tight ${
                  tile.textColor || 'text-slate-800'
                }`}
              >
                {tile.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
