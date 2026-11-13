import React, { useEffect, useState } from 'react';
import {
  Search,
  Calendar,
  ShieldCheck,
  MapPin,
  Phone,
  Eye,
  UserCheck,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  MessageCircle,
  Car,
  Upload,
  Loader2,
  AlertTriangle,
  Play,
  Check,
  Ban,
} from 'lucide-react';
import {
  FirestoreReservation,
  ReservationStatus,
  fetchLiveReservations,
  getCachedReservations,
  updateReservationFields,
  deleteFirestoreReservation,
} from '../services/part2Firebase';
import { uploadToCloudinary } from '../services/cloudinaryConfig';

interface BookingsViewProps {
  initialReservations?: FirestoreReservation[];
  initialLoaded?: boolean;
  permissionDenied?: boolean;
}

const STATUS_ACTIONS: {
  status: ReservationStatus;
  label: string;
  statusLabel: string;
  pillClass: string;
}[] = [
  {
    status: 'upcoming',
    label: 'Confirm',
    statusLabel: 'Confirmed & Scheduled',
    pillClass: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    status: 'active',
    label: 'Dispatch',
    statusLabel: 'Chauffeur Dispatched',
    pillClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    status: 'completed',
    label: 'Complete',
    statusLabel: 'Completed',
    pillClass: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300',
  },
  {
    status: 'cancelled',
    label: 'Cancel',
    statusLabel: 'Cancelled',
    pillClass: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200',
  },
];

function formatWhatsAppUrl(phone?: string): string {
  if (!phone) return 'https://wa.me/2349135360520';
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '234' + digits.slice(1);
  }
  return `https://wa.me/${digits || '2349135360520'}`;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  initialReservations,
  initialLoaded,
  permissionDenied: propPermDenied,
}) => {
  const cached =
    initialReservations && initialReservations.length > 0
      ? initialReservations
      : getCachedReservations();

  const [bookings, setBookings] = useState<FirestoreReservation[]>(cached);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cached.length === 0;
  });
  const [permDenied, setPermDenied] = useState<boolean>(Boolean(propPermDenied));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [viewingBooking, setViewingBooking] = useState<FirestoreReservation | null>(null);
  const [assigningBooking, setAssigningBooking] = useState<FirestoreReservation | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<FirestoreReservation | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  // Assign Chauffeur & Plate form state
  const [chauffeurName, setChauffeurName] = useState('');
  const [chauffeurPhone, setChauffeurPhone] = useState('');
  const [chauffeurPhoto, setChauffeurPhoto] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialReservations) {
      setBookings(initialReservations);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialReservations, initialLoaded]);

  useEffect(() => {
    setPermDenied(Boolean(propPermDenied));
  }, [propPermDenied]);

  const loadBookings = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const res = await fetchLiveReservations();
    setBookings(res.data);
    setPermDenied(Boolean(res.permissionDenied));
    setLoading(false);
  };

  useEffect(() => {
    if (cached.length === 0 && !initialLoaded) {
      loadBookings(true);
    }
  }, []);

  const openAssignModal = (b: FirestoreReservation) => {
    setAssigningBooking(b);
    setChauffeurName(b.chauffeurName || 'Assigned Emma X VIP Chauffeur');
    setChauffeurPhone(b.chauffeurPhone || '+234 913 536 0520');
    setChauffeurPhoto(b.chauffeurPhoto || '');
    setPlateNumber(b.plateNumber || '');
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBooking) return;
    setSavingAction(true);

    const payload: Partial<FirestoreReservation> = {
      chauffeurName: chauffeurName.trim(),
      chauffeurPhone: chauffeurPhone.trim(),
      chauffeurPhoto: chauffeurPhoto.trim(),
      plateNumber: plateNumber.trim(),
    };

    const res = await updateReservationFields(assigningBooking.id, payload);
    if (res.ok) {
      setBookings((prev) =>
        prev.map((item) =>
          item.id === assigningBooking.id ? { ...item, ...payload } : item
        )
      );
      showToast(`Assigned chauffeur & plate to ${assigningBooking.code}!`);
      setAssigningBooking(null);
    } else {
      alert(
        res.permissionDenied
          ? 'Firestore Permission Denied: Please ask your frontend developer to enable Admin writes on "reservations" in firestore.rules.'
          : 'Failed to update reservation: ' + (res.error || 'Unknown error')
      );
    }
    setSavingAction(false);
  };

  const handleQuickStatus = async (
    b: FirestoreReservation,
    status: ReservationStatus,
    statusLabel: string
  ) => {
    setSavingAction(true);
    const res = await updateReservationFields(b.id, { status, statusLabel });
    if (res.ok) {
      setBookings((prev) =>
        prev.map((item) =>
          item.id === b.id ? { ...item, status, statusLabel } : item
        )
      );
      showToast(`${b.code} marked as ${statusLabel}!`);
    } else {
      alert(
        res.permissionDenied
          ? 'Firestore Permission Denied: Please ask your frontend developer to enable Admin writes on "reservations" in firestore.rules.'
          : 'Failed to update status: ' + (res.error || 'Unknown error')
      );
    }
    setSavingAction(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBooking) return;
    setSavingAction(true);
    const res = await deleteFirestoreReservation(deletingBooking.id);
    if (res.ok) {
      setBookings((prev) => prev.filter((item) => item.id !== deletingBooking.id));
      showToast(`Deleted booking ${deletingBooking.code}.`);
      setDeletingBooking(null);
    } else {
      alert(
        res.permissionDenied
          ? 'Firestore Permission Denied: Admin delete blocked by firestore.rules on reservations.'
          : 'Failed to delete booking.'
      );
    }
    setSavingAction(false);
  };

  const filtered = bookings.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (b.clientName && b.clientName.toLowerCase().includes(q)) ||
      (b.carName && b.carName.toLowerCase().includes(q)) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.plateNumber && b.plateNumber.toLowerCase().includes(q)) ||
      (b.clientPhone && b.clientPhone.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-16 animate-in fade-in duration-150">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/60">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* Title */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-7 bg-[#0d5dd7] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Bookings & Sales
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Live reservations, chauffeur dispatch, and booking status controls.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadBookings(true)}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#0d5dd7] transition-colors"
          title="Refresh Reservations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Firestore Rules Permission Warning if blocked */}
      {permDenied && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Firestore Rules Access Needed for "reservations"</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Live Firestore returned <code className="bg-amber-100 px-1 rounded font-mono">permission-denied</code> for <code className="bg-amber-100 px-1 rounded font-mono">reservations</code>. Ask your frontend developer to allow Admin reads/writes on <code className="bg-amber-100 px-1 rounded font-mono">reservations</code> in <code className="bg-amber-100 px-1 rounded font-mono">firestore.rules</code>, then tap Refresh.
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['all', 'upcoming', 'active', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors shrink-0 ${
              statusFilter === tab
                ? 'bg-[#0d5dd7] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {tab === 'all' ? `All (${bookings.length})` : tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search by code (EMX-...), client, car, or plate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200/90 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0d5dd7] shadow-xs"
        />
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Loading reservations from Firestore...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-xs text-slate-400">
          {permDenied
            ? 'Waiting for Firestore reservations permission to be enabled.'
            : 'No matching reservations found in Firestore.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm space-y-3"
            >
              {/* Top Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black tracking-wider text-[#0d5dd7] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {b.code}
                    </span>
                    {b.hasEscort && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                        <span>Armed Escort</span>
                      </span>
                    )}
                    {b.promoCode && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {b.promoCode}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1 truncate">
                    {b.clientName || 'VIP Client'}
                  </h3>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span
                    className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                      b.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : b.status === 'upcoming'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : b.status === 'cancelled'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {b.statusLabel || b.status}
                  </span>
                  <div className="text-sm font-black text-slate-900 tabular-nums">
                    {typeof b.totalAmount === 'number'
                      ? `₦${b.totalAmount.toLocaleString()}`
                      : b.totalAmount}
                  </div>
                </div>
              </div>

              {/* Car & Chauffeur Info */}
              <div className="text-xs text-slate-700 flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Car className="w-3.5 h-3.5 text-[#0d5dd7] shrink-0" />
                  <strong className="text-slate-900 truncate">{b.carName}</strong>
                </div>
                {b.plateNumber && (
                  <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 shrink-0">
                    {b.plateNumber}
                  </span>
                )}
              </div>

              {/* Trip Details */}
              <div className="space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {b.startDate} {b.endDate ? `→ ${b.endDate}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {b.pickupLocation} → {b.dropoffLocation}
                  </span>
                </div>
                {b.chauffeurName && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Chauffeur: {b.chauffeurName} {b.chauffeurPhone ? `(${b.chauffeurPhone})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Status Row */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-4 gap-1">
                  {STATUS_ACTIONS.map((act) => (
                    <button
                      key={act.status}
                      type="button"
                      disabled={savingAction || b.status === act.status}
                      onClick={() => handleQuickStatus(b, act.status, act.statusLabel)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        b.status === act.status
                          ? 'ring-2 ring-offset-1 ring-blue-400 opacity-100 ' + act.pillClass
                          : act.pillClass
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>

                {/* Action Buttons: View | Assign Chauffeur | Call/WA | Delete */}
                <div className="grid grid-cols-7 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewingBooking(b)}
                    className="col-span-2 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAssignModal(b)}
                    className="col-span-2 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#0d5dd7] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-blue-200"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Chauffeur</span>
                  </button>

                  <a
                    href={`tel:${b.clientPhone || '+2349135360520'}`}
                    className="col-span-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200"
                    title="Call Client"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={formatWhatsAppUrl(b.clientPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center border border-emerald-200"
                    title="WhatsApp Client"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeletingBooking(b)}
                    className="col-span-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center border border-red-200"
                    title="Delete Reservation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  Booking {viewingBooking.code}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">{viewingBooking.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="font-black text-slate-900 text-sm">{viewingBooking.carName}</div>
                <div className="text-[11px] text-slate-500">
                  {viewingBooking.category} · Plate: {viewingBooking.plateNumber || 'Pending'}
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Client:</span>
                <span className="font-bold">{viewingBooking.clientName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono font-semibold">{viewingBooking.clientPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Pickup:</span>
                <span className="font-semibold text-right max-w-[180px]">{viewingBooking.pickupLocation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Dropoff:</span>
                <span className="font-semibold text-right max-w-[180px]">{viewingBooking.dropoffLocation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Dates:</span>
                <span className="font-semibold text-right max-w-[180px]">
                  {viewingBooking.startDate} → {viewingBooking.endDate}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Trip Purpose:</span>
                <span className="font-semibold">{viewingBooking.tripPurpose || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Payment:</span>
                <span className="font-semibold text-right max-w-[180px]">{viewingBooking.paymentMethod || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Armed Escort:</span>
                <span className="font-bold">{viewingBooking.hasEscort ? 'Yes (Included)' : 'No'}</span>
              </div>
              {viewingBooking.promoCode && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Promo Code Applied:</span>
                  <span className="font-bold text-purple-700">
                    {viewingBooking.promoCode}
                    {viewingBooking.promoDiscount
                      ? ` (-₦${Number(viewingBooking.promoDiscount).toLocaleString()})`
                      : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-black text-slate-900">
                  {typeof viewingBooking.totalAmount === 'number'
                    ? `₦${viewingBooking.totalAmount.toLocaleString()}`
                    : viewingBooking.totalAmount}
                </span>
              </div>
              {viewingBooking.chauffeurName && (
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2.5">
                  {viewingBooking.chauffeurPhoto && (
                    <img
                      src={viewingBooking.chauffeurPhoto}
                      alt={viewingBooking.chauffeurName}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-300"
                    />
                  )}
                  <div>
                    <div className="font-bold text-emerald-900">{viewingBooking.chauffeurName}</div>
                    <div className="text-[11px] text-emerald-700 font-mono">
                      {viewingBooking.chauffeurPhone}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = viewingBooking;
                  setViewingBooking(null);
                  openAssignModal(target);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-50 text-[#0d5dd7] font-bold text-xs border border-blue-200"
              >
                Assign Chauffeur
              </button>
              <button
                type="button"
                onClick={() => setViewingBooking(null)}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN CHAUFFEUR & PLATE MODAL */}
      {assigningBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                Assign Chauffeur & Plate ({assigningBooking.code})
              </h3>
              <button
                type="button"
                onClick={() => setAssigningBooking(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chauffeur Name</label>
                <input
                  type="text"
                  required
                  value={chauffeurName}
                  onChange={(e) => setChauffeurName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chauffeur Phone</label>
                  <input
                    type="text"
                    required
                    value={chauffeurPhone}
                    onChange={(e) => setChauffeurPhone(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-mono text-[11px] text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plate Number</label>
                  <input
                    type="text"
                    required
                    placeholder="EDO-412-EMX"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-mono font-bold text-[11px] text-slate-800 uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Chauffeur Photo (Cloudinary)
                </label>
                {chauffeurPhoto && (
                  <div className="flex items-center gap-2.5">
                    <img
                      src={chauffeurPhoto}
                      alt="Chauffeur preview"
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                    <span className="text-[10px] text-emerald-700 font-bold">Photo ready</span>
                  </div>
                )}
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/..."
                  value={chauffeurPhoto}
                  onChange={(e) => setChauffeurPhoto(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800"
                />
                <label className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0d5dd7] rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer">
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {uploadingPhoto
                      ? `Uploading... ${photoProgress}%`
                      : 'Upload Chauffeur Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingPhoto(true);
                      setPhotoProgress(5);
                      try {
                        const url = await uploadToCloudinary(file, (pct) =>
                          setPhotoProgress(Math.max(pct, 5))
                        );
                        setChauffeurPhoto(url);
                      } catch (err: any) {
                        alert('Upload failed: ' + (err?.message || 'Check connection'));
                      } finally {
                        setUploadingPhoto(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAssigningBooking(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction || uploadingPhoto}
                  className="flex-1 py-2.5 rounded-xl bg-[#0d5dd7] text-white font-extrabold flex items-center justify-center gap-1.5"
                >
                  {savingAction ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE RESERVATION MODAL */}
      {deletingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Delete Reservation</h3>
                <p className="text-[11px] text-slate-500">{deletingBooking.code}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete reservation <strong>{deletingBooking.code}</strong> ({deletingBooking.clientName}) from Firestore?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingBooking(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-extrabold text-xs"
              >
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
