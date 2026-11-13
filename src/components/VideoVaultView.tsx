import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Upload,
  Plus,
  X,
  RefreshCw,
  Loader2,
  Film,
  Image as ImageIcon,
  Camera,
  Sparkles,
  CheckCircle2,
  Trash2,
  Sliders,
} from 'lucide-react';
import {
  fetchLiveVideos,
  getCachedVideos,
  getCloudinaryVideoFrameUrl,
  normalizeHttpsUrl,
  updateFirestoreVideoCover,
  deleteFirestoreVideo,
  FirestoreVideo,
  db,
} from '../services/firebase';
import { uploadToCloudinary } from '../services/cloudinaryConfig';
import { doc, setDoc } from 'firebase/firestore';

interface VideoVaultViewProps {
  initialVideos?: FirestoreVideo[];
  initialLoaded?: boolean;
  onBack: () => void;
}

const FRAME_PRESETS = [0.5, 1.5, 3, 5, 8];

export const VideoVaultView: React.FC<VideoVaultViewProps> = ({
  initialVideos,
  initialLoaded,
  onBack,
}) => {
  const cachedVideos =
    initialVideos && initialVideos.length > 0 ? initialVideos : getCachedVideos();

  const [videos, setVideos] = useState<FirestoreVideo[]>(cachedVideos);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cachedVideos.length === 0;
  });
  const [activeVideo, setActiveVideo] = useState<FirestoreVideo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New video modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCoverTimestamp, setNewCoverTimestamp] = useState<number>(1.5);
  const [newCustomCoverUrl, setNewCustomCoverUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingNewCover, setUploadingNewCover] = useState(false);
  const [newCoverProgress, setNewCoverProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  // Cover Creator / Editor Modal state
  const [editingCoverVideo, setEditingCoverVideo] = useState<FirestoreVideo | null>(null);
  const [coverMode, setCoverMode] = useState<'frame' | 'custom'>('frame');
  const [coverTimestamp, setCoverTimestamp] = useState<number>(1.5);
  const [customCoverUrl, setCustomCoverUrl] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(1.5);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [savingCover, setSavingCover] = useState(false);
  const coverVideoRef = useRef<HTMLVideoElement | null>(null);

  // Delete confirmation modal
  const [deletingVideo, setDeletingVideo] = useState<FirestoreVideo | null>(null);
  const [deletingAction, setDeletingAction] = useState(false);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Sync live updates pushed from App's onSnapshot listener
  useEffect(() => {
    if (initialVideos && initialVideos.length > 0) {
      setVideos(initialVideos);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialVideos, initialLoaded]);

  const loadVideos = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const live = await fetchLiveVideos();
    setVideos(live);
    setLoading(false);
  };

  useEffect(() => {
    if (cachedVideos.length === 0 && !initialLoaded) {
      loadVideos(true);
    }
  }, []);

  const getVideoCoverSrc = (vid: FirestoreVideo): string => {
    if (vid.coverUrl && vid.coverUrl.trim()) {
      return normalizeHttpsUrl(vid.coverUrl);
    }
    return getCloudinaryVideoFrameUrl(vid.url, vid.coverTimestamp ?? 1.5);
  };

  const openCoverEditor = (vid: FirestoreVideo) => {
    const ts = typeof vid.coverTimestamp === 'number' ? vid.coverTimestamp : 1.5;
    const frameUrl = getCloudinaryVideoFrameUrl(vid.url, ts);
    const hasCustomUploadedCover =
      Boolean(vid.coverUrl) &&
      vid.coverUrl !== frameUrl &&
      !vid.coverUrl?.includes('/video/upload/so_');

    setEditingCoverVideo(vid);
    setEditTitle(vid.title || '');
    setCoverTimestamp(ts);
    setCurrentPlayTime(ts);
    setVideoDuration(15);
    if (hasCustomUploadedCover && vid.coverUrl) {
      setCoverMode('custom');
      setCustomCoverUrl(normalizeHttpsUrl(vid.coverUrl));
    } else {
      setCoverMode('frame');
      setCustomCoverUrl('');
    }
  };

  const previewCoverUrl = editingCoverVideo
    ? coverMode === 'custom' && customCoverUrl
      ? normalizeHttpsUrl(customCoverUrl)
      : getCloudinaryVideoFrameUrl(editingCoverVideo.url, coverTimestamp)
    : '';

  const handleCaptureCurrentFrame = () => {
    if (!coverVideoRef.current) return;
    const t = Math.max(0, Number(coverVideoRef.current.currentTime.toFixed(1)));
    setCoverMode('frame');
    setCoverTimestamp(t);
    setCurrentPlayTime(t);
  };

  const handleSaveCover = async () => {
    if (!editingCoverVideo) return;
    const finalCover = previewCoverUrl || getVideoCoverSrc(editingCoverVideo);
    setSavingCover(true);

    const ok = await updateFirestoreVideoCover(editingCoverVideo.id, {
      coverUrl: finalCover,
      coverTimestamp: coverMode === 'frame' ? coverTimestamp : editingCoverVideo.coverTimestamp ?? 1.5,
      title: editTitle.trim() || editingCoverVideo.title,
    });

    if (ok) {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === editingCoverVideo.id
            ? {
                ...v,
                coverUrl: finalCover,
                coverTimestamp: coverMode === 'frame' ? coverTimestamp : v.coverTimestamp,
                title: editTitle.trim() || v.title,
              }
            : v
        )
      );
      showToast('Video cover frame saved to Firestore!');
      setEditingCoverVideo(null);
    } else {
      alert('Failed to save cover to Firestore. Please try again.');
    }
    setSavingCover(false);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeVideoUrl = normalizeHttpsUrl(newUrl.trim());
    if (!safeVideoUrl) {
      alert('Please provide or upload a Cloudinary MP4 video URL.');
      return;
    }

    setSaving(true);
    try {
      const nextId = `video_${Date.now()}`;
      const docRef = doc(db, 'fleet_videos', nextId);
      const finalCover =
        normalizeHttpsUrl(newCustomCoverUrl.trim()) ||
        getCloudinaryVideoFrameUrl(safeVideoUrl, newCoverTimestamp);

      const payload: FirestoreVideo = {
        id: nextId,
        url: safeVideoUrl,
        secureUrl: safeVideoUrl,
        coverUrl: finalCover,
        coverTimestamp: newCoverTimestamp,
        title: newTitle.trim() || `VIP Fleet Reel #${videos.length + 1}`,
        format: 'mp4',
        order: videos.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      setVideos((prev) => [...prev, payload]);
      showToast(`Saved "${payload.title}" with framed cover!`);
      setShowAddModal(false);
      setNewTitle('');
      setNewUrl('');
      setNewCoverTimestamp(1.5);
      setNewCustomCoverUrl('');
    } catch (err: any) {
      console.error('Error saving video to Firestore:', err);
      alert('Failed to save to Firestore: ' + (err?.message || 'Check connection'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingVideo) return;
    setDeletingAction(true);
    const ok = await deleteFirestoreVideo(deletingVideo.id);
    if (ok) {
      setVideos((prev) => prev.filter((v) => v.id !== deletingVideo.id));
      showToast(`Removed "${deletingVideo.title || deletingVideo.id}" from Video Vault.`);
      setDeletingVideo(null);
    } else {
      alert('Failed to delete video from Firestore.');
    }
    setDeletingAction(false);
  };

  const newVideoAutoCover =
    normalizeHttpsUrl(newCustomCoverUrl.trim()) ||
    getCloudinaryVideoFrameUrl(newUrl.trim(), newCoverTimestamp);

  const vaultVideos = videos.filter((v) => !v.isFeatured);

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-16">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* Title */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-7 bg-purple-600 rounded-full mt-0.5 shrink-0"></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Fleet Video Vault & Reels
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Framed Cloudinary reels with customizable video frame & photo covers.
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

      {/* Add New Video Button */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Upload New Video Reel to Cloudinary</span>
      </button>

      {/* Live Video Count Badge */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-extrabold text-slate-700">
          Live Reels in Firestore ({vaultVideos.length} Videos)
        </span>
        <button
          type="button"
          onClick={() => loadVideos(true)}
          className="flex items-center gap-1 text-purple-700 font-bold hover:underline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Active Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-4 max-w-lg w-full space-y-3 border border-slate-800 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Film className="w-4 h-4 text-purple-400 shrink-0" />
                <h3 className="font-extrabold text-sm truncate">{activeVideo.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <video
                src={normalizeHttpsUrl(activeVideo.url)}
                poster={getVideoCoverSrc(activeVideo)}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-400 font-mono truncate flex-1">
                {normalizeHttpsUrl(activeVideo.url)}
              </p>
              <button
                type="button"
                onClick={() => {
                  const target = activeVideo;
                  setActiveVideo(null);
                  openCoverEditor(target);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Create Cover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          Loading videos from Firestore...
        </div>
      ) : vaultVideos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          No vault reels found in Firestore collection fleet_videos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vaultVideos.map((vid, idx) => {
            const coverSrc = getVideoCoverSrc(vid);
            const hasCustomPhoto =
              Boolean(vid.coverUrl) && !vid.coverUrl?.includes('/video/upload/so_');

            return (
              <div
                key={vid.id}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm space-y-2.5 hover:border-purple-300 transition-all"
              >
                {/* Framed Video Thumbnail Cover */}
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-inner">
                  <div
                    onClick={() => setActiveVideo(vid)}
                    className="relative aspect-video rounded-lg bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center group"
                  >
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={vid.title || `Reel #${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.retried) {
                            target.dataset.retried = '1';
                            target.src = getCloudinaryVideoFrameUrl(vid.url, 0.2);
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                        <Film className="w-6 h-6 text-purple-400" />
                        <span className="text-[10px] font-bold">Tap to Play Reel</span>
                      </div>
                    )}

                    {/* Subtle Cinema Frame Vignette & Corner Accents */}
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/15 rounded-lg" />
                    <div className="pointer-events-none absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-white/60 rounded-tl-xs" />
                    <div className="pointer-events-none absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-white/60 rounded-tr-xs" />
                    <div className="pointer-events-none absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-white/60 rounded-bl-xs" />
                    <div className="pointer-events-none absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-white/60 rounded-br-xs" />

                    {/* Top Badge */}
                    <div className="absolute top-2 left-2.5 flex items-center gap-1">
                      <span className="bg-black/65 backdrop-blur-xs text-white text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/15">
                        REEL #{idx + 1}
                      </span>
                      <span className="bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {hasCustomPhoto
                          ? 'Custom Cover'
                          : `Frame ${(vid.coverTimestamp ?? 1.5).toFixed(1).replace(/\.0$/, '')}s`}
                      </span>
                    </div>

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 flex items-center justify-center">
                      <div className="w-11 h-11 rounded-full bg-purple-600/95 group-hover:bg-purple-500 group-hover:scale-110 text-white flex items-center justify-center shadow-xl border-2 border-white/70 transition-all">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Format / Size Badges */}
                    <div className="absolute bottom-2 right-2.5 flex items-center gap-1">
                      {vid.bytes && (
                        <span className="bg-black/70 text-slate-200 font-mono text-[9px] px-1.5 py-0.5 rounded">
                          {(vid.bytes / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
                      <span className="bg-black/75 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                        MP4
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title & ID */}
                <div className="px-0.5">
                  <h4 className="font-extrabold text-xs text-slate-900 leading-snug truncate">
                    {vid.title || `Reel #${idx + 1}`}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    ID: {vid.id}
                  </p>
                </div>

                {/* Action Buttons: Play | Create/Edit Cover | Delete */}
                <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    className="col-span-2 py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3 text-slate-600" />
                    <span>Play</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCoverEditor(vid)}
                    className="col-span-2 py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Create or edit video cover frame"
                  >
                    <Camera className="w-3 h-3 text-purple-600" />
                    <span>Edit Cover</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingVideo(vid)}
                    className="col-span-1 py-1.5 px-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 flex items-center justify-center transition-colors"
                    title="Delete video reel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT VIDEO COVER MODAL */}
      {/* ========================================================================= */}
      {editingCoverVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 leading-tight">
                    Create Video Cover & Frame
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Pick any frame from this video or upload your own cover image
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoverVideo(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editable Video Title */}
            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Reel Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter video reel title..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Source Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setCoverMode('frame')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  coverMode === 'frame'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Frame From Video</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverMode('custom')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  coverMode === 'custom'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Custom Cover</span>
              </button>
            </div>

            {coverMode === 'frame' ? (
              <div className="space-y-2.5 text-xs">
                {/* Interactive Video Scrubber */}
                <div className="rounded-xl overflow-hidden bg-black border border-slate-800">
                  <video
                    ref={coverVideoRef}
                    src={normalizeHttpsUrl(editingCoverVideo.url)}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (d && Number.isFinite(d) && d > 0) {
                        setVideoDuration(Math.max(1, Math.floor(d)));
                      }
                    }}
                    onTimeUpdate={(e) => {
                      setCurrentPlayTime(Number(e.currentTarget.currentTime.toFixed(1)));
                    }}
                    className="w-full aspect-video object-contain"
                  />
                </div>

                {/* Capture Current Video Position Button */}
                <button
                  type="button"
                  onClick={handleCaptureCurrentFrame}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Current Frame ({currentPlayTime.toFixed(1)}s)</span>
                </button>

                {/* Timestamp Slider */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-purple-600" />
                      Scrub Frame Timestamp
                    </span>
                    <span className="font-mono font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      {coverTimestamp.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(videoDuration, 10)}
                    step={0.5}
                    value={coverTimestamp}
                    onChange={(e) => setCoverTimestamp(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Quick:</span>
                    {FRAME_PRESETS.filter((sec) => sec <= Math.max(videoDuration, 10)).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setCoverTimestamp(sec)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                          coverTimestamp === sec
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                <label className="w-full py-2.5 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  {uploadingCover ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {uploadingCover
                      ? `Uploading Cover... ${coverUploadProgress}%`
                      : 'Upload Custom Cover Image from Device'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingCover}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingCover(true);
                      setCoverUploadProgress(5);
                      try {
                        const imgUrl = await uploadToCloudinary(file, (pct) => {
                          setCoverUploadProgress(Math.max(pct, 5));
                        });
                        setCustomCoverUrl(imgUrl);
                      } catch (err: any) {
                        alert('Cover upload failed: ' + (err?.message || 'Check connection'));
                      } finally {
                        setUploadingCover(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>

                {uploadingCover && (
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all duration-150 rounded-full"
                      style={{ width: `${coverUploadProgress}%` }}
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-600 mb-1 text-[11px]">
                    Or Paste Cover Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/qish0wed/image/upload/..."
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Live Framed Cover Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-slate-700">Live Framed Cover Preview</span>
                <span className="text-[10px] font-semibold text-emerald-600">
                  {coverMode === 'custom' && customCoverUrl
                    ? 'Custom Photo Cover'
                    : `Video Frame @ ${coverTimestamp.toFixed(1)}s`}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 shadow-inner">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                  {previewCoverUrl ? (
                    <img
                      key={previewCoverUrl}
                      src={previewCoverUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Upload a cover image or select a video frame
                    </span>
                  )}
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20 rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-9 h-9 rounded-full bg-purple-600/90 text-white flex items-center justify-center border border-white/70 shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingCoverVideo(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCover || uploadingCover}
                onClick={handleSaveCover}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {savingCover ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Save Cover Frame</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TO UPLOAD NEW VIDEO REEL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">Upload Video Reel</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Video Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prado Convoy Benin-Warri Highway"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudinary Video File / URL
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/qish0wed/video/upload/..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800"
                  />

                  <label className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>
                      {uploading
                        ? `Uploading to Cloudinary... ${uploadProgress}%`
                        : 'Upload MP4 from Device'}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={uploading}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploading(true);
                          setUploadProgress(5);
                          try {
                            const resUrl = await uploadToCloudinary(file, (pct) => {
                              setUploadProgress(Math.max(pct, 5));
                            });
                            setNewUrl(resUrl);
                          } catch (err: any) {
                            console.error('Video upload error:', err);
                            alert('Video Upload Failed: ' + (err?.message || 'Check connection'));
                          } finally {
                            setUploading(false);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                {uploading && (
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-purple-600 transition-all duration-150 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Cover Frame Selector for New Video */}
              {newUrl.trim() && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Auto-Generated Frame Cover</span>
                    <span className="text-[10px] font-bold text-purple-700">
                      {newCustomCoverUrl ? 'Custom Photo' : `${newCoverTimestamp}s Frame`}
                    </span>
                  </div>

                  {newVideoAutoCover && (
                    <div className="p-1 rounded-lg bg-slate-900 border border-slate-700">
                      <img
                        src={newVideoAutoCover}
                        alt="New video cover preview"
                        className="w-full aspect-video object-cover rounded"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold">Frame:</span>
                    {FRAME_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setNewCustomCoverUrl('');
                          setNewCoverTimestamp(sec);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          !newCustomCoverUrl && newCoverTimestamp === sec
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>

                  <label className="w-full py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer text-[11px]">
                    {uploadingNewCover ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                    )}
                    <span>
                      {uploadingNewCover
                        ? `Uploading Cover... ${newCoverProgress}%`
                        : 'Or Upload Custom Cover Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingNewCover}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingNewCover(true);
                        setNewCoverProgress(5);
                        try {
                          const coverImg = await uploadToCloudinary(file, (pct) => {
                            setNewCoverProgress(Math.max(pct, 5));
                          });
                          setNewCustomCoverUrl(coverImg);
                        } catch (err: any) {
                          alert('Cover upload failed: ' + (err?.message || 'Check connection'));
                        } finally {
                          setUploadingNewCover(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading || uploadingNewCover}
                  className="flex-1 py-2 rounded-xl bg-purple-600 text-white font-extrabold hover:bg-purple-700 flex items-center justify-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Save to Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE VIDEO CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 leading-tight">
                  Delete Video Reel
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Firestore fleet_videos/{deletingVideo.id}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove{' '}
              <strong>{deletingVideo.title || deletingVideo.id}</strong> from the Fleet Video Vault?
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingVideo(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAction}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {deletingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Reel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
