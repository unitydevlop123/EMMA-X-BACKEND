import React, { useEffect, useRef, useState } from 'react';
import {
  Star,
  Building2,
  UserCheck,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  FirestoreReview,
  fetchLiveReviews,
  getCachedReviews,
  saveReview,
  deleteReviewDoc,
} from '../services/part2Firebase';

interface ReviewsViewProps {
  initialReviews?: FirestoreReview[];
  initialLoaded?: boolean;
  permissionDenied?: boolean;
  onBack: () => void;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  initialReviews,
  initialLoaded,
  permissionDenied: propPermDenied,
  onBack,
}) => {
  const cached =
    initialReviews && initialReviews.length > 0 ? initialReviews : getCachedReviews();

  const [reviews, setReviews] = useState<FirestoreReview[]>(cached);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cached.length === 0;
  });
  const [permDenied, setPermDenied] = useState<boolean>(Boolean(propPermDenied));
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [author, setAuthor] = useState('');
  const [company, setCompany] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const draftDocIdRef = useRef<string>('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialReviews) {
      setReviews(initialReviews);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialReviews, initialLoaded]);

  useEffect(() => {
    setPermDenied(Boolean(propPermDenied));
  }, [propPermDenied]);

  const loadReviews = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const res = await fetchLiveReviews();
    setReviews(res.data);
    setPermDenied(Boolean(res.permissionDenied));
    setLoading(false);
  };

  useEffect(() => {
    if (cached.length === 0 && !initialLoaded) {
      loadReviews(true);
    }
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    draftDocIdRef.current = `rev_${Date.now()}`;
    setAuthor('');
    setCompany('');
    setVehicle('');
    setRating(5);
    setQuote('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (r: FirestoreReview) => {
    setEditingId(r.id);
    draftDocIdRef.current = r.id;
    setAuthor(r.author);
    setCompany(r.company || '');
    setVehicle(r.vehicle || '');
    setRating(r.rating);
    setQuote(r.quote);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || saving) return;
    if (!author.trim() || !quote.trim()) return;
    submitLockRef.current = true;
    setFormError(null);
    setSaving(true);

    try {
      const docId = editingId || draftDocIdRef.current || `rev_${Date.now()}`;
      const existing = editingId ? reviews.find((r) => r.id === editingId) : undefined;

      const payload: FirestoreReview = {
        id: docId,
        author: author.trim(),
        quote: quote.trim(),
        rating: Number(rating) || 5,
        isActive: existing ? existing.isActive : true,
        company: company.trim(),
        vehicle: vehicle.trim(),
      };

      const res = await saveReview(payload);
      if (res.ok) {
        setReviews((prev) => {
          const exists = prev.some((r) => r.id === docId);
          return exists
            ? prev.map((r) => (r.id === docId ? payload : r))
            : [payload, ...prev];
        });
        showToast(editingId ? 'Updated testimonial!' : 'Published testimonial to Firestore!');
        setShowModal(false);
      } else {
        setFormError(
          res.permissionDenied
            ? 'Firestore Permission Denied: Please enable reviews in firestore.rules.'
            : res.error || 'Failed to save review.'
        );
      }
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const handleToggleActive = async (r: FirestoreReview) => {
    const nextVal = !r.isActive;
    const updated: FirestoreReview = { ...r, isActive: nextVal };
    const res = await saveReview(updated);
    if (res.ok) {
      setReviews((prev) => prev.map((item) => (item.id === r.id ? updated : item)));
      showToast(nextVal ? 'Review is now live on website' : 'Review hidden from website');
    } else if (res.permissionDenied) {
      showToast('Permission denied on reviews.');
    }
  };

  const handleDelete = async (r: FirestoreReview) => {
    const res = await deleteReviewDoc(r.id);
    if (res.ok) {
      setReviews((prev) => prev.filter((item) => item.id !== r.id));
      showToast(`Deleted review by ${r.author}`);
    } else if (res.permissionDenied) {
      showToast('Permission denied on reviews.');
    }
  };

  const avgScore =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
      : '5.0';

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
          <div className="w-1.5 h-7 bg-[#0d9488] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Guest Reviews & Ratings
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage homepage client testimonials in Firestore (reviews).
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
            <span>Firestore Rules Needed for "reviews"</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Ask your frontend developer to allow <code className="bg-amber-100 px-1 rounded">reviews</code> in <code className="bg-amber-100 px-1 rounded">firestore.rules</code>, then tap Refresh.
          </p>
        </div>
      )}

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-200">
            FLEET SATISFACTION SCORE
          </span>
          <span className="text-[10px] font-extrabold bg-teal-500/30 text-teal-100 px-2 py-0.5 rounded border border-teal-400/30">
            {reviews.length} Reviews
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl font-black tabular-nums tracking-tight">{avgScore}</span>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-amber-300">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-amber-300 stroke-amber-400" />
              ))}
            </div>
            <p className="text-[11px] text-teal-100 font-medium">Live Testimonials Sync</p>
          </div>
        </div>
      </div>

      {/* Add Review Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-[#0d9488] hover:bg-teal-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Verified Review</span>
        </button>
        <button
          type="button"
          onClick={() => loadReviews(true)}
          className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          {permDenied
            ? 'Waiting for Firestore reviews rule access.'
            : 'No reviews yet. Add a review or open the live website homepage to seed defaults.'}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2.5 ${
                rev.isActive ? 'border-slate-200/70' : 'border-slate-200 opacity-65'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900">{rev.author}</h3>
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  {rev.company && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{rev.company}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                "{rev.quote}"
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                  {rev.vehicle || (rev.isActive ? 'Live on Testimonials' : 'Hidden')}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(rev)}
                    className="p-1 text-slate-400 hover:text-[#0d5dd7]"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(rev)}
                    className="p-1 text-slate-400 hover:text-teal-600"
                    title={rev.isActive ? 'Hide' : 'Show'}
                  >
                    {rev.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rev)}
                    className="p-1 text-slate-300 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                {editingId ? 'Edit Testimonial' : 'Add Verified Review'}
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

            <form onSubmit={handleSave} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Osagie I."
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company (Optional)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rating (1–5)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full border rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Stars
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vehicle / Context (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toyota Land Cruiser Prado TXL"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Quote *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write verified customer testimonial quote..."
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
              <div className="flex gap-2 pt-1">
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
                  className="flex-1 py-2 rounded-xl bg-[#0d9488] text-white font-extrabold"
                >
                  {saving ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
