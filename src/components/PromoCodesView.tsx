import React, { useEffect, useState } from 'react';
import {
  Ticket,
  Plus,
  X,
  Sparkles,
  Calendar,
  Trash2,
  Edit2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  FirestorePromoCode,
  fetchLivePromoCodes,
  getCachedPromoCodes,
  savePromoCode,
  deletePromoCodeDoc,
} from '../services/part2Firebase';

interface PromoCodesViewProps {
  initialPromoCodes?: FirestorePromoCode[];
  initialLoaded?: boolean;
  permissionDenied?: boolean;
  onBack: () => void;
}

export const PromoCodesView: React.FC<PromoCodesViewProps> = ({
  initialPromoCodes,
  initialLoaded,
  permissionDenied: propPermDenied,
  onBack,
}) => {
  const cached =
    initialPromoCodes && initialPromoCodes.length > 0
      ? initialPromoCodes
      : getCachedPromoCodes();

  const [promos, setPromos] = useState<FirestorePromoCode[]>(cached);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cached.length === 0;
  });
  const [permDenied, setPermDenied] = useState<boolean>(Boolean(propPermDenied));
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('15% OFF');
  const [newTarget, setNewTarget] = useState('Luxury SUV & Escort');
  const [newExpiry, setNewExpiry] = useState('31 Dec 2026');
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialPromoCodes) {
      setPromos(initialPromoCodes);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialPromoCodes, initialLoaded]);

  useEffect(() => {
    setPermDenied(Boolean(propPermDenied));
  }, [propPermDenied]);

  const loadPromos = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const res = await fetchLivePromoCodes();
    setPromos(res.data);
    setPermDenied(Boolean(res.permissionDenied));
    setLoading(false);
  };

  useEffect(() => {
    if (cached.length === 0 && !initialLoaded) {
      loadPromos(true);
    }
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNewCode('');
    setNewDiscount('15% OFF');
    setNewTarget('Luxury SUV & Escort');
    setNewExpiry('31 Dec 2026');
    setShowModal(true);
  };

  const openEditModal = (p: FirestorePromoCode) => {
    setEditingId(p.id);
    setNewCode(p.code);
    setNewDiscount(p.discount);
    setNewTarget(p.target);
    setNewExpiry(p.expiry);
    setShowModal(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setSaving(true);

    const codeUpper = newCode.trim().toUpperCase();
    const docId = editingId || codeUpper.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = editingId ? promos.find((p) => p.id === editingId) : undefined;

    const payload: FirestorePromoCode = {
      id: docId,
      code: codeUpper,
      discount: newDiscount.trim(),
      target: newTarget.trim(),
      expiry: newExpiry.trim(),
      uses: existing?.uses ?? 0,
      status: existing?.status || 'Active',
      isActive: (existing?.status || 'Active') === 'Active',
    };

    const res = await savePromoCode(payload);
    if (res.ok) {
      setPromos((prev) =>
        editingId
          ? prev.map((p) => (p.id === docId ? payload : p))
          : [payload, ...prev]
      );
      showToast(editingId ? `Updated ${codeUpper}!` : `Saved ${codeUpper} to Firestore!`);
      setShowModal(false);
    } else {
      alert(
        res.permissionDenied
          ? 'Firestore Permission Denied: Please enable promo_codes in firestore.rules.'
          : 'Failed to save promo code.'
      );
    }
    setSaving(false);
  };

  const toggleStatus = async (promo: FirestorePromoCode) => {
    const nextStatus: 'Active' | 'Expired' =
      promo.status === 'Active' ? 'Expired' : 'Active';
    const updated: FirestorePromoCode = {
      ...promo,
      status: nextStatus,
      isActive: nextStatus === 'Active',
    };
    const res = await savePromoCode(updated);
    if (res.ok) {
      setPromos((prev) => prev.map((p) => (p.id === promo.id ? updated : p)));
      showToast(`${promo.code} marked ${nextStatus}`);
    } else if (res.permissionDenied) {
      alert('Firestore Permission Denied on promo_codes.');
    }
  };

  const deletePromo = async (promo: FirestorePromoCode) => {
    const res = await deletePromoCodeDoc(promo.id);
    if (res.ok) {
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      showToast(`Deleted ${promo.code}`);
    } else if (res.permissionDenied) {
      alert('Firestore Permission Denied on promo_codes.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-16">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/60">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* Title */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-7 bg-[#f59e0b] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Promo Codes
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage discount codes & perks in Firestore (promo_codes).
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

      {permDenied && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Firestore Rules Needed for "promo_codes"</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Ask your frontend developer to allow <code className="bg-amber-100 px-1 rounded">promo_codes</code> in <code className="bg-amber-100 px-1 rounded">firestore.rules</code>, then tap Refresh.
          </p>
        </div>
      )}

      {/* Add Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-[#f59e0b] hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create New Promo Code</span>
        </button>
        <button
          type="button"
          onClick={() => loadPromos(true)}
          className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Promos List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">Loading promo codes...</div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          {permDenied
            ? 'Waiting for Firestore promo_codes rule access.'
            : 'No promo codes found in Firestore promo_codes.'}
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Ticket className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-mono font-black text-base text-slate-900 tracking-wider">
                      {promo.code}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 font-extrabold mt-0.5">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{promo.discount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleStatus(promo)}
                    className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded transition-all ${
                      promo.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {promo.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(promo)}
                    className="p-1 text-slate-400 hover:text-[#0d5dd7]"
                    title="Edit promo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePromo(promo)}
                    className="p-1 text-slate-300 hover:text-red-500"
                    title="Delete promo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium">{promo.target}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expires {promo.expiry}</span>
                </span>
                <span className="font-bold text-slate-700">{promo.uses} Times Used</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                {editingId ? 'Edit Promo Code' : 'Create New Promo Code'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Promo Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BENINVIP20"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount Amount / %</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20% OFF or ₦50,000 OFF"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Package / Fleet</label>
                <input
                  type="text"
                  placeholder="e.g. Luxury SUV & Armed Convoy"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="text"
                  placeholder="e.g. 31 Dec 2026"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-[#f59e0b] text-white font-extrabold hover:bg-amber-600"
                >
                  {saving ? 'Saving...' : 'Save Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
