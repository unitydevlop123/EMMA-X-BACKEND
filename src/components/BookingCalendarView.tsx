import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  MapPin,
  Car,
  User,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { VehicleItem } from '../types';
import { FirestoreReservation } from '../services/part2Firebase';

interface BookingCalendarViewProps {
  vehicles: VehicleItem[];
  reservations?: FirestoreReservation[];
  permissionDenied?: boolean;
  onOpenBookings?: () => void;
  onBack: () => void;
}

export const BookingCalendarView: React.FC<BookingCalendarViewProps> = ({
  reservations = [],
  permissionDenied,
  onOpenBookings,
  onBack,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  const visibleReservations = selectedDay
    ? reservations.filter((r) => {
        const text = `${r.startDate} ${r.endDate} ${r.createdAt || ''}`;
        const dayStr = String(selectedDay).padStart(2, '0');
        return text.includes(dayStr) || text.includes(`${selectedDay}.`);
      })
    : reservations;

  const listToRender =
    selectedDay && visibleReservations.length === 0 ? reservations : visibleReservations;

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-16">
      {/* Title */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-7 bg-[#6366f1] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Booking Calendar
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Live dispatch schedule from Firestore reservations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="py-1 px-3 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      {permissionDenied && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Firestore Rules Access Needed for "reservations"</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Ask your frontend developer to allow Admin reads on <code className="bg-amber-100 px-1 rounded">reservations</code> in <code className="bg-amber-100 px-1 rounded">firestore.rules</code>.
          </p>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#6366f1]" />
            <span>Dispatch Schedule</span>
          </h2>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[11px] font-bold text-[#6366f1] hover:underline"
            >
              Show All ({reservations.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {daysInMonth.map((day) => {
            const isSelected = selectedDay === day;
            const dayStr = String(day).padStart(2, '0');
            const dayMatches = reservations.filter((r) =>
              `${r.startDate} ${r.endDate}`.includes(`${dayStr}.`)
            );
            const hasActive = dayMatches.some((r) => r.status === 'active');
            const hasUpcoming = dayMatches.some((r) => r.status === 'upcoming');

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#6366f1] text-white font-black shadow-sm ring-2 ring-indigo-200'
                    : 'hover:bg-slate-100 text-slate-700 font-bold'
                }`}
              >
                <span>{day}</span>
                <div className="flex gap-0.5 mt-0.5 min-h-[6px]">
                  {hasActive && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                  {hasUpcoming && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-indigo-400'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
            {selectedDay ? `Filter Day ${selectedDay}` : 'All Live Reservations'} ({listToRender.length})
          </span>
          {onOpenBookings && (
            <button
              type="button"
              onClick={onOpenBookings}
              className="text-[10px] font-extrabold text-[#0d5dd7] bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
            >
              Manage in Bookings
            </button>
          )}
        </div>

        {listToRender.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-xs text-slate-400">
            {permissionDenied
              ? 'Waiting for Firestore reservations permission.'
              : 'No reservations scheduled in Firestore yet.'}
          </div>
        ) : (
          listToRender.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-[#0d5dd7] bg-blue-50 px-1.5 py-0.5 rounded">
                      {evt.code}
                    </span>
                    <span
                      className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded ${
                        evt.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : evt.status === 'upcoming'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {evt.statusLabel || evt.status}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-500" />
                    <span>{evt.carName}</span>
                  </h3>
                </div>

                {evt.hasEscort && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                    <span>Escort</span>
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{evt.clientName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {evt.pickupLocation} → {evt.dropoffLocation}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {evt.startDate} {evt.endDate ? `→ ${evt.endDate}` : ''}
                  </span>
                </div>
                {evt.chauffeurName && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {evt.chauffeurName} {evt.plateNumber ? `· ${evt.plateNumber}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Booking Value
                </span>
                <span className="font-black text-slate-900 tabular-nums">
                  {typeof evt.totalAmount === 'number'
                    ? `₦${evt.totalAmount.toLocaleString()}`
                    : evt.totalAmount}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
