import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  Upload,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  FirestorePromoCard,
  fetchLivePromoCards,
  getCachedPromoCards,
  savePromoCard,
  updatePromoCardFields,
  deletePromoCard,
} from '../services/part2Firebase';
import { uploadToCloudinary } from '../services/cloudinaryConfig';

interface PromoCardsViewProps {
  initialCards?: FirestorePromoCard[];
  initialLoaded?: boolean;
  onBack: () => void;
}

export const PromoCardsView: React.FC<PromoCardsViewProps> = ({
  initialCards,
  initialLoaded,
  onBack,
}) => {
  const cached =
    initialCards && initialCards.length > 0 ? initialCards : getCachedPromoCards();

  const [cards, setCards] = useState<FirestorePromoCard[]>(cached);
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
  const [ctaText, setCtaText] = useState('Hire Now');
  const [badgePrefix, setBadgePrefix] = useState('UP TO');
  const [badgeValue, setBadgeValue] = useState('20%');
  const [badgeSuffix, setBadgeSuffix] = useState('DISCOUNT');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingCard, setDeletingCard] = useState<FirestorePromoCard | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialCards) {
      setCards(initialCards);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialCards, initialLoaded]);

  const loadCards = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const live = await fetchLivePromoCards();
    setCards(live);
    setLoading(false);
  };

  useEffect(() => {
    if (cached.length === 0 && !initialLoaded) {
      loadCards(true);
    }
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setCtaText('Hire Now');
    setBadgePrefix('UP TO');
    setBadgeValue('20%');
    setBadgeSuffix('DISCOUNT');
    setImageUrl('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (c: FirestorePromoCard) => {
    setEditingId(c.id);
    setTitle(c.title);
    setSubtitle(c.subtitle);
    setCtaText(c.ctaText);
    setBadgePrefix(c.badge?.prefix || '');
    setBadgeValue(c.badge?.value || '');
    setBadgeSuffix(c.badge?.suffix || '');
    setImageUrl(c.imageUrl);
    setIsActive(c.isActive !== false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const docId =
      editingId ||
      (title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `promo-${Date.now()}`);

    const payload: FirestorePromoCard = {
      id: docId,
      title: title.trim(),
      subtitle: subtitle.trim(),
      ctaText: ctaText.trim() || 'Hire Now',
      imageUrl: imageUrl.trim(),
      badge:
        badgePrefix || badgeValue || badgeSuffix
          ? {
              prefix: badgePrefix.trim(),
              value: badgeValue.trim(),
              suffix: badgeSuffix.trim(),
            }
          : undefined,
      isActive,
    };

    const res = await savePromoCard(payload);
    if (res.ok) {
      setCards((prev) => {
        const exists = prev.some((item) => item.id === docId);
        return exists
          ? prev.map((item) => (item.id === docId ? payload : item))
          : [payload, ...prev];
      });
      showToast(editingId ? 'Updated promo card in Firestore!' : 'Added promo card!');
      setShowModal(false);
    } else {
      alert('Failed to save promo card: ' + (res.error || 'Permission check needed'));
    }
    setSaving(false);
  };

  const handleToggleActive = async (c: FirestorePromoCard) => {
    const nextVal = !(c.isActive !== false);
    const res = await updatePromoCardFields(c.id, { isActive: nextVal });
    if (res.ok) {
      setCards((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, isActive: nextVal } : item))
      );
      showToast(nextVal ? `Activated "${c.title}"` : `Hidden "${c.title}"`);
    }
  };

  const handleDelete = async () => {
    if (!deletingCard) return;
    setSaving(true);
    const res = await deletePromoCard(deletingCard.id);
    if (res.ok) {
      setCards((prev) => prev.filter((item) => item.id !== deletingCard.id));
      showToast(`Deleted "${deletingCard.title}"`);
      setDeletingCard(null);
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
          <div className="w-1.5 h-7 bg-[#f59e0b] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Promo Cards
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Homepage promotional banners & discount cards (promo_cards).
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

      {/* Add New Promo */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-[#f59e0b] hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Promo Card</span>
        </button>
        <button
          type="button"
          onClick={() => loadCards(true)}
          className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#f59e0b]"
          title="Refresh Promo Cards"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Promo Cards List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Loading promo cards from Firestore...
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          No promo cards found in Firestore collection promo_cards.
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const active = card.isActive !== false;
            return (
              <div
                key={card.id}
                className={`bg-white rounded-2xl p-3.5 border shadow-sm space-y-2.5 ${
                  active ? 'border-slate-200/80' : 'border-slate-200 opacity-70'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      {card.badge?.value ? (
                        <span className="text-[9.5px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          <span>
                            {card.badge.prefix} {card.badge.value} {card.badge.suffix}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-mono text-slate-400">{card.id}</span>
                      )}

                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {active ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-bold text-[#0d5dd7]">CTA: "{card.ctaText}"</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(card)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0d5dd7] font-bold flex items-center gap-1 border border-blue-200"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(card)}
                      className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 border ${
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
                      onClick={() => setDeletingCard(card)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
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
                {editingId ? 'Edit Promo Card' : 'Add New Promo Card'}
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
                <label className="block font-bold text-slate-700 mb-1">Promo Title *</label>
                <input
                  type="text"
                  required
                  placeholder="EMMA X VIP: TURN YOUR FLEET HIRES INTO REWARDS"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle</label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge Prefix</label>
                  <input
                    type="text"
                    placeholder="UP TO"
                    value={badgePrefix}
                    onChange={(e) => setBadgePrefix(e.target.value)}
                    className="w-full border rounded-xl px-2 py-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Value</label>
                  <input
                    type="text"
                    placeholder="20%"
                    value={badgeValue}
                    onChange={(e) => setBadgeValue(e.target.value)}
                    className="w-full border rounded-xl px-2 py-2 font-black text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    placeholder="DISCOUNT"
                    value={badgeSuffix}
                    onChange={(e) => setBadgeSuffix(e.target.value)}
                    className="w-full border rounded-xl px-2 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Button Text (CTA)</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Promo Image (Cloudinary)
                </label>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Promo preview"
                    className="w-full aspect-video object-cover rounded-xl border border-slate-200"
                  />
                )}
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/qish0wed/image/upload/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800"
                />
                <label className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {uploading ? `Uploading... ${progress}%` : 'Upload Image from Device'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      setProgress(5);
                      try {
                        const url = await uploadToCloudinary(file, (pct) =>
                          setProgress(Math.max(pct, 5))
                        );
                        setImageUrl(url);
                      } catch (err: any) {
                        alert('Upload failed: ' + (err?.message || 'Check connection'));
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 py-2.5 rounded-xl bg-[#f59e0b] text-white font-extrabold"
                >
                  {saving ? 'Saving...' : 'Save to Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <h3 className="font-black text-sm text-slate-900">Delete Promo Card?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong>{deletingCard.title}</strong> from <code className="bg-slate-100 px-1 rounded">promo_cards</code>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingCard(null)}
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
