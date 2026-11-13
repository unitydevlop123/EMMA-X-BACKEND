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
} from 'lucide-react';
import {
  FleetAlertSeverity,
  FirestoreFleetAlert,
  fetchLiveFleetAlerts,
  getCachedFleetAlerts,
  saveFleetAlert,
  deleteFleetAlertDoc,
} from '../services/part2Firebase';

interface FleetAlertsViewProps {
  initialAlerts?: FirestoreFleetAlert[];
  initialLoaded?: boolean;
  permissionDenied?: boolean;
  onBack: () => void;
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
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [newSeverity, setNewSeverity] = useState<FleetAlertSeverity>('advisory');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
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
    if (cached.length === 0 && !initialLoaded) {
      loadAlerts(true);
    }
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNewTitle('');
    setNewMsg('');
    setNewSeverity('advisory');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (alt: FirestoreFleetAlert) => {
    setEditingId(alt.id);
    setNewTitle(alt.title || '');
    setNewMsg(alt.message);
    setNewSeverity(alt.severity);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setFormError(null);
    setSaving(true);

    const existing = editingId ? alerts.find((a) => a.id === editingId) : undefined;
    const docId = editingId || 'alt_' + Date.now();

    const payload: FirestoreFleetAlert = {
      id: docId,
      title: newTitle.trim(),
      message: newMsg.trim(),
      severity: newSeverity,
      isActive: existing ? existing.isActive : true,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const res = await saveFleetAlert(payload);
    if (res.ok) {
      setAlerts((prev) =>
        editingId
          ? prev.map((a) => (a.id === docId ? payload : a))
          : [payload, ...prev]
      );
      showToast(editingId ? 'Updated ticker alert!' : 'Broadcasted live to TopHeader ticker!');
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
    const updated: FirestoreFleetAlert = { ...alt, isActive: !alt.isActive };
    const res = await saveFleetAlert(updated);
    if (res.ok) {
      setAlerts((prev) => prev.map((a) => (a.id === alt.id ? updated : a)));
      showToast(updated.isActive ? 'Alert active on ticker' : 'Alert hidden from ticker');
    } else if (res.permissionDenied) {
      showToast('Permission denied on fleet_alerts.');
    }
  };

  const handleDelete = async (alt: FirestoreFleetAlert) => {
    const res = await deleteFleetAlertDoc(alt.id);
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== alt.id));
      showToast('Deleted alert');
    } else if (res.permissionDenied) {
      showToast('Permission denied on fleet_alerts.');
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Live';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
              Fleet Alerts & Operations Ticker
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Live TopHeader experience ticker notices in Firestore (fleet_alerts).
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
            <span>Firestore Rules Needed for "fleet_alerts"</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Ask your frontend developer to allow <code className="bg-amber-100 px-1 rounded">fleet_alerts</code> in <code className="bg-amber-100 px-1 rounded">firestore.rules</code>, then tap Refresh.
          </p>
        </div>
      )}

      {/* Broadcast Alert Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAddModal}
          className="flex-1 py-3 bg-[#f59e0b] hover:bg-amber-600 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Broadcast TopHeader Ticker Alert</span>
        </button>
        <button
          type="button"
          onClick={() => loadAlerts(true)}
          className="px-3 rounded-xl bg-white border border-slate-200 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">Loading fleet alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border text-center text-xs text-slate-400">
          {permDenied
            ? 'Waiting for Firestore fleet_alerts rule access.'
            : 'No active ticker notices. Broadcast an alert to display it in the customer TopHeader ticker bar.'}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={`bg-white rounded-2xl p-4 border shadow-sm space-y-2 ${
                !alt.isActive
                  ? 'opacity-60 border-slate-200'
                  : alt.severity === 'urgent'
                  ? 'border-red-300 bg-red-50/30'
                  : alt.severity === 'notice'
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                      alt.severity === 'urgent'
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : alt.severity === 'notice'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {alt.severity}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatDate(alt.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(alt)}
                    className="p-1 text-slate-400 hover:text-[#0d5dd7]"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(alt)}
                    className="p-1 text-slate-400 hover:text-amber-600"
                    title={alt.isActive ? 'Clear / Hide' : 'Show'}
                  >
                    {alt.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(alt)}
                    className="p-1 text-slate-300 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {alt.title && (
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{alt.title}</h3>
              )}
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{alt.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                {editingId ? 'Edit Fleet Alert' : 'Broadcast Fleet Alert'}
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

            <form onSubmit={handleSaveAlert} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Severity Level</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as FleetAlertSeverity)}
                  className="w-full border rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="advisory">advisory (Standard Ticker Bar)</option>
                  <option value="notice">notice (Operational Notice)</option>
                  <option value="urgent">urgent (Red Urgent Ticker Styling)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Benin Airport VIP Staging"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ticker Message *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Message shown in the TopHeader experience ticker bar..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
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
                  {saving ? 'Saving...' : 'Save & Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
