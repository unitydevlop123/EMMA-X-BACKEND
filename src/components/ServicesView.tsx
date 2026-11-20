import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
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
  FirestoreServiceItem,
  fetchLiveServices,
  getCachedServices,
  saveServiceItem,
  updateServiceFields,
  deleteServiceItem,
} from '../services/part2Firebase';
import { uploadToCloudinary } from '../services/cloudinaryConfig';

interface ServicesViewProps {
  initialServices?: FirestoreServiceItem[];
  initialLoaded?: boolean;
  onBack: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  initialServices,
  initialLoaded,
  onBack,
}) => {
  const cached =
    initialServices && initialServices.length > 0 ? initialServices : getCachedServices();

  const [services, setServices] = useState<FirestoreServiceItem[]>(cached);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cached.length === 0;
  });
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Inquire Now');
  const [baseRate, setBaseRate] = useState<string>('150000');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingService, setDeletingService] = useState<FirestoreServiceItem | null>(null);
  const submitLockRef = useRef(false);
  const draftDocIdRef = useRef<string>('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (initialServices) {
      setServices(initialServices);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialServices, initialLoaded]);

  const loadServices = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const live = await fetchLiveServices();
    setServices(live);
    setLoading(false);
  };

  useEffect(() => {
    if (cached.length === 0 && !initialLoaded) {
      loadServices(true);
    }
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    draftDocIdRef.current = `service-${Date.now()}`;
    setTitle('');
    setDescription('');
    setCtaText('Inquire Escort');
    setBaseRate('150000');
    setImageUrl('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (s: FirestoreServiceItem) => {
    setEditingId(s.id);
    draftDocIdRef.current = s.id;
    setTitle(s.title);
    setDescription(s.description);
    setCtaText(s.ctaText);
    setBaseRate(s.baseRate !== undefined ? String(s.baseRate) : '');
    setImageUrl(s.imageUrl);
    setIsActive(s.isActive !== false);
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
          `service-${Date.now()}`);

      const payload: FirestoreServiceItem = {
        id: docId,
        title: title.trim(),
        description: description.trim(),
        ctaText: ctaText.trim() || 'Inquire Now',
        imageUrl: imageUrl.trim(),
        baseRate: baseRate.trim() ? Number(baseRate) : undefined,
        isActive,
      };

      const res = await saveServiceItem(payload);
      if (res.ok) {
        setServices((prev) => {
          const exists = prev.some((item) => item.id === docId);
          return exists
            ? prev.map((item) => (item.id === docId ? payload : item))
            : [payload, ...prev];
        });
        showToast(editingId ? 'Updated service in Firestore!' : 'Added service card!');
        setShowModal(false);
      } else {
        showToast('Failed to save service: ' + (res.error || 'Permission check needed'));
      }
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const handleToggleActive = async (s: FirestoreServiceItem) => {
    const nextVal = !(s.isActive !== false);
    const res = await updateServiceFields(s.id, { isActive: nextVal });
    if (res.ok) {
      setServices((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, isActive: nextVal } : item))
      );
      showToast(nextVal ? `Activated "${s.title}"` : `Hidden "${s.title}"`);
    }
  };

  const handleDelete = async () => {
    if (!deletingService) return;
    setSaving(true);
    const res = await deleteServiceItem(deletingService.id);
    if (res.ok) {
      setServices((prev) => prev.filter((item) => item.id !== deletingService.id));
      showToast(`Deleted "${deletingService.title}"`);
      setDeletingService(null);
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
          <div className="w-1.5 h-7 bg-[#0d5dd7] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Services Carousel
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              VIP escort, airport pickup & convoy services (services).
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

      {/* Add Service */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-[#0d5dd7] hover:bg-[#0a4bb3] active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Service</span>
        </button>
        <button
          type="button"
          onClick={() => loadServices(true)}
          className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#0d5dd7]"
          title="Refresh Services"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Services List */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Loading services from Firestore...
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          No services found in Firestore collection services.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((srv) => {
            const active = srv.isActive !== false;
            return (
              <div
                key={srv.id}
                className={`bg-white rounded-2xl p-3.5 border shadow-sm space-y-2.5 ${
                  active ? 'border-slate-200/80' : 'border-slate-200 opacity-70'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {srv.imageUrl && srv.imageUrl.startsWith('http') ? (
                      <img
                        src={srv.imageUrl}
                        alt={srv.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="w-6 h-6 text-[#0d5dd7]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        {srv.id}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {active ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-xs text-slate-900 leading-snug">
                      {srv.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {srv.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0d5dd7]">"{srv.ctaText}"</span>
                    {srv.baseRate !== undefined && (
                      <span className="font-black text-slate-800">
                        ₦{srv.baseRate.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(srv)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0d5dd7] font-bold flex items-center gap-1 border border-blue-200"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(srv)}
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
                      onClick={() => setDeletingService(srv)}
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
                {editingId ? 'Edit Service' : 'Add New Service'}
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
                <label className="block font-bold text-slate-700 mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="VIP CONVOY & ESCORT SERVICES"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Text (CTA)</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Rate (₦)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="150000"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Service Image (Cloudinary)
                </label>
                {imageUrl && imageUrl.startsWith('http') && (
                  <img
                    src={imageUrl}
                    alt="Service preview"
                    className="w-full aspect-video object-cover rounded-xl border border-slate-200"
                  />
                )}
                <input
                  type="text"
                  placeholder="https://res.cloudinary.com/qish0wed/image/upload/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800"
                />
                <label className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0d5dd7] rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer">
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
                  className="flex-1 py-2.5 rounded-xl bg-[#0d5dd7] text-white font-extrabold"
                >
                  {saving ? 'Saving...' : 'Save to Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingService && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <h3 className="font-black text-sm text-slate-900">Delete Service?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong>{deletingService.title}</strong> from <code className="bg-slate-100 px-1 rounded">services</code>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingService(null)}
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
