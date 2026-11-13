import React, { useState } from 'react';
import {
  Car,
  CreditCard,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Clock,
  Save,
  X,
  AlertCircle,
  Database,
  Eye,
  RefreshCw,
  Loader2,
  Check,
  Video,
  Play,
  Shield,
  Sparkles,
} from 'lucide-react';
import { VehicleItem, VehicleOption } from '../types';
import { CLOUDINARY_CONFIG, uploadToCloudinary } from '../services/cloudinaryConfig';
import { getCloudinaryVideoFrameUrl, normalizeHttpsUrl } from '../services/firebase';

interface AddVehicleFormProps {
  initialVehicle?: VehicleItem | null;
  onSave: (vehicle: VehicleItem) => void;
  onCancel: () => void;
}

const GALLERY_LABELS = [
  'VIP Front Profile',
  'Side & Convoy Stance',
  'Luxury Leather Interior',
  'Rear View',
];

export const AddVehicleForm: React.FC<AddVehicleFormProps> = ({
  initialVehicle,
  onSave,
  onCancel,
}) => {
  // Core fields matching frontend JSON schema
  const [name, setName] = useState(initialVehicle?.name || '');
  const [subtitle, setSubtitle] = useState(initialVehicle?.subtitle || '');
  const [description, setDescription] = useState(
    initialVehicle?.description ||
      'Flagship executive vehicle equipped for VIP transit, escort compatibility, and luxury chauffeur services in Benin City, Nigeria.'
  );
  const [category, setCategory] = useState<string>(
    initialVehicle?.category || 'SUV'
  );
  const [badge, setBadge] = useState(initialVehicle?.badge || 'VIP EXECUTIVE');
  const [promoBadge, setPromoBadge] = useState(initialVehicle?.promoBadge || 'Top Executive Choice');
  const [dailyRate, setDailyRate] = useState<number | string>(
    initialVehicle?.dailyRate || 120000
  );
  const [monthlyRate, setMonthlyRate] = useState<number | string>(
    initialVehicle?.monthlyRate || 2800000
  );
  const [seats, setSeats] = useState<number | string>(initialVehicle?.seats || 7);
  const [doors, setDoors] = useState<number | string>(initialVehicle?.doors || 5);
  const [luggage, setLuggage] = useState<number | string>(initialVehicle?.luggage || 5);
  const [rangeOrPower, setRangeOrPower] = useState(initialVehicle?.rangeOrPower || 'V6 4.0L 4WD');
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual' | string>(
    initialVehicle?.transmission || 'Automatic'
  );
  const [fuel, setFuel] = useState<'Petrol' | 'Diesel' | 'Hybrid' | string>(
    initialVehicle?.fuel || 'Petrol'
  );

  const existingGalleries =
    initialVehicle?.galleryImages ||
    initialVehicle?.images ||
    (initialVehicle?.imageUrl ? [initialVehicle.imageUrl] : []);

  const [galleryImages, setGalleryImages] = useState<string[]>([
    existingGalleries[0] || '',
    existingGalleries[1] || '',
    existingGalleries[2] || '',
    existingGalleries[3] || '',
  ]);

  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [uploadingStatus, setUploadingStatus] = useState<Record<number, boolean>>({});

  // Video Walkaround state
  const [videoUrl, setVideoUrl] = useState(initialVehicle?.videoUrl || '');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const [imageUrl, setImageUrl] = useState(existingGalleries[0] || '');
  const [status, setStatus] = useState<'Available' | 'Dispatched'>(
    initialVehicle?.status === 'Dispatched' || initialVehicle?.isAvailable === false
      ? 'Dispatched'
      : 'Available'
  );
  const [plateNumber, setPlateNumber] = useState(initialVehicle?.plateNumber || '');

  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a vehicle model name (e.g. Toyota Land Cruiser Prado TXL).');
      return;
    }

    setSaving(true);

    const validGalleries = galleryImages.map((g) => g.trim()).filter(Boolean);
    const primaryImg = imageUrl.trim() || validGalleries[0] || '';
    const sideImg = validGalleries[1] || validGalleries[0] || primaryImg;

    // Generate clean slug ID like 'toyota-prado-2024'
    const slug =
      initialVehicle?.id ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        new Date().getFullYear();

    const rateNum = Number(dailyRate) || 0;
    const monthNum = Number(monthlyRate) || rateNum * 24;

    const defaultOptions: VehicleOption[] = [
      {
        id: 'escort',
        name: 'Armed Security Escort (2 Personnel)',
        price: 40000,
        description: 'Vetted armed highway convoy officers',
        category: 'protection',
      },
      {
        id: 'full-tank',
        name: 'Pre-Paid Full Tank Petrol',
        price: 35000,
        description: 'Drive out on full tank, return empty',
        category: 'fuel',
      },
      {
        id: 'interstate-lagos',
        name: 'Interstate Permit (Benin ➔ Lagos/Abuja)',
        price: 25000,
        description: 'Includes highway toll passes and interstate clearance',
        category: 'service',
      },
    ];

    const vehicleData: VehicleItem = {
      id: slug,
      name: name.trim(),
      subtitle: subtitle.trim() || `${category} · ${plateNumber.trim() || 'Benin City Hub'}`,
      description: description.trim(),
      category,
      badge,
      promoBadge,
      isAvailable: status === 'Available',
      status,
      seats: Number(seats) || 7,
      doors: Number(doors) || 5,
      transmission,
      fuel,
      luggage: Number(luggage) || 5,
      rangeOrPower: rangeOrPower.trim() || 'V6 4.0L 4WD',
      dailyRate: rateNum,
      pricePerDay: rateNum,
      monthlyRate: monthNum,
      registrationFee: 0,
      imageUrl: primaryImg,
      sideProfileImage: sideImg,
      galleryImages: validGalleries.length > 0 ? validGalleries : (primaryImg ? [primaryImg] : []),
      galleryLabels: GALLERY_LABELS.slice(0, Math.max(validGalleries.length, 1)),
      videoUrl: videoUrl.trim(),
      options: initialVehicle?.options && initialVehicle.options.length > 0
        ? initialVehicle.options
        : defaultOptions,
      plateNumber: plateNumber.trim() || 'EDO-VIP-NEW',
      location: 'Benin City Central Garage',
      driver: 'Certified Executive Chauffeur',
      updatedAt: new Date().toISOString(),
      images: validGalleries.length > 0 ? validGalleries : (primaryImg ? [primaryImg] : []),
    };

    setTimeout(() => {
      onSave(vehicleData);
      setSaving(false);
    }, 200);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-16 select-none animate-in fade-in duration-150">
      {/* 1. Top Blue Management Banner */}
      <div className="bg-[#0052cc] rounded-2xl p-4 sm:p-5 text-white shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-white/90 text-[10px] font-black uppercase tracking-wider mb-1">
              <Database className="w-3.5 h-3.5" />
              <span>Direct Firestore Save</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              {initialVehicle ? 'Edit Vehicle in Fleet' : 'Add Vehicle to Fleet'}
            </h2>
            <p className="text-xs text-white/80 font-normal mt-0.5 leading-relaxed">
              Database schema: name, category, dailyRate, seats, transmission, fuel, imageUrl, status.
            </p>
          </div>
        </div>

        {/* Top Cancel and Confirm buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/40 hover:bg-white/10 active:scale-95 text-white font-extrabold text-xs transition-all text-center focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-white/90 active:scale-95 text-[#0052cc] font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm focus:outline-none"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Confirm & Save</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Vehicle Specifications */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-[#0d5dd7] stroke-[2.2]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              VEHICLE SPECIFICATIONS
            </span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-[#0d5dd7]">
            Core Fields
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Field 1: Vehicle Name */}
          <div>
            <label className="block text-slate-700 font-extrabold mb-1">
              Vehicle Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Toyota Land Cruiser Prado TXL"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052cc] shadow-2xs"
            />
          </div>

          {/* Subtitle & Plate Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-extrabold mb-1">
                Subtitle (Display Line)
              </label>
              <input
                type="text"
                placeholder="e.g. VIP Executive SUV · Lagos Plate"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052cc]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">
                Plate / Fleet Number
              </label>
              <input
                type="text"
                placeholder="e.g. EDO-892-BEN"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052cc]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-extrabold mb-1">
              Vehicle Description
            </label>
            <textarea
              rows={2}
              placeholder="Flagship executive SUV fitted with leather seats, dual-zone AC, and escort compatibility."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052cc]"
            />
          </div>

          {/* Category & Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-extrabold mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0052cc]"
              >
                <option value="SUV">SUV (Luxury SUV)</option>
                <option value="Pickup">Pickup (Tactical 4WD)</option>
                <option value="MPV">MPV (VIP Sienna / Minivan)</option>
                <option value="Sedan">Sedan (Executive Sedan)</option>
                <option value="Bus">Bus (VIP Executive Bus)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">
                Fleet Badge
              </label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0052cc]"
              >
                <option value="VIP EXECUTIVE">VIP EXECUTIVE</option>
                <option value="ARMORED CONVOY">ARMORED CONVOY</option>
                <option value="TACTICAL ESCORT">TACTICAL ESCORT</option>
                <option value="EXECUTIVE SEDAN">EXECUTIVE SEDAN</option>
                <option value="VIP BUS">VIP BUS</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-slate-700 font-extrabold mb-1">
                Promo Badge
              </label>
              <input
                type="text"
                placeholder="e.g. Top Executive Choice"
                value={promoBadge}
                onChange={(e) => setPromoBadge(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0052cc]"
              />
            </div>
          </div>

          {/* Daily Rate & Monthly Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-extrabold mb-1">
                Daily Rate (₦ NGN / day) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-black text-xs">
                  ₦
                </span>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  placeholder="120000"
                  value={dailyRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDailyRate(val);
                    if (val) setMonthlyRate(Number(val) * 24);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-black text-slate-900 focus:outline-none focus:border-[#0052cc] tabular-nums"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Card display: <strong>₦{Number(dailyRate || 0).toLocaleString()}</strong> / day
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1">
                Monthly Rate (₦ NGN / month)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-black text-xs">
                  ₦
                </span>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  placeholder="2800000"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-black text-slate-900 focus:outline-none focus:border-[#0052cc] tabular-nums"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Long-term lease: <strong>₦{Number(monthlyRate || 0).toLocaleString()}</strong> / month
              </p>
            </div>
          </div>

          {/* Technical Specs: Seats, Doors, Luggage, Range/Power, Transmission, Fuel */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div>
              <label className="block text-slate-700 font-extrabold mb-1 text-[11px]">
                Seats
              </label>
              <input
                type="number"
                min={2}
                max={45}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0052cc] text-center"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1 text-[11px]">
                Doors
              </label>
              <input
                type="number"
                min={2}
                max={6}
                value={doors}
                onChange={(e) => setDoors(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0052cc] text-center"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1 text-[11px]">
                Luggage
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={luggage}
                onChange={(e) => setLuggage(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0052cc] text-center"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1 text-[11px]">
                Transmission
              </label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#0052cc]"
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1 text-[11px]">
                Fuel
              </label>
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#0052cc]"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-extrabold mb-1 text-[11px]">
                Engine / Power
              </label>
              <input
                type="text"
                placeholder="V6 4.0L 4WD"
                value={rangeOrPower}
                onChange={(e) => setRangeOrPower(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#0052cc]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Availability Toggle (Available / Dispatched) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm space-y-2">
        <label className="block text-slate-700 font-extrabold text-xs">
          Availability Status Toggle
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStatus('Available')}
            className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
              status === 'Available'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2
              className={`w-4 h-4 ${
                status === 'Available' ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-300'
              }`}
            />
            <span>Available</span>
          </button>

          <button
            type="button"
            onClick={() => setStatus('Dispatched')}
            className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
              status === 'Dispatched'
                ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Clock
              className={`w-4 h-4 ${
                status === 'Dispatched' ? 'text-amber-600 stroke-[2.5]' : 'text-slate-300'
              }`}
            />
            <span>Dispatched</span>
          </button>
        </div>
      </div>

      {/* 4. Photo Gallery File Upload (Cloudinary Integrated, Up to 4 Pictures) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#0d5dd7] stroke-[2.2]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              VEHICLE PHOTO GALLERY (UPLOAD FROM DEVICE)
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Cloudinary Ready
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3 text-xs">
          <p className="text-[11px] text-slate-500 leading-normal">
            Upload up to 4 pictures directly from your device gallery. Files are instantly processed via Cloudinary and stored as URLs in your Firestore database.
          </p>

          {/* 4 Photo Upload Boxes with Visible URL input */}
          <div className="space-y-3">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-1.5">
                    <span>Photo {index + 1}: {GALLERY_LABELS[index]}</span>
                    {index === 0 && (
                      <span className="text-[9px] font-extrabold bg-blue-100 text-[#0d5dd7] px-1.5 py-0.5 rounded">
                        Cover
                      </span>
                    )}
                  </span>
                  {galleryImages[index] && (
                    <button
                      type="button"
                      onClick={() => {
                        const newG = [...galleryImages];
                        newG[index] = '';
                        setGalleryImages(newG);
                        if (index === 0) setImageUrl('');
                      }}
                      className="text-[10px] font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Thumbnail Preview */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                    {uploadingStatus[index] ? (
                      <div className="flex flex-col items-center justify-center text-[#0d5dd7] p-1">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-[9px] font-black mt-0.5">{uploadProgress[index] || 0}%</span>
                      </div>
                    ) : galleryImages[index] ? (
                      <img
                        src={galleryImages[index]}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                        <span className="text-[8px] font-bold text-slate-400">Empty</span>
                      </div>
                    )}
                  </div>

                  {/* Upload File Button & URL Input */}
                  <div className="flex-grow space-y-1">
                    <div className="flex gap-1.5">
                      <div className="relative flex-grow">
                        <input
                          type="url"
                          placeholder="Cloudinary HTTPS URL will appear here or paste URL..."
                          value={galleryImages[index] || ''}
                          onChange={(e) => {
                            const newG = [...galleryImages];
                            newG[index] = e.target.value;
                            setGalleryImages(newG);
                            if (index === 0) setImageUrl(e.target.value);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#0d5dd7]"
                        />
                      </div>
                      <label className="py-1.5 px-3 bg-[#0d5dd7] hover:bg-blue-700 active:scale-95 text-white font-bold rounded-lg text-[11px] cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs transition-all">
                        {uploadingStatus[index] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingStatus[index] ? `${uploadProgress[index] || 0}%` : 'Upload from Device'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingStatus[index]}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadingStatus((prev) => ({ ...prev, [index]: true }));
                              setUploadProgress((prev) => ({ ...prev, [index]: 5 }));

                              try {
                                const cloudinaryUrl = await uploadToCloudinary(file, (percent) => {
                                  setUploadProgress((prev) => ({
                                    ...prev,
                                    [index]: Math.max(percent, 5),
                                  }));
                                });

                                const newG = [...galleryImages];
                                newG[index] = cloudinaryUrl;
                                setGalleryImages(newG);
                                if (index === 0) setImageUrl(cloudinaryUrl);
                              } catch (err: any) {
                                console.error('Cloudinary upload error:', err);
                                alert('Cloudinary Upload Failed: ' + (err?.message || 'Please check your connection'));
                              } finally {
                                setUploadingStatus((prev) => ({ ...prev, [index]: false }));
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Upload Progress Bar (0% -> 100%) */}
                    {uploadingStatus[index] && (
                      <div className="space-y-1 pt-1 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span className="flex items-center gap-1 text-[#0d5dd7]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>
                              {uploadProgress[index] >= 100
                                ? 'Finalizing Cloudinary HTTPS link...'
                                : 'Uploading to Cloudinary (qish0wed)...'}
                            </span>
                          </span>
                          <span className="text-[#0d5dd7] font-black">{uploadProgress[index] || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0d5dd7] transition-all duration-150 rounded-full"
                            style={{ width: `${uploadProgress[index] || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Success Badge when Cloudinary URL is loaded */}
                    {galleryImages[index] && galleryImages[index].includes('cloudinary.com') && !uploadingStatus[index] && (
                      <div className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 pt-0.5">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>Cloudinary HTTPS URL Generated Successfully!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Vehicle Walkaround Video (Attached to Car Package) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-purple-600 stroke-[2.2]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
              VEHICLE VIDEO WALKAROUND (OPTIONAL)
            </span>
          </div>
          <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
            <Video className="w-2.5 h-2.5" />
            <span>Add Video</span>
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3 text-xs">
          <p className="text-[11px] text-slate-500 leading-normal">
            Upload an MP4 walkaround video or paste a Cloudinary video link. When added, this video is included inside the vehicle package alongside its photos so clients can tap to play it.
          </p>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-purple-600" />
                <span>Walkaround MP4 Video URL</span>
              </span>
              {videoUrl && (
                <button
                  type="button"
                  onClick={() => setVideoUrl('')}
                  className="text-[10px] font-bold text-red-600 hover:underline"
                >
                  Remove Video
                </button>
              )}
            </div>

            <div className="flex gap-1.5">
              <input
                type="url"
                placeholder="https://res.cloudinary.com/qish0wed/video/upload/... or tap Upload"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-purple-600"
              />
              <label className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold rounded-lg text-[11px] cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs transition-all">
                {videoUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{videoUploading ? `${videoProgress}%` : 'Upload Video'}</span>
                <input
                  type="file"
                  accept="video/*"
                  disabled={videoUploading}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVideoUploading(true);
                      setVideoProgress(5);
                      try {
                        const url = await uploadToCloudinary(file, (pct) => {
                          setVideoProgress(Math.max(pct, 5));
                        });
                        setVideoUrl(url);
                      } catch (err: any) {
                        console.error('Video upload error:', err);
                        alert('Video Upload Failed: ' + (err?.message || 'Check connection'));
                      } finally {
                        setVideoUploading(false);
                        e.target.value = '';
                      }
                    }
                  }}
                />
              </label>
            </div>

            {/* Video Upload Progress */}
            {videoUploading && (
              <div className="space-y-1 pt-1 animate-in fade-in duration-100">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1 text-purple-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading MP4 to Cloudinary Video (qish0wed)...</span>
                  </span>
                  <span className="text-purple-700 font-black">{videoProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-150 rounded-full"
                    style={{ width: `${videoProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Video Preview + Success indicator */}
            {videoUrl && !videoUploading && (
              <div className="space-y-2 pt-1">
                <div className="p-1 rounded-xl bg-slate-900 border border-slate-700">
                  <video
                    src={normalizeHttpsUrl(videoUrl)}
                    poster={getCloudinaryVideoFrameUrl(videoUrl, 1.5)}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full aspect-video rounded-lg bg-black object-contain"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  <span>Walkaround Video Added! Saved to this vehicle package in Firestore.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Big Confirm / Save directly to Firestore Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-[#0052cc] hover:bg-blue-700 active:scale-[0.99] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all focus:outline-none"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4 stroke-[2.5]" />
          )}
          <span>Direct Firestore Save: {initialVehicle ? 'Update Vehicle' : 'Add Vehicle'}</span>
        </button>
      </div>
    </form>
  );
};
