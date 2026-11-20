import React, { useEffect, useRef, useState } from 'react';
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
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('20');
  const [expiresAt, setExpiresAt] = useState('2026-12-31');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('0');
  const [targetNote, setTargetNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

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
    setDiscountType('percent');
    setDiscountValue('20');
    setExpiresAt('2026-12-31');
    setMinOrderAmount('0');
    setTargetNote('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (p: FirestorePromoCode) => {
    setEditingId(p.id);
    setNewCode(p.code);
    setDiscountType(p.discountType);
    setDiscountValue(String(p.discountValue));
    setExpiresAt(p.expiresAt || '');
    setMinOrderAmount(String(p.minOrderAmount || 0));
    setTargetNote(p.target || '');
    setFormError(null);
    setShowModal(true);
  };

  const formatDiscountBadge = (p: FirestorePromoCode) => {
    if (p.discountType === 'fixed') {
      return `₦${Number(p.discountValue || 0).toLocaleString()} OFF`;
    }
    return `${Number(p.discountValue || 0)}% OFF`;
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || saving) return;
    if (!newCode.trim()) return;
    const numericVal = Number(discountValue);
    if (!Number.isFinite(numericVal) || numericVal <= 0) {
      setFormError('Please enter a valid discount value greater than 0.');
      return;
    }
    if (discountType === 'percent' && numericVal > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    submitLockRef.current = true;
    setFormError(null);
    setSaving(true);

    try {
      const codeUpper = newCode.trim().toUpperCase().replace(/\s+/g, '');
      const docId = editingId || codeUpper.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = editingId ? promos.find((p) => p.id === editingId) : undefined;

      const payload: FirestorePromoCode = {
        id: docId,
        code: codeUpper,
        discountType,
        discountValue: numericVal,
        expiresAt: expiresAt.trim(),
        minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
        target: targetNote.trim(),
        uses: existing?.uses ?? 0,
        isActive: existing ? existing.isActive : true,
      };

      const res = await savePromoCode(payload);
      if (res.ok) {
        setPromos((prev) => {
          const exists = prev.some((p) => p.id === docId);
          return exists
            ? prev.map((p) => (p.id === docId ? payload : p))
            : [payload, ...prev];
        });
        showToast(editingId ? `Updated ${codeUpper}!` : `Saved ${codeUpper} to Firestore!`);
        setShowModal(false);
      } else {
        setFormError(
          res.permissionDenied
            ? 'Firestore Permission Denied: Please enable promo_codes in firestore.rules.'
            : res.error || 'Failed to save promo code.'
        );
      }
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const toggleStatus = async (promo: FirestorePromoCode) => {
    const nextActive = !promo.isActive;
    const updated: FirestorePromoCode = {
      ...promo,
      isActive: nextActive,
    };
    const res = await savePromoCode(updated);
    if (res.ok) {
      setPromos((prev) => prev.map((p) => (p.id === promo.id ? updated : p)));
      showToast(`${promo.code} ${nextActive ? 'Activated' : 'Deactivated'}`);
    } else if (res.permissionDenied) {
      showToast('Permission denied on promo_codes.');
    }
  };

  const deletePromo = async (promo: FirestorePromoCode) => {
    const res = await deletePromoCodeDoc(promo.id);
    if (res.ok) {
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      showToast(`Deleted ${promo.code}`);
    } else if (res.permissionDenied) {
      showToast('Permission denied on promo_codes.');
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
              Live checkout discount codes synced to Firestore (promo_codes).
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
            : 'No promo codes yet. Create a code like EMMAX20 to test live checkout discounts.'}
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2.5 ${
                promo.isActive ? 'border-slate-200/70' : 'border-slate-200 opacity-65'
              }`}
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
                      <span>{formatDiscountBadge(promo)}</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ({promo.discountType})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleStatus(promo)}
                    className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded transition-all ${
                      promo.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {promo.isActive ? 'Active' : 'Inactive'}
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

              {(promo.target || (promo.minOrderAmount ?? 0) > 0) && (
                <p className="text-xs text-slate-600 font-medium">
                  {promo.target || 'All vehicles'}
                  {(promo.minOrderAmount ?? 0) > 0
                    ? ` · Min order: ₦${Number(promo.minOrderAmount).toLocaleString()}`
                    : ''}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {promo.expiresAt ? `Expires ${promo.expiresAt}` : 'No expiry date'}
                  </span>
                </span>
                <span className="font-bold text-slate-700">{promo.uses || 0} Uses</span>
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

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold px-3 py-2 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSavePromo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Promo Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMMAX20"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full border rounded-xl px-3 py-2 font-mono font-bold uppercase text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                    className="w-full border rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (₦)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {discountType === 'percent' ? 'Percent (%)' : 'Amount (₦)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'percent' ? 100 : undefined}
                    placeholder={discountType === 'percent' ? '20' : '50000'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expires At (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Min Order (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Admin Note / Package (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Luxury SUV & Escort VIP Discount"
                  value={targetNote}
                  onChange={(e) => setTargetNote(e.target.value)}
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
