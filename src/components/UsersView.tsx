import React, { useEffect, useState } from 'react';
import {
  Search,
  Shield,
  CreditCard,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Award,
  CheckCircle2,
  Building2,
  Eye,
  Edit2,
  Ban,
  Unlock,
  Trash2,
  X,
  AlertTriangle,
  UserCheck,
  Save,
  Check,
} from 'lucide-react';
import {
  fetchLiveUsers,
  fetchLiveSubscriptions,
  blockFirestoreUser,
  unblockFirestoreUser,
  updateFirestoreUser,
  deleteFirestoreUser,
  getCachedUsers,
  getCachedSubscriptions,
  FirestoreUser,
  FirestoreSubscription,
} from '../services/firebase';

interface UsersViewProps {
  initialUsers?: FirestoreUser[];
  initialSubscriptions?: FirestoreSubscription[];
  initialLoaded?: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({
  initialUsers,
  initialSubscriptions,
  initialLoaded,
}) => {
  const cachedUsers = initialUsers && initialUsers.length > 0 ? initialUsers : getCachedUsers();
  const cachedSubs =
    initialSubscriptions && initialSubscriptions.length > 0
      ? initialSubscriptions
      : getCachedSubscriptions();

  const [users, setUsers] = useState<FirestoreUser[]>(cachedUsers);
  const [subscriptions, setSubscriptions] = useState<FirestoreSubscription[]>(cachedSubs);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoaded) return false;
    return cachedUsers.length === 0;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'subscriptions'>('users');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modals state
  const [viewingUser, setViewingUser] = useState<FirestoreUser | null>(null);
  const [editingUser, setEditingUser] = useState<FirestoreUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<FirestoreUser | null>(null);
  const [blockingUser, setBlockingUser] = useState<FirestoreUser | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTier, setEditTier] = useState('Silver');
  const [editPoints, setEditPoints] = useState(0);
  const [editAccountType, setEditAccountType] = useState('individual');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCardNumber, setEditCardNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('Benin City');
  const [editState, setEditState] = useState('Edo State');

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Sync live updates pushed from App's onSnapshot listeners
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
      setLoading(false);
    } else if (initialLoaded) {
      setLoading(false);
    }
  }, [initialUsers, initialLoaded]);

  useEffect(() => {
    if (initialSubscriptions) {
      setSubscriptions(initialSubscriptions);
    }
  }, [initialSubscriptions]);

  const loadData = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    const [liveUsers, liveSubs] = await Promise.all([
      fetchLiveUsers(),
      fetchLiveSubscriptions(),
    ]);
    setUsers(liveUsers);
    setSubscriptions(liveSubs);
    setLoading(false);
  };

  // Background refresh only if not yet loaded
  useEffect(() => {
    if (cachedUsers.length === 0 && !initialLoaded) {
      loadData(true);
    }
  }, []);

  const openEditModal = (u: FirestoreUser) => {
    setEditingUser(u);
    setEditFirstName(u.firstName || '');
    setEditLastName(u.lastName || '');
    setEditPhone(u.phone || '');
    setEditTier(u.tier || 'Silver');
    setEditPoints(Number(u.points) || 0);
    setEditAccountType(u.accountType || (u.isCorporate ? 'corporate' : 'individual'));
    setEditCompanyName(u.companyName || '');
    setEditCardNumber(u.cardNumber || u.clubCardNumber || 'EMX849201');
    setEditAddress(u.address || '');
    setEditCity(u.city || 'Benin City');
    setEditState(u.state || 'Edo State');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingAction(true);

    const payload: Partial<FirestoreUser> = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      fullName: `${editFirstName.trim()} ${editLastName.trim()}`.trim(),
      phone: editPhone.trim(),
      tier: editTier,
      points: Number(editPoints) || 0,
      accountType: editAccountType,
      isCorporate: editAccountType === 'corporate',
      companyName: editAccountType === 'corporate' ? editCompanyName.trim() : '',
      cardNumber: editCardNumber.trim(),
      clubCardNumber: editCardNumber.trim(),
      address: editAddress.trim(),
      city: editCity.trim(),
      state: editState.trim(),
      location: `${editCity.trim()}, ${editState.trim()}`,
    };

    const ok = await updateFirestoreUser(editingUser.id, payload);
    if (ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u))
      );
      showToast(`Updated profile for ${payload.fullName || editingUser.fullName}!`);
      setEditingUser(null);
    } else {
      alert('Failed to update user in Firestore. Please try again.');
    }
    setSavingAction(false);
  };

  const handleToggleBlock = async (u: FirestoreUser) => {
    setSavingAction(true);
    const currentlyBlocked = u.isBlocked || u.status === 'blocked';

    if (currentlyBlocked) {
      const ok = await unblockFirestoreUser(u.id);
      if (ok) {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === u.id ? { ...item, isBlocked: false, status: 'active' } : item
          )
        );
        showToast(`Unblocked ${u.fullName}! Access restored.`);
      }
    } else {
      const ok = await blockFirestoreUser(u.id);
      if (ok) {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === u.id ? { ...item, isBlocked: true, status: 'blocked' } : item
          )
        );
        showToast(`Blocked ${u.fullName}! Website session will terminate.`);
      }
    }
    setBlockingUser(null);
    setSavingAction(false);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deletingUser) return;
    setSavingAction(true);
    const ok = await deleteFirestoreUser(deletingUser.id);
    if (ok) {
      setUsers((prev) => prev.filter((item) => item.id !== deletingUser.id));
      showToast(`Deleted ${deletingUser.fullName} from Firestore.`);
      setDeletingUser(null);
    } else {
      alert('Failed to delete user document from Firestore.');
    }
    setSavingAction(false);
  };

  const filtered = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.clubCardNumber && u.clubCardNumber.toLowerCase().includes(term)) ||
      (u.city && u.city.toLowerCase().includes(term)) ||
      (u.companyName && u.companyName.toLowerCase().includes(term))
    );
  });

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
              User Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              View, edit, block/suspend, or delete registered VIP accounts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#0d5dd7] transition-colors"
          title="Refresh Users"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Segmented Tab */}
      <div className="flex p-0.5 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-white text-[#0d5dd7] shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          VIP Accounts ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-white text-[#0d5dd7] shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Corporate Passes ({subscriptions.length})
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name, email, Club Card, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/90 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0d5dd7] shadow-xs"
            />
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading live accounts from Firestore...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">
                No matching VIP accounts found.
              </div>
            ) : (
              filtered.map((user) => {
                const isBlocked = user.isBlocked || user.status === 'blocked';

                return (
                  <div
                    key={user.id}
                    className={`bg-white rounded-2xl p-4 border shadow-sm space-y-3 transition-all ${
                      isBlocked ? 'border-red-300 bg-red-50/20' : 'border-slate-200/70'
                    }`}
                  >
                    {/* Top User Info Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            isBlocked
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-blue-50 text-[#0d5dd7] border-blue-100'
                          }`}
                        >
                          {(user.fullName || user.email || 'U')[0].toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                            {user.fullName || user.name || 'Emma X VIP Member'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {user.cardNumber || user.clubCardNumber || 'EMX-MEMBER'}
                            </span>
                            {user.companyName && (
                              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[120px]">{user.companyName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status & Tier Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isBlocked ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            BLOCKED
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVE
                          </span>
                        )}
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-50 text-[#0d5dd7] border border-blue-100">
                          {user.tier || 'Silver'} · {user.points || 0} pts
                        </span>
                      </div>
                    </div>

                    {/* Details Rows */}
                    <div className="space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      {user.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {(user.address || user.city) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {user.address ? `${user.address}, ` : ''}
                            {user.city || 'Benin City'}, {user.state || 'Edo State'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span>UID: {user.id.slice(0, 16)}...</span>
                        <span>Type: {user.accountType || (user.isCorporate ? 'Corporate' : 'Individual')}</span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS: VIEW, EDIT, BLOCK/UNBLOCK, DELETE */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                      {/* 1. View Details */}
                      <button
                        type="button"
                        onClick={() => setViewingUser(user)}
                        className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-200 transition-colors"
                        title="View Full Profile Details"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>View</span>
                      </button>

                      {/* 2. Edit Profile */}
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#0d5dd7] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-blue-200 transition-colors"
                        title="Edit User Profile"
                      >
                        <Edit2 className="w-3 h-3 text-[#0d5dd7]" />
                        <span>Edit</span>
                      </button>

                      {/* 3. Block / Unblock */}
                      <button
                        type="button"
                        onClick={() => setBlockingUser(user)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border transition-colors ${
                          isBlocked
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                        title={isBlocked ? 'Restore user access' : 'Suspend and block user'}
                      >
                        {isBlocked ? (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-600" />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3 text-amber-600" />
                            <span>Block</span>
                          </>
                        )}
                      </button>

                      {/* 4. Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingUser(user)}
                        className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-red-200 transition-colors"
                        title="Delete User from Firestore"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Subscriptions List */
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">
              No active corporate passes found in Firestore.
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Building2 className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {sub.planTitle}
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        Subscription ID: {sub.id}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    {sub.badge || 'VIP PASS'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Monthly Fee</span>
                  <span className="font-black text-slate-900 tabular-nums">
                    {sub.monthlyPrice}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VIEW USER DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#0d5dd7]" />
                <h3 className="font-black text-sm text-slate-900">VIP User Profile Details</h3>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900">{viewingUser.fullName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{viewingUser.email}</p>
                </div>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    viewingUser.isBlocked || viewingUser.status === 'blocked'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {viewingUser.isBlocked || viewingUser.status === 'blocked' ? 'BLOCKED' : 'ACTIVE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Club Card</span>
                  <span className="font-mono font-black text-slate-800 text-[11px]">
                    {viewingUser.cardNumber || viewingUser.clubCardNumber || 'EMX-MEMBER'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VIP Tier</span>
                  <span className="font-black text-blue-700 text-[11px]">
                    {viewingUser.tier || 'Silver'} ({viewingUser.points || 0} pts)
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold">{viewingUser.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Type:</span>
                  <span className="font-semibold uppercase">{viewingUser.accountType || (viewingUser.isCorporate ? 'Corporate' : 'Individual')}</span>
                </div>
                {viewingUser.companyName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Company:</span>
                    <span className="font-semibold">{viewingUser.companyName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="font-semibold text-right max-w-[180px]">{viewingUser.address || 'GRA, Benin City'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">City / State:</span>
                  <span className="font-semibold">{viewingUser.city || 'Benin City'}, {viewingUser.state || 'Edo State'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Country:</span>
                  <span className="font-semibold">{viewingUser.country || 'Nigeria'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Club Member:</span>
                  <span className="font-semibold text-emerald-600">Yes (Verified)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Firestore UID:</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[160px]">{viewingUser.id}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewingUser;
                  setViewingUser(null);
                  openEditModal(target);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-50 text-[#0d5dd7] font-bold border border-blue-200 hover:bg-blue-100"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT USER PROFILE MODAL */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#0d5dd7]" />
                <h3 className="font-black text-sm text-slate-900">Edit User in Firestore</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Phone & Card Number */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Club Card #</label>
                  <input
                    type="text"
                    value={editCardNumber}
                    onChange={(e) => setEditCardNumber(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* VIP Tier & Points */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">VIP Tier</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    className="w-full border rounded-xl px-2 py-2 font-bold text-slate-800"
                  >
                    <option value="Silver">Silver VIP</option>
                    <option value="Gold">Gold VIP</option>
                    <option value="Platinum VIP">Platinum VIP</option>
                    <option value="Diamond">Diamond Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Club Points</label>
                  <input
                    type="number"
                    min={0}
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    className="w-full border rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Account Type & Company Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Type</label>
                  <select
                    value={editAccountType}
                    onChange={(e) => setEditAccountType(e.target.value)}
                    className="w-full border rounded-xl px-2 py-2 text-slate-800 font-semibold"
                  >
                    <option value="individual">Individual</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Chevron Nigeria"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                  />
                </div>
              </div>

              {/* Address & City */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. GRA, Benin City"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 text-slate-800"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="flex-1 py-2.5 rounded-xl bg-[#0d5dd7] hover:bg-blue-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {savingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save to Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BLOCK / UNBLOCK CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {blockingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 leading-tight">
                  {blockingUser.isBlocked || blockingUser.status === 'blocked'
                    ? 'Unblock VIP User'
                    : 'Block / Suspend VIP User'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Firestore Enforcement</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {blockingUser.isBlocked || blockingUser.status === 'blocked' ? (
                <>
                  Are you sure you want to <strong>unblock {blockingUser.fullName}</strong>? Their website access and booking ability will be restored immediately.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>block {blockingUser.fullName}</strong>?
                  <br />
                  <span className="text-red-600 font-semibold mt-1 block">
                    The live customer website will immediately terminate their active session and block all login attempts.
                  </span>
                </>
              )}
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setBlockingUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={() => handleToggleBlock(blockingUser)}
                className={`flex-1 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm ${
                  blockingUser.isBlocked || blockingUser.status === 'blocked'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {savingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : blockingUser.isBlocked || blockingUser.status === 'blocked' ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                <span>
                  {blockingUser.isBlocked || blockingUser.status === 'blocked'
                    ? 'Confirm Unblock'
                    : 'Confirm Block'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DELETE USER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 leading-tight">Delete User Document</h3>
                <p className="text-[11px] text-slate-500 font-medium">Firestore users/{deletingUser.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>{deletingUser.fullName}</strong> from Firestore? This action cannot be undone.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={handleDeleteUserConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {savingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
