import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  X,
  RefreshCw,
  CheckCircle2,
  Check,
} from 'lucide-react';
import {
  FirestoreSubscriptionPlan,
  fetchLiveSubscriptionPlans,
  getCachedSubscriptionPlans,
  saveSubscriptionPlan,
  updateSubscriptionPlanFields,
  deleteSubscriptionPlan,
} from '../services/part2Firebase';

interface SubscriptionPlansViewProps {
  initialPlans?: FirestoreSubscriptionPlan[];
  initialLoaded?: boolean;
  onBack: () => void;
}

export const SubscriptionPlansView: React.FC<SubscriptionPlansViewProps> = ({
  initialPlans,
  initialLoaded,
  onBack,
}) => {
  const cached =
    initialPlans && initialPlans.length > 0 ? initialPlans : getCachedSubscriptionPlans();

  const [plans, setPlans] = useState<FirestoreSubscriptionPlan[]>(cached);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cached.length === 0;
  });
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('₦2,500,000 / mo');
  const [badge, setBadge] = useState('GOLD VIP');
  const [vehicleAccess, setVehicleAccess] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [popular, setPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<FirestoreSubscriptionPlan | null>(null);
  const submitLockRef = useRef(false);
  const draftDocIdRef = useRef<string>('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialPlans) {
      setPlans(initialPlans);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialPlans, initialLoaded]);

  const loadPlans = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const live = await fetchLiveSubscriptionPlans();
    setPlans(live);
    setLoading(false);
  };

  useEffect(() => {
    if (cached.length === 0 && !initialLoaded) {
      loadPlans(true);
    }
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    draftDocIdRef.current = `plan-${Date.now()}`;
    setMonthlyPrice('₦2,500,000 / mo');
    setBadge('GOLD VIP');
    setVehicleAccess('Toyota Land Cruiser Prado VIP & Hilux Armed Convoy');
    setFeaturesText(
      'Continuous 24/7 dedicated Prado SUV + Chauffeur\nPriority armed security escort convoy allocation'
    );
    setPopular(false);
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (p: FirestoreSubscriptionPlan) => {
    setEditingId(p.id);
    draftDocIdRef.current = p.id;
    setTitle(p.title);
    setSubtitle(p.subtitle);
    setMonthlyPrice(p.monthlyPrice);
    setBadge(p.badge);
    setVehicleAccess(p.vehicleAccess);
    setFeaturesText((p.features || []).join('\n'));
    setPopular(Boolean(p.popular));
    setIsActive(p.isActive !== false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || saving) return;
    if (!title.trim()) return;
    submitLockRef.current = true;
    setSaving(true);

    try {
      const docId =
        editingId ||
        (title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') ||
          draftDocIdRef.current ||
          `plan-${Date.now()}`);

      const payload: FirestoreSubscriptionPlan = {
        id: docId,
        title: title.trim(),
        subtitle: subtitle.trim(),
        monthlyPrice: monthlyPrice.trim(),
        badge: badge.trim() || 'VIP PASS',
        popular,
        vehicleAccess: vehicleAccess.trim(),
        features: featuresText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        isActive,
      };

      const res = await saveSubscriptionPlan(payload);
      if (res.ok) {
        setPlans((prev) => {
          const exists = prev.some((item) => item.id === docId);
          return exists
            ? prev.map((item) => (item.id === docId ? payload : item))
            : [payload, ...prev];
        });
        showToast(editingId ? 'Updated subscription plan!' : 'Added subscription plan!');
        setShowModal(false);
      } else {
        showToast('Failed to save plan: ' + (res.error || 'Permission check needed'));
      }
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const handleTogglePopular = async (p: FirestoreSubscriptionPlan) => {
    const nextVal = !p.popular;
    const res = await updateSubscriptionPlanFields(p.id, { popular: nextVal });
    if (res.ok) {
      setPlans((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, popular: nextVal } : item))
      );
      showToast(nextVal ? `"${p.title}" marked Popular!` : `Removed Popular tag from "${p.title}"`);
    }
  };

  const handleToggleActive = async (p: FirestoreSubscriptionPlan) => {
    const nextVal = !(p.isActive !== false);
    const res = await updateSubscriptionPlanFields(p.id, { isActive: nextVal });
    if (res.ok) {
      setPlans((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: nextVal } : item))
      );
      showToast(nextVal ? `Activated "${p.title}"` : `Hidden "${p.title}"`);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    setSaving(true);
    const res = await deleteSubscriptionPlan(deletingPlan.id);
    if (res.ok) {
      setPlans((prev) => prev.filter((item) => item.id !== deletingPlan.id));
      showToast(`Deleted "${deletingPlan.title}"`);
      setDeletingPlan(null);
    }
    setSaving(false);
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
          <div className="w-1.5 h-7 bg-purple-600 rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Subscription Plans
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Corporate & monthly VIP leasing tiers (subscription_plans).
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

      {/* Add Plan Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Plan</span>
        </button>
        <button
          type="button"
          onClick={() => loadPlans(true)}
          className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-purple-700"
          title="Refresh Subscription Plans"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Loading subscription plans from Firestore...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          No subscription plans found in Firestore collection subscription_plans.
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const active = plan.isActive !== false;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2.5 ${
                  plan.popular
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : active
                    ? 'border-slate-200/80'
                    : 'border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {plan.badge}
                        </span>
                        {plan.popular && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>POPULAR</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 mt-1">
                        {plan.title}
                      </h3>
                      <p className="text-[11px] text-slate-500">{plan.subtitle}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded block mb-1 ${
                        active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {active ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                    <span className="font-black text-xs text-slate-900 tabular-nums">
                      {plan.monthlyPrice}
                    </span>
                  </div>
                </div>

                {plan.vehicleAccess && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <strong>Vehicles:</strong> {plan.vehicleAccess}
                  </div>
                )}

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {plan.features.slice(0, 3).map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="col-span-2 py-1.5 rounded-lg bg-blue-50 text-[#0d5dd7] font-bold flex items-center justify-center gap-1 border border-blue-200"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePopular(plan)}
                    className={`col-span-2 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                      plan.popular
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${plan.popular ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>Popular</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(plan)}
                    className={`col-span-2 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 border ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{active ? 'Active' : 'Hidden'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPlan(plan)}
                    className="col-span-1 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                {editingId ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Emma X VIP Convoy Pass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="Luxury Prado SUV + Police Escort Priority"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Price *</label>
                  <input
                    type="text"
                    required
                    placeholder="₦2,500,000 / mo"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge</label>
                  <input
                    type="text"
                    placeholder="GOLD VIP"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-black uppercase text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Access</label>
                <input
                  type="text"
                  placeholder="Toyota Land Cruiser Prado VIP & Hilux Armed Convoy"
                  value={vehicleAccess}
                  onChange={(e) => setVehicleAccess(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={4}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPopular((v) => !v)}
                  className={`py-2 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1 ${
                    popular
                      ? 'bg-amber-50 border-amber-400 text-amber-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${popular ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{popular ? 'Popular: YES' : 'Popular: NO'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`py-2 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1 ${
                    isActive
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                >
                  {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'Active' : 'Hidden'}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-extrabold"
                >
                  {saving ? 'Saving...' : 'Save to Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <h3 className="font-black text-sm text-slate-900">Delete Subscription Plan?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong>{deletingPlan.title}</strong> from <code className="bg-slate-100 px-1 rounded">subscription_plans</code>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingPlan(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-extrabold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
