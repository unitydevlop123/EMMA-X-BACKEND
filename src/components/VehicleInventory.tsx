import React, { useState } from 'react';
import { Plus, Search, Car, Edit2, Trash2, Users, Fuel, Gauge } from 'lucide-react';
import { VehicleItem } from '../types';

interface VehicleInventoryProps {
  vehicles: VehicleItem[];
  onAddVehicleClick: () => void;
  onEditVehicleClick: (vehicle: VehicleItem) => void;
  onDeleteVehicle: (id: string) => void;
}

export const VehicleInventory: React.FC<VehicleInventoryProps> = ({
  vehicles,
  onAddVehicleClick,
  onEditVehicleClick,
  onDeleteVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.plateNumber && v.plateNumber.toLowerCase().includes(q)) ||
      (v.category && v.category.toLowerCase().includes(q)) ||
      (v.location && v.location.toLowerCase().includes(q))
    );
  });

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* Title with Blue Accent Bar matching IMG_0811 */}
      <div className="flex items-start gap-2.5 pt-1">
        <div className="w-1.5 h-7 bg-[#0d5dd7] rounded-full mt-0.5 shrink-0"></div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
            Fleet Inventory
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage, edit, or remove added fleet vehicles.
          </p>
        </div>
      </div>

      {/* Blue Button: + Add New Vehicle matching IMG_0811 */}
      <button
        onClick={onAddVehicleClick}
        className="w-full py-3 bg-[#0d5dd7] hover:bg-[#0a4bb3] active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Add New Vehicle</span>
      </button>

      {/* Search Input matching IMG_0811 */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search vehicles by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200/90 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0d5dd7] shadow-xs"
        />
      </div>

      {/* Vehicles List or Empty State matching IMG_0811 */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
            <Car className="w-8 h-8 stroke-[1.5]" />
          </div>
          <p className="text-xs font-bold text-slate-500 max-w-[220px] leading-relaxed">
            {searchQuery
              ? 'No matching vehicles found for your search.'
              : 'No vehicles found in fleet inventory.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVehicles.map((vehicle) => {
            const displayImg =
              vehicle.imageUrl || (vehicle.images && vehicle.images[0]) || '';
            const hasError = imageErrors[vehicle.id];

            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/70 shadow-sm space-y-2.5 transition-all hover:border-slate-300"
              >
                {/* Top Row: Photo + Main Info + Rate */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Vehicle Photo (Fixed 56x56 thumbnail with authentic PostImg car photo) */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {displayImg && !hasError ? (
                        <img
                          src={displayImg}
                          alt={vehicle.name}
                          onError={() => handleImageError(vehicle.id)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Car className="w-7 h-7 text-slate-400" />
                      )}
                    </div>

                    {/* Name & Badges */}
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-black text-sm text-slate-900 leading-snug truncate">
                        {vehicle.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-[#0d5dd7] border border-blue-100">
                          {vehicle.category || 'SUV'}
                        </span>
                        {vehicle.plateNumber && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 truncate max-w-[140px]">
                            {vehicle.plateNumber}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            vehicle.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {vehicle.status || 'AVAILABLE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Rate */}
                  <div className="text-right shrink-0">
                    <div className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider">
                      DAILY RATE
                    </div>
                    <div className="text-sm font-black text-slate-900 tabular-nums">
                      ₦{Number(vehicle.dailyRate || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Specs row: Seating, Transmission, Fuel */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{vehicle.seats || 5} Seats</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" />
                      <span>{vehicle.transmission || 'Automatic'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-slate-400" />
                      <span>{vehicle.fuel || 'Petrol'}</span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditVehicleClick(vehicle)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#0d5dd7] hover:bg-blue-50 transition-colors"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${vehicle.name}" from fleet inventory?`)) {
                          onDeleteVehicle(vehicle.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
