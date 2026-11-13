import React, { useEffect, useState } from 'react';
import {
  Plus,
  X,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Info,
} from 'lucide-react';
import {
  BUILTIN_FALLBACK_ALERTS,
  FleetAlertSeverity,
  FirestoreFleetAlert,
  fetchLiveFleetAlerts,
  getCachedFleetAlerts,
  saveFleetAlert,
  deleteFleetAlertDoc,
  seedStarterFleetAlertsOnce,
} from '../services/part2Firebase';

interface FleetAlertsViewProps {
  initialAlerts?: FirestoreFleetAlert[];
  initialLoaded?: boolean;
  permissionDenied?: boolean;
  onBack: () => void;
}

const MAX_ACTIVE_ALERTS = 2;

function getDefaultBadgeLabel(severity: FleetAlertSeverity): string {
  if (severity === 'urgent') return 'URGENT ALERT';
  if (severity === 'notice') return 'OPERATIONAL NOTICE';
  return 'FLEET ADVISORY';
}

export const FleetAlertsView: React.FC<FleetAlertsViewProps> = ({
  initialAlerts,
  initialLoaded,
  permissionDenied: propPermDenied,
  onBack,
}) => {
  const cached =
    initialAlerts && initialAlerts.length > 0 ? initialAlerts : getCachedFleetAlerts();

  const [alerts, setAlerts] = useState<FirestoreFleetAlert[]>(cached);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cached.length === 0;
  });
  const [permDenied, setPermDenied] = useState<boolean>(Boolean(propPermDenied));
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warn' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [newSeverity, setNewSeverity] = useState<FleetAlertSeverity>('advisory');
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'warn' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialAlerts, initialLoaded]);

  useEffect(() => {
    setPermDenied(Boolean(propPermDenied));
  }, [propPermDenied]);

  const loadAlerts = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const res = await fetchLiveFleetAlerts();
    setAlerts(res.data);
    setPermDenied(Boolean(res.permissionDenied));
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const seeded = await seedStarterFleetAlertsOnce();
      if (active && seeded && seeded.length > 0) {
        setAlerts(seeded);
        setLoading(false);
        return;
      }
      if (active && cached.length === 0 && !initialLoaded) {
        await loadAlerts(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeAlerts = alerts.filter((a) => a.isActive);
  const activeCount = activeAlerts.length;
  const activeOtherCount = alerts.filter(
    (a) => a.isActive && a.id !== editingId
  ).length;
  const canSetActiveInModal = activeOtherCount < MAX_ACTIVE_ALERTS;

  // What renders in the Live Header Preview:
  // Active live alerts (capped visually to live active ones) or built-in default fallback when 0 active
  const usingFallbackPreview = activeAlerts.length === 0;
  const previewItems = usingFallbackPreview ? BUILTIN_FALLBACK_ALERTS : activeAlerts;
  const hasUrgentPreview = previewItems.some((item) => item.severity === 'urgent');

  const openAddModal = () => {
    setEditingId(null);
    setNewTitle('');
    setNewMsg('');
    setNewSeverity('advisory');
    // Automatically default to Inactive Draft if 2 alerts are already active
    setNewIsActive(activeCount < MAX_ACTIVE_ALERTS);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (alt: FirestoreFleetAlert) => {
    setEditingId(alt.id);
    setNewTitle(alt.title || '');
    setNewMsg(alt.message);
    setNewSeverity(alt.severity);
    setNewIsActive(alt.isActive);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    if (newIsActive && activeOtherCount >= MAX_ACTIVE_ALERTS) {
      setFormError(
        'Maximum 2 live alerts can be active at once. Turn off an active alert first or save this as an Inactive Draft.'
      );
      return;
    }

    setFormError(null);
    setSaving(true);

    const existing = editingId ? alerts.find((a) => a.id === editingId) : undefined;
    const docId = editingId || 'alert_' + Date.now();

    const payload: FirestoreFleetAlert = {
      id: docId,
      title: newTitle.trim().toUpperCase(),
      message: newMsg.trim(),
      severity: newSeverity,
      isActive: newIsActive,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const res = await saveFleetAlert(payload);
    if (res.ok) {
      setAlerts((prev) =>
        editingId
          ? prev.map((a) => (a.id === docId ? payload : a))
          : [payload, ...prev]
      );
      showToast(
        newIsActive
          ? editingId
            ? 'Updated live TopHeader alert!'
            : 'Published live to TopHeader ticker!'
          : 'Saved as Inactive Draft.'
      );
      setShowModal(false);
    } else {
      setFormError(
        res.permissionDenied
          ? 'Firestore Permission Denied: Please enable fleet_alerts in firestore.rules.'
          : res.error || 'Failed to save fleet alert.'
      );
    }
    setSaving(false);
  };

  const handleToggleActive = async (alt: FirestoreFleetAlert) => {
    const nextActive = !alt.isActive;
    if (nextActive && activeCount >= MAX_ACTIVE_ALERTS) {
      showToast(
        'Max 2 live alerts allowed at once! Turn one off to Inactive Draft first.',
        'warn'
      );
      return;
    }

    const updated: FirestoreFleetAlert = { ...alt, isActive: nextActive };
    const res = await saveFleetAlert(updated);
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alt.id ? updated : a)));
      showToast(
        nextActive
          ? 'Activated! Scrolling live on website TopHeader.'
          : 'Moved to Inactive Draft (hidden from header).'
      );
    } else if (res.permissionDenied) {
      showToast('Permission denied on fleet_alerts.', 'warn');
    }
  };

  const handleDelete = async (alt: FirestoreFleetAlert) => {
    const res = await deleteFleetAlertDoc(alt.id);
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alt.id));
      showToast('Alert deleted from Firestore.');
    } else if (res.permissionDenied) {
      showToast('Permission denied on fleet_alerts.', 'warn');
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Just now';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-16">
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border ${
            toast.type === 'warn'
              ? 'bg-amber-950 border-amber-500/60'
              : 'bg-slate-900 border-slate-700/60'
          }`}
        >
          {toast.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-7 bg-[#f59e0b] rounded-full mt-0.5 shrink-0"></div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                Fleet Alerts & Operations Ticker
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage homepage TopHeader scrolling ticker broadcasts. Edit or save drafts anytime (Max 2 live at once).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="py-1 px-3 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-50 shrink-0"
        >
          Back
        </button>
      </div>

      {permDenied && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Firestore Rules Needed for "fleet_alerts"</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Ask your frontend developer to allow <code className="bg-amber-100 px-1 rounded">fleet_alerts</code> in <code className="bg-amber-100 px-1 rounded">firestore.rules</code>, then tap Refresh.
          </p>
        </div>
      )}

      {/* Create + Slot Counter Row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-[#f59e0b] hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Broadcast TopHeader Alert</span>
        </button>
        <div
          className={`px-2.5 py-2.5 rounded-xl border text-[11px] font-black shrink-0 ${
            activeCount >= MAX_ACTIVE_ALERTS
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
          title="Maximum 2 alerts can be active live at the same time"
        >
          {activeCount}/{MAX_ACTIVE_ALERTS} Live
        </div>
        <button
          type="button"
          onClick={() => loadAlerts(true)}
          className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700"
          title="Refresh alerts"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* LIVE HEADER PREVIEW (TICKER IS MOVING & REPEATING) */}
      <div className="bg-[#0b1324] rounded-2xl p-3.5 border border-slate-800 shadow-md space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                usingFallbackPreview ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            ></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
              LIVE HEADER PREVIEW (TICKER IS MOVING & REPEATING)
            </span>
          </div>
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
            {usingFallbackPreview ? 'Built-in Fallback' : `${activeCount}/2 Live`}
          </span>
        </div>

        {/* Visual replica of TopHeader experience ticker bar on www.emmaxlogistics.com.ng */}
        <div className="relative overflow-hidden rounded-lg bg-[#050811] border border-slate-700/70 flex items-center h-10">
          {/* Left Sticky Badge */}
          <div
            className={`relative z-10 h-full px-3 flex items-center gap-1.5 shrink-0 font-black text-[10px] tracking-wider uppercase shadow-md ${
              hasUrgentPreview
                ? 'bg-red-600 text-white'
                : 'bg-gradient-to-r from-[#f59e0b] to-[#ff6b00] text-slate-950'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{hasUrgentPreview ? 'URGENT ALERT' : 'FLEET ALERT'}</span>
          </div>

          {/* Scrolling Marquee Track */}
          <div className="flex-1 overflow-hidden relative flex items-center">
            <div className="animate-emmax-marquee items-center whitespace-nowrap">
              {[0, 1].map((dupIdx) => (
                <div key={dupIdx} className="inline-flex items-center gap-5 pr-5">
                  {previewItems.map((item, idx) => {
                    const badgeText =
                      item.title?.trim() || getDefaultBadgeLabel(item.severity);
                    const isUrg = item.severity === 'urgent';
                    const isNotice = item.severity === 'notice';
                    return (
                      <div
                        key={`${dupIdx}-${item.id}-${idx}`}
                        className="inline-flex items-center gap-2.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5f00] shadow-[0_0_6px_#ff5f00]"></span>
                        <span
                          className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isUrg
                              ? 'border-red-500/80 text-red-300 bg-red-950/50'
                              : isNotice
                              ? 'border-orange-500/80 text-orange-300 bg-orange-950/40'
                              : 'border-amber-500/70 text-amber-300 bg-amber-950/40'
                          }`}
                        >
                          {badgeText}
                        </span>
                        <span className="text-[11px] font-extrabold italic text-white tracking-wide uppercase">
                          "{item.message}"
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {usingFallbackPreview && (
          <div className="flex items-start gap-1.5 text-[10.5px] text-amber-200/90 leading-snug">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              All alerts are currently off or empty — the customer website automatically shows the 2 built-in default lines above until you activate an alert.
            </span>
          </div>
        )}
      </div>

      {/* Configured Updates & Alerts List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            CONFIGURED UPDATES & ALERTS ({alerts.length})
          </h2>
          {activeCount >= MAX_ACTIVE_ALERTS && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Max 2 Active Reached
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading fleet alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            {permDenied
              ? 'Waiting for Firestore fleet_alerts rule access.'
              : 'No saved alerts yet. Tap "+ Broadcast TopHeader Alert" above to create one.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alt) => {
              const badgeLabel = alt.title?.trim() || getDefaultBadgeLabel(alt.severity);
              const isBlockedActivate = !alt.isActive && activeCount >= MAX_ACTIVE_ALERTS;
              return (
                <div key={alt.id} className="py-3.5 first:pt-1 last:pb-1 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                          alt.severity === 'urgent'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : alt.severity === 'notice'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {alt.severity}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Posted on {formatDate(alt.createdAt)}
                    </span>
                  </div>

                  <p className="text-[13px] font-extrabold italic text-slate-900 leading-snug">
                    "{alt.message}"
                  </p>

                  {/* Action Row matching Active Live / Inactive Draft + Edit + Delete */}
                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(alt)}
                      className={`px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wide border flex items-center gap-1.5 transition-colors ${
                        alt.isActive
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : isBlockedActivate
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                      }`}
                      title={
                        alt.isActive
                          ? 'Click to hide (move to Inactive Draft)'
                          : isBlockedActivate
                          ? 'Max 2 active alerts allowed at once — turn off an active alert first'
                          : 'Click to activate live in TopHeader'
                      }
                    >
                      {alt.isActive ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>ACTIVE LIVE</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>INACTIVE DRAFT</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(alt)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#0d5dd7] hover:border-blue-200 transition-colors"
                      title="Edit alert"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(alt)}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50/40 text-red-500 hover:bg-red-100 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="font-black text-sm text-slate-900">
                  {editingId ? 'Edit Ticker Update' : 'Publish New Ticker Alert'}
                </h3>
              </div>
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

            <form onSubmit={handleSaveAlert} className="space-y-3 text-xs">
              <div>
                <label className="block font-black text-[10.5px] uppercase tracking-wider text-slate-500 mb-1">
                  Alert Category Name (Badge)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SPECIAL PROMO or VIP FLEET LIVE"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value.toUpperCase())}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold uppercase text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Optional short label inside the gold/red tag before the message.
                </p>
              </div>

              <div>
                <label className="block font-black text-[10.5px] uppercase tracking-wider text-slate-500 mb-1">
                  Severity Level
                </label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as FleetAlertSeverity)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="advisory">advisory (Amber Gold Bar — Standard)</option>
                  <option value="notice">notice (Orange Bar — Operations)</option>
                  <option value="urgent">urgent (Red URGENT ALERT Bar)</option>
                </select>
              </div>

              <div>
                <label className="block font-black text-[10.5px] uppercase tracking-wider text-slate-500 mb-1">
                  Publication Status (Max 2 Live at Once)
                </label>
                <select
                  value={newIsActive ? 'active' : 'draft'}
                  onChange={(e) => setNewIsActive(e.target.value === 'active')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="active" disabled={!canSetActiveInModal}>
                    {canSetActiveInModal
                      ? 'Active (Visible immediately in Header)'
                      : 'Active (Limit 2/2 reached — turn one off first)'}
                  </option>
                  <option value="draft">Inactive / Saved Draft (Hidden)</option>
                </select>
                {!canSetActiveInModal && (
                  <p className="text-[10px] text-amber-700 font-semibold mt-1">
                    2 live alerts are already active. Save as Inactive Draft or deactivate one first.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-black text-[10.5px] uppercase tracking-wider text-slate-500">
                    Ticker Message Text *
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {newMsg.length}/200 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={200}
                  placeholder="e.g. HEY WELCOME USE THE CODE EMMAX20 FOR 20% OFF"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                />
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
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold"
                >
                  {saving ? 'Saving...' : newIsActive ? 'Publish LIVE' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
