import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  Play,
  Upload,
  Plus,
  X,
  RefreshCw,
  Loader2,
  Film,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Star,
  Sliders,
  Tv,
} from 'lucide-react';
import {
  fetchLiveVideos,
  getCachedVideos,
  getCloudinaryVideoFrameUrl,
  normalizeHttpsUrl,
  saveFrontendVideo,
  updateFrontendVideoFields,
  deleteFirestoreVideo,
  FirestoreVideo,
} from '../services/firebase';
import { uploadToCloudinary } from '../services/cloudinaryConfig';

interface FrontendVideoPageProps {
  initialVideos?: FirestoreVideo[];
  initialLoaded?: boolean;
  onBack: () => void;
}

const FRAME_PRESETS = [0.5, 1.5, 3, 5, 8];

function formatDurationLabel(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:18';
  const total = Math.max(1, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const FrontendVideoPage: React.FC<FrontendVideoPageProps> = ({
  initialVideos,
  initialLoaded,
  onBack,
}) => {
  const cachedVideos =
    initialVideos && initialVideos.length > 0 ? initialVideos : getCachedVideos();

  const [allVideos, setAllVideos] = useState<FirestoreVideo[]>(cachedVideos);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cachedVideos.length === 0;
  });
  const [playingVideo, setPlayingVideo] = useState<FirestoreVideo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formDuration, setFormDuration] = useState('0:18');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formPosterMode, setFormPosterMode] = useState<'frame' | 'custom'>('frame');
  const [formCoverTimestamp, setFormCoverTimestamp] = useState<number>(1.5);
  const [formCustomPosterUrl, setFormCustomPosterUrl] = useState('');

  // Upload & Save Progress states
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [posterProgress, setPosterProgress] = useState(0);
  const [savingForm, setSavingForm] = useState(false);
  const [videoDurationSec, setVideoDurationSec] = useState<number>(18);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(1.5);
  const formVideoRef = useRef<HTMLVideoElement | null>(null);

  // Quick toggle & delete states
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingVideo, setRemovingVideo] = useState<FirestoreVideo | null>(null);
  const [removingAction, setRemovingAction] = useState(false);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  useEffect(() => {
    if (initialVideos) {
      setAllVideos(initialVideos);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialVideos, initialLoaded]);

  const loadVideos = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const live = await fetchLiveVideos();
    setAllVideos(live);
    setLoading(false);
  };

  useEffect(() => {
    if (cachedVideos.length === 0 && !initialLoaded) {
      loadVideos(true);
    }
  }, []);

  // ONLY the Homepage Watch Display videos (isFeatured === true), separate from the 14 Video Fleet Vault reels!
  const homepageVideos = allVideos
    .filter((v) => v.isFeatured === true)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const activeHomepageCount = homepageVideos.filter((v) => v.isActive !== false).length;

  const getPosterSrc = (vid: FirestoreVideo): string => {
    const candidate = vid.posterUrl || vid.coverUrl;
    if (candidate && candidate.trim()) {
      return normalizeHttpsUrl(candidate);
    }
    return getCloudinaryVideoFrameUrl(vid.videoUrl || vid.url, vid.coverTimestamp ?? 1.5);
  };

  const openAddModal = (slotOrder?: number) => {
    const nextSlot = slotOrder || (homepageVideos.length === 0 ? 1 : 2);
    setEditingId(null);
    setFormTitle('');
    setFormSubtitle('Emma X Exclusive Flagship · Armored Road Presence & Protocol');
    setFormBadge(nextSlot === 1 ? 'EMMA X BLACK EDITION' : 'VIP CONVOY SHOWCASE');
    setFormDuration('0:18');
    setFormOrder(nextSlot);
    setFormIsActive(true);
    setFormVideoUrl('');
    setFormPosterMode('frame');
    setFormCoverTimestamp(1.5);
    setFormCustomPosterUrl('');
    setVideoDurationSec(18);
    setCurrentPlayTime(1.5);
    setShowFormModal(true);
  };

  const openEditModal = (vid: FirestoreVideo) => {
    const vidUrl = normalizeHttpsUrl(vid.videoUrl || vid.secureUrl || vid.url);
    const ts = typeof vid.coverTimestamp === 'number' ? vid.coverTimestamp : 1.5;
    const rawPoster = normalizeHttpsUrl(vid.posterUrl || vid.coverUrl);
    const isCustomPoster =
      Boolean(rawPoster) && !rawPoster.includes('/video/upload/so_');

    setEditingId(vid.id);
    setFormTitle(vid.title || '');
    setFormSubtitle(vid.subtitle || '');
    setFormBadge(vid.badge || '');
    setFormDuration(vid.duration || '0:18');
    setFormOrder(vid.order || 1);
    setFormIsActive(vid.isActive !== false);
    setFormVideoUrl(vidUrl);
    setFormCoverTimestamp(ts);
    setCurrentPlayTime(ts);
    setVideoDurationSec(18);
    if (isCustomPoster) {
      setFormPosterMode('custom');
      setFormCustomPosterUrl(rawPoster);
    } else {
      setFormPosterMode('frame');
      setFormCustomPosterUrl('');
    }
    setShowFormModal(true);
  };

  const computedPosterPreview = (() => {
    const safeVid = normalizeHttpsUrl(formVideoUrl.trim());
    if (formPosterMode === 'custom' && formCustomPosterUrl.trim()) {
      return normalizeHttpsUrl(formCustomPosterUrl.trim());
    }
    return getCloudinaryVideoFrameUrl(safeVid, formCoverTimestamp);
  })();

  const handleCaptureCurrentFrame = () => {
    if (!formVideoRef.current) return;
    const t = Math.max(0, Number(formVideoRef.current.currentTime.toFixed(1)));
    setFormPosterMode('frame');
    setFormCoverTimestamp(t);
    setCurrentPlayTime(t);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeVideo = normalizeHttpsUrl(formVideoUrl.trim());
    if (!safeVideo) {
      alert('Please upload an MP4 video to Cloudinary or paste a valid video URL.');
      return;
    }

    setSavingForm(true);
    const docId =
      editingId ||
      (formTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `homepage-watch-${Date.now()}`);

    const finalPoster =
      computedPosterPreview || getCloudinaryVideoFrameUrl(safeVideo, formCoverTimestamp);

    const existing = editingId ? allVideos.find((v) => v.id === editingId) : undefined;

    const payload: FirestoreVideo = {
      id: docId,
      title: formTitle.trim() || 'Emma X Black Edition VIP Convoy',
      subtitle: formSubtitle.trim(),
      badge: formBadge.trim(),
      duration: formDuration.trim() || '0:18',
      videoUrl: safeVideo,
      secureUrl: safeVideo,
      url: safeVideo,
      posterUrl: finalPoster,
      coverUrl: finalPoster,
      coverTimestamp: formCoverTimestamp,
      isFeatured: true,
      isActive: formIsActive,
      order: Number(formOrder) || 1,
      format: 'mp4',
      createdAt: existing?.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const ok = await saveFrontendVideo(payload);
    if (ok) {
      setAllVideos((prev) => {
        const exists = prev.some((v) => v.id === docId);
        if (exists) {
          return prev.map((v) => (v.id === docId ? { ...v, ...payload } : v));
        }
        return [...prev, payload];
      });
      showToast(
        editingId
          ? `Updated Homepage Video "${payload.title}"!`
          : `Added "${payload.title}" to Homepage Display!`
      );
      setShowFormModal(false);
    } else {
      alert('Failed to save to Firestore fleet_videos. Please try again.');
    }
    setSavingForm(false);
  };

  const handleToggleActive = async (vid: FirestoreVideo) => {
    const currentlyActive = vid.isActive !== false;
    const nextVal = !currentlyActive;
    setTogglingId(vid.id);
    const ok = await updateFrontendVideoFields(vid.id, { isActive: nextVal });
    if (ok) {
      setAllVideos((prev) =>
        prev.map((v) => (v.id === vid.id ? { ...v, isActive: nextVal } : v))
      );
      showToast(
        nextVal
          ? `"${vid.title}" is now Active on Homepage Display.`
          : `"${vid.title}" hidden from Homepage Display.`
      );
    }
    setTogglingId(null);
  };

  const handleDeleteFromFirestore = async () => {
    if (!removingVideo) return;
    setRemovingAction(true);
    const ok = await deleteFirestoreVideo(removingVideo.id);
    if (ok) {
      setAllVideos((prev) => prev.filter((v) => v.id !== removingVideo.id));
      showToast(`Removed "${removingVideo.title || removingVideo.id}" from Homepage Display.`);
      setRemovingVideo(null);
    } else {
      alert('Failed to delete video from Firestore.');
    }
    setRemovingAction(false);
  };

  const slotsNeeded = Math.max(0, 2 - homepageVideos.length);

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-16">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-7 bg-[#0d5dd7] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Frontend Video
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage only the 2 Homepage Watch Display videos (separate from Fleet Video Vault).
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

      {/* Homepage 2-Slot Live Banner */}
      <div className="bg-gradient-to-br from-[#0d5dd7] to-[#083e96] rounded-2xl p-4 text-white shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-blue-200" />
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-100">
              Homepage Watch Display (2 Slots Only)
            </span>
          </div>
          <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 px-2 py-0.5 rounded">
            {activeHomepageCount} / 2 Live
          </span>
        </div>

        <p className="text-[11px] text-blue-100/95 leading-snug">
          These are the <strong>2 featured homepage videos</strong> (<code className="bg-white/15 px-1 rounded">isFeatured: true</code>). Your 14 Fleet Video Vault reels live separately in <strong>Fleet Editor</strong>.
        </p>
      </div>

      {/* Header Row with Refresh & Add Button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold text-slate-700">
          Homepage Watch Videos ({homepageVideos.length} / 2)
        </span>
        <button
          type="button"
          onClick={() => loadVideos(true)}
          className="flex items-center gap-1 text-xs font-bold text-[#0d5dd7] hover:underline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {homepageVideos.length < 2 && (
        <button
          type="button"
          onClick={() => openAddModal(homepageVideos.length + 1)}
          className="w-full py-3 bg-[#0d5dd7] hover:bg-[#0a4bb3] active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Homepage Display Video (Slot #{homepageVideos.length + 1})</span>
        </button>
      )}

      {/* The 2 Homepage Watch Video Cards */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Loading Homepage Watch videos from Firestore...
        </div>
      ) : (
        <div className="space-y-3">
          {homepageVideos.map((vid, idx) => {
            const posterSrc = getPosterSrc(vid);
            const isActive = vid.isActive !== false;
            const busy = togglingId === vid.id;

            return (
              <div
                key={vid.id}
                className={`bg-white rounded-2xl p-3.5 border shadow-sm space-y-3 transition-all ${
                  isActive ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200 opacity-75'
                }`}
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0d5dd7] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#0d5dd7]" />
                    <span>Homepage Slot #{vid.order || idx + 1}</span>
                  </span>

                  <span
                    className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {isActive ? 'VISIBLE ON HOMEPAGE' : 'HIDDEN'}
                  </span>
                </div>

                {/* Framed Video Cover */}
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-inner">
                  <div
                    onClick={() => setPlayingVideo(vid)}
                    className="relative aspect-video rounded-lg bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center group"
                  >
                    {posterSrc ? (
                      <img
                        src={posterSrc}
                        alt={vid.title || `Homepage Video #${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.retried) {
                            target.dataset.retried = '1';
                            target.src = getCloudinaryVideoFrameUrl(
                              vid.videoUrl || vid.url,
                              0.2
                            );
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <Film className="w-7 h-7 text-blue-300" />
                    )}

                    {/* Top Left Badge */}
                    {vid.badge && (
                      <span className="absolute top-2 left-2 bg-[#0d5dd7]/90 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                        {vid.badge}
                      </span>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 flex items-center justify-center">
                      <div className="w-11 h-11 rounded-full bg-[#0d5dd7]/95 group-hover:scale-110 text-white flex items-center justify-center shadow-xl border-2 border-white/75 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Right Duration & MP4 */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      {vid.duration && (
                        <span className="bg-black/75 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {vid.duration}
                        </span>
                      )}
                      <span className="bg-black/75 text-slate-200 font-mono text-[9px] px-1.5 py-0.5 rounded">
                        MP4
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title, Subtitle & ID */}
                <div className="space-y-0.5 px-0.5">
                  <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {vid.title || `Homepage Showcase #${idx + 1}`}
                  </h3>
                  {vid.subtitle && (
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {vid.subtitle}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-mono truncate pt-0.5">
                    Doc ID: {vid.id}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-6 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPlayingVideo(vid)}
                    className="col-span-2 py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3 text-slate-600" />
                    <span>Play</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(vid)}
                    className="col-span-2 py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0d5dd7] text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3 h-3 text-[#0d5dd7]" />
                    <span>Edit / Swap</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggleActive(vid)}
                    className={`col-span-1 py-1.5 px-1.5 rounded-lg border flex items-center justify-center ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={isActive ? 'Hide from Homepage' : 'Show on Homepage'}
                  >
                    {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemovingVideo(vid)}
                    className="col-span-1 py-1.5 px-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 flex items-center justify-center"
                    title="Delete Homepage Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty Slot Placeholders (Always keeps it crystal-clear: 2 Homepage Display Slots) */}
          {Array.from({ length: slotsNeeded }).map((_, emptyIdx) => {
            const slotNumber = homepageVideos.length + emptyIdx + 1;
            return (
              <div
                key={`empty-slot-${slotNumber}`}
                onClick={() => openAddModal(slotNumber)}
                className="bg-white rounded-2xl p-5 border-2 border-dashed border-slate-300 hover:border-[#0d5dd7] cursor-pointer text-center space-y-2 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0d5dd7] flex items-center justify-center mx-auto">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Homepage Display Slot #{slotNumber} (Empty)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tap to upload an MP4 video & cover for Homepage Watch Slot #{slotNumber}.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PLAY VIDEO MODAL */}
      {/* ========================================================================= */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-4 max-w-lg w-full space-y-3 border border-slate-800 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm truncate">{playingVideo.title}</h3>
                {playingVideo.subtitle && (
                  <p className="text-[11px] text-slate-400 truncate">{playingVideo.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <video
                src={normalizeHttpsUrl(playingVideo.videoUrl || playingVideo.url)}
                poster={getPosterSrc(playingVideo)}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-mono truncate flex-1">
                {normalizeHttpsUrl(playingVideo.videoUrl || playingVideo.url)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const target = playingVideo;
                  setPlayingVideo(null);
                  openEditModal(target);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0d5dd7] hover:bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit / Swap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT HOMEPAGE VIDEO MODAL */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0d5dd7] flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 leading-tight">
                    {editingId ? 'Edit / Replace Homepage Video' : 'Add Homepage Watch Video'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Saved directly to fleet_videos with isFeatured: true
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Video Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emma X Black Edition VIP Convoy"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-[#0d5dd7]"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Emma X Exclusive Flagship · Armored Road Presence & Protocol"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0d5dd7]"
                />
              </div>

              {/* Badge, Duration, Slot Order */}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Badge Label</label>
                  <input
                    type="text"
                    placeholder="EMMA X BLACK EDITION"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-2 font-bold uppercase text-[11px] text-slate-800"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="0:18"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2 py-2 font-mono text-center text-[11px] text-slate-800"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Slot</label>
                  <select
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-1.5 py-2 font-bold text-center text-[11px] text-slate-800"
                  >
                    <option value={1}>#1</option>
                    <option value={2}>#2</option>
                  </select>
                </div>
              </div>

              {/* Visibility Switch */}
              <button
                type="button"
                onClick={() => setFormIsActive((prev) => !prev)}
                className={`w-full py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                  formIsActive
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}
              >
                {formIsActive ? (
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {formIsActive
                    ? 'Visible on Homepage Display (isActive: true)'
                    : 'Hidden from Homepage Display (isActive: false)'}
                </span>
              </button>

              {/* Video File Upload / URL (videoUrl) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-extrabold text-slate-800 uppercase text-[11px]">
                  Cloudinary MP4 Video (videoUrl) <span className="text-red-500">*</span>
                </label>

                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/qish0wed/video/upload/..."
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-mono text-[11px] text-slate-800"
                />

                <label className="w-full py-2 px-3 bg-[#0d5dd7] hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  {uploadingVideo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {uploadingVideo
                      ? `Uploading to Cloudinary... ${videoProgress}%`
                      : formVideoUrl
                      ? 'Replace MP4 Video from Device'
                      : 'Upload MP4 Video from Device'}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    disabled={uploadingVideo}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingVideo(true);
                      setVideoProgress(5);
                      try {
                        const resUrl = await uploadToCloudinary(file, (pct) => {
                          setVideoProgress(Math.max(pct, 5));
                        });
                        setFormVideoUrl(resUrl);
                      } catch (err: any) {
                        alert('Video Upload Failed: ' + (err?.message || 'Check connection'));
                      } finally {
                        setUploadingVideo(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>

                {uploadingVideo && (
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0d5dd7] transition-all duration-150 rounded-full"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                )}

                {formVideoUrl.trim() && !uploadingVideo && (
                  <div className="rounded-lg overflow-hidden bg-black border border-slate-800">
                    <video
                      ref={formVideoRef}
                      src={normalizeHttpsUrl(formVideoUrl.trim())}
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const d = e.currentTarget.duration;
                        if (d && Number.isFinite(d) && d > 0) {
                          setVideoDurationSec(Math.max(1, Math.floor(d)));
                          if (!editingId) {
                            setFormDuration(formatDurationLabel(d));
                          }
                        }
                      }}
                      onTimeUpdate={(e) => {
                        setCurrentPlayTime(Number(e.currentTarget.currentTime.toFixed(1)));
                      }}
                      className="w-full aspect-video object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Poster / Cover Thumbnail Section (posterUrl) */}
              {formVideoUrl.trim() && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 uppercase text-[11px]">
                      Video Cover / Poster (posterUrl)
                    </span>
                    <span className="text-[10px] font-bold text-[#0d5dd7]">
                      {formPosterMode === 'custom' && formCustomPosterUrl
                        ? 'Custom Cover'
                        : `Frame @ ${formCoverTimestamp.toFixed(1)}s`}
                    </span>
                  </div>

                  {/* Cover Mode Switcher */}
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFormPosterMode('frame')}
                      className={`py-1 rounded-md font-bold flex items-center justify-center gap-1 ${
                        formPosterMode === 'frame'
                          ? 'bg-white text-[#0d5dd7] shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      <Film className="w-3 h-3" />
                      <span>Video Frame</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPosterMode('custom')}
                      className={`py-1 rounded-md font-bold flex items-center justify-center gap-1 ${
                        formPosterMode === 'custom'
                          ? 'bg-white text-[#0d5dd7] shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Custom Poster</span>
                    </button>
                  </div>

                  {formPosterMode === 'frame' ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleCaptureCurrentFrame}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Capture Current Video Frame ({currentPlayTime.toFixed(1)}s)</span>
                      </button>

                      <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-[#0d5dd7]" />
                          Scrub Timestamp:
                        </span>
                        <span className="font-mono text-[#0d5dd7]">{formCoverTimestamp.toFixed(1)}s</span>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={Math.max(videoDurationSec, 10)}
                        step={0.5}
                        value={formCoverTimestamp}
                        onChange={(e) => setFormCoverTimestamp(Number(e.target.value))}
                        className="w-full accent-[#0d5dd7] cursor-pointer"
                      />

                      <div className="flex items-center gap-1 flex-wrap">
                        {FRAME_PRESETS.filter((s) => s <= Math.max(videoDurationSec, 10)).map(
                          (sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setFormCoverTimestamp(sec)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                formCoverTimestamp === sec
                                  ? 'bg-[#0d5dd7] text-white border-[#0d5dd7]'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {sec}s
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="w-full py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer text-[11px]">
                        {uploadingPoster ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0d5dd7]" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#0d5dd7]" />
                        )}
                        <span>
                          {uploadingPoster
                            ? `Uploading Poster... ${posterProgress}%`
                            : 'Upload Poster Image from Device'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPoster}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingPoster(true);
                            setPosterProgress(5);
                            try {
                              const imgUrl = await uploadToCloudinary(file, (pct) => {
                                setPosterProgress(Math.max(pct, 5));
                              });
                              setFormCustomPosterUrl(imgUrl);
                            } catch (err: any) {
                              alert('Poster upload failed: ' + (err?.message || 'Check connection'));
                            } finally {
                              setUploadingPoster(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>

                      <input
                        type="url"
                        placeholder="Or paste poster JPG URL..."
                        value={formCustomPosterUrl}
                        onChange={(e) => setFormCustomPosterUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-slate-800"
                      />
                    </div>
                  )}

                  {/* Poster Preview */}
                  {computedPosterPreview && (
                    <div className="p-1 rounded-lg bg-slate-900 border border-slate-700">
                      <img
                        key={computedPosterPreview}
                        src={computedPosterPreview}
                        alt="Poster preview"
                        className="w-full aspect-video object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm || uploadingVideo || uploadingPoster}
                  className="flex-1 py-2.5 rounded-xl bg-[#0d5dd7] hover:bg-blue-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {savingForm ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Save to Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {removingVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 leading-tight">
                  Delete Homepage Video
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Firestore fleet_videos/{removingVideo.id}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting <strong>{removingVideo.title || removingVideo.id}</strong> removes it immediately from the Homepage Watch Display.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setRemovingVideo(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removingAction}
                onClick={handleDeleteFromFirestore}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {removingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Video</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
