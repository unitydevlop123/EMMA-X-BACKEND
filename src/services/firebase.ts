import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { VehicleItem } from '../types';

export const firebaseConfig = {
  projectId: "emmaxlogistics-1",
  appId: "1:436333377598:web:1fb11721be1bda163ff96f",
  apiKey: "AIzaSyD2ViEJg3t1-girFPSETHfhLgAX_nrcqFs",
  authDomain: "emmaxlogistics-1.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-creativestudio-5905463e-ef33-4448-8eda-b5e9ccec389a",
  storageBucket: "emmaxlogistics-1.firebasestorage.app",
  messagingSenderId: "436333377598"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection Name in live Firestore
export const FLEET_COLLECTION = 'fleet_vehicles';

// User interface matching emmaxlogistics Firestore schema
export interface FirestoreUser {
  id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  clubCardNumber?: string;
  cardNumber?: string;
  tier?: string;
  points?: number;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  companyName?: string;
  isClubMember?: boolean;
  isCorporate?: boolean;
  accountType?: string;
  memberSince?: string;
  status?: 'active' | 'blocked' | 'suspended' | string;
  isBlocked?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreSubscription {
  id: string;
  planTitle: string;
  monthlyPrice: string;
  badge?: string;
  status: string;
  userId?: string;
  subscribedAt?: string;
}

export interface FirestoreVideo {
  id: string;
  url: string;
  videoUrl?: string;
  secureUrl?: string;
  coverUrl?: string;
  posterUrl?: string;
  coverTimestamp?: number;
  publicId?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  order?: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  duration?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Normalize Cloudinary URLs to HTTPS & generate crisp JPEG frame URL from video timestamp
export function normalizeHttpsUrl(url?: string): string {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

export function getCloudinaryVideoFrameUrl(videoUrl: string, seconds: number = 1.5): string {
  const safeUrl = normalizeHttpsUrl(videoUrl);
  if (!safeUrl || !safeUrl.includes('res.cloudinary.com') || !safeUrl.includes('/video/upload/')) {
    return '';
  }
  const so = Math.max(0, Number(seconds) || 0).toFixed(1).replace(/\.0$/, '');
  // Strip any existing transformation segments if needed or insert after /video/upload/
  return safeUrl
    .replace('/video/upload/', `/video/upload/so_${so},w_640,c_fill,q_auto,f_jpg/`)
    .replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg');
}

// ============================================================================
// INSTANT MEMORY + LOCALSTORAGE CACHE (Zero-delay tab & view rendering)
// ============================================================================
const CACHE_KEYS = {
  users: 'emmax_cache_users_v1',
  subscriptions: 'emmax_cache_subs_v1',
  videos: 'emmax_cache_videos_v1',
};

function readCache<T>(key: string): T[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache<T>(key: string, data: T[]) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

let memoryUsersCache: FirestoreUser[] = readCache<FirestoreUser>(CACHE_KEYS.users);
let memorySubsCache: FirestoreSubscription[] = readCache<FirestoreSubscription>(CACHE_KEYS.subscriptions);
let memoryVideosCache: FirestoreVideo[] = readCache<FirestoreVideo>(CACHE_KEYS.videos);

export function getCachedUsers(): FirestoreUser[] {
  return memoryUsersCache;
}

export function getCachedSubscriptions(): FirestoreSubscription[] {
  return memorySubsCache;
}

export function getCachedVideos(): FirestoreVideo[] {
  return memoryVideosCache;
}

function parseFirestoreUserDoc(id: string, data: any): FirestoreUser {
  const first = data.firstName || '';
  const last = data.lastName || '';
  const fullName =
    first || last
      ? `${first} ${last}`.trim()
      : data.fullName || data.name || 'Emma X VIP Member';
  const isBlocked = Boolean(data.isBlocked || data.status === 'blocked');
  return {
    id,
    email: data.email || 'vip@emmaxlogistics.ng',
    fullName,
    firstName: data.firstName || first,
    lastName: data.lastName || last,
    phone: data.phone || '+234 813 550 4921',
    clubCardNumber: data.cardNumber || data.clubCardNumber || 'EMX-MEMBER',
    cardNumber: data.cardNumber || data.clubCardNumber || 'EMX-MEMBER',
    tier: data.tier || (data.isClubMember ? 'Silver' : 'Standard'),
    points: Number(data.points) || 0,
    address: data.address || '',
    city: data.city || 'Benin City',
    state: data.state || 'Edo State',
    country: data.country || 'Nigeria',
    companyName: data.companyName || '',
    location: data.city
      ? `${data.city}, Edo State`
      : data.location || 'Benin City, Nigeria',
    isClubMember: data.isClubMember !== false,
    isCorporate: Boolean(data.isCorporate || data.accountType === 'corporate'),
    accountType: data.accountType || (data.isCorporate ? 'corporate' : 'individual'),
    memberSince: data.memberSince || '2026',
    status: isBlocked ? 'blocked' : data.status || 'active',
    isBlocked,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function parseFirestoreSubscriptionDoc(id: string, data: any): FirestoreSubscription {
  return {
    id,
    planTitle: data.planTitle || 'Emma X Corporate Fleet Pass',
    monthlyPrice: data.monthlyPrice || '₦5,000,000 / mo',
    badge: data.badge || 'VIP PLATINUM',
    status: data.status || 'active',
    userId: data.userId,
    subscribedAt: data.subscribedAt,
  };
}

function parseFirestoreVideoDoc(id: string, data: any): FirestoreVideo {
  const rawUrl =
    data.videoUrl ||
    data.secureUrl ||
    data.url ||
    (data.publicId ? `https://res.cloudinary.com/qish0wed/video/upload/${data.publicId}.mp4` : '');
  const secureUrl = normalizeHttpsUrl(rawUrl);
  const coverTimestamp = typeof data.coverTimestamp === 'number' ? data.coverTimestamp : 1.5;
  const rawPoster = data.posterUrl || data.coverUrl;
  const posterUrl = rawPoster
    ? normalizeHttpsUrl(rawPoster)
    : getCloudinaryVideoFrameUrl(secureUrl, coverTimestamp);

  return {
    id,
    url: secureUrl,
    videoUrl: secureUrl,
    secureUrl,
    coverUrl: posterUrl,
    posterUrl,
    coverTimestamp,
    publicId: data.publicId,
    format: data.format || 'mp4',
    bytes: data.bytes,
    width: data.width,
    height: data.height,
    order: typeof data.order === 'number' ? data.order : Number(data.order) || 0,
    title: data.title || `VIP Fleet Reel ${id.replace('video_', '#')}`,
    subtitle: data.subtitle || '',
    badge: data.badge || '',
    duration: data.duration || '',
    isFeatured: Boolean(data.isFeatured),
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// Fetch live users directly from Firestore 'users' collection
export async function fetchLiveUsers(): Promise<FirestoreUser[]> {
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    const users: FirestoreUser[] = [];
    snapshot.forEach((docSnap) => {
      users.push(parseFirestoreUserDoc(docSnap.id, docSnap.data()));
    });
    memoryUsersCache = users;
    writeCache(CACHE_KEYS.users, users);
    return users;
  } catch (error) {
    console.warn('Could not fetch live users from Firestore:', error);
    return memoryUsersCache;
  }
}

// Real-time listener on 'users' collection
export function subscribeToUsers(
  onUpdate: (users: FirestoreUser[]) => void,
  onError?: (err: any) => void
) {
  try {
    const colRef = collection(db, 'users');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const users: FirestoreUser[] = [];
        snapshot.forEach((docSnap) => {
          users.push(parseFirestoreUserDoc(docSnap.id, docSnap.data()));
        });
        memoryUsersCache = users;
        writeCache(CACHE_KEYS.users, users);
        onUpdate(users);
      },
      (error) => {
        console.warn('Firestore users listener error:', error.message);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to users:', err);
    return () => {};
  }
}

// Block / Suspend User in Firestore (users/{uid})
export async function blockFirestoreUser(uid: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(
      docRef,
      {
        isBlocked: true,
        status: 'blocked',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error blocking user in Firestore:', error);
    return false;
  }
}

// Unblock User in Firestore (users/{uid})
export async function unblockFirestoreUser(uid: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(
      docRef,
      {
        isBlocked: false,
        status: 'active',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error unblocking user in Firestore:', error);
    return false;
  }
}

// Update User Profile, VIP Tier, Points in Firestore (users/{uid})
export async function updateFirestoreUser(
  uid: string,
  updatedFields: Partial<FirestoreUser>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', uid);
    const payload: any = {
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    if (updatedFields.cardNumber) {
      payload.clubCardNumber = updatedFields.cardNumber;
    }
    if (updatedFields.firstName || updatedFields.lastName) {
      payload.fullName = `${updatedFields.firstName || ''} ${updatedFields.lastName || ''}`.trim();
    }
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user in Firestore:', error);
    return false;
  }
}

// Delete User Document in Firestore (users/{uid})
export async function deleteFirestoreUser(uid: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'users', uid);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting user from Firestore:', error);
    return false;
  }
}

// Fetch live subscriptions directly from Firestore 'subscriptions' collection
export async function fetchLiveSubscriptions(): Promise<FirestoreSubscription[]> {
  try {
    const colRef = collection(db, 'subscriptions');
    const snapshot = await getDocs(colRef);
    const subs: FirestoreSubscription[] = [];
    snapshot.forEach((docSnap) => {
      subs.push(parseFirestoreSubscriptionDoc(docSnap.id, docSnap.data()));
    });
    memorySubsCache = subs;
    writeCache(CACHE_KEYS.subscriptions, subs);
    return subs;
  } catch (err) {
    console.warn('Could not fetch subscriptions from Firestore:', err);
    return memorySubsCache;
  }
}

// Real-time listener on 'subscriptions' collection
export function subscribeToSubscriptions(
  onUpdate: (subs: FirestoreSubscription[]) => void,
  onError?: (err: any) => void
) {
  try {
    const colRef = collection(db, 'subscriptions');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const subs: FirestoreSubscription[] = [];
        snapshot.forEach((docSnap) => {
          subs.push(parseFirestoreSubscriptionDoc(docSnap.id, docSnap.data()));
        });
        memorySubsCache = subs;
        writeCache(CACHE_KEYS.subscriptions, subs);
        onUpdate(subs);
      },
      (error) => {
        console.warn('Firestore subscriptions listener error:', error.message);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to subscriptions:', err);
    return () => {};
  }
}

// Fetch live video reels directly from Firestore 'fleet_videos' collection
export async function fetchLiveVideos(): Promise<FirestoreVideo[]> {
  try {
    const colRef = collection(db, 'fleet_videos');
    const snapshot = await getDocs(colRef);
    const list: FirestoreVideo[] = [];
    snapshot.forEach((docSnap) => {
      list.push(parseFirestoreVideoDoc(docSnap.id, docSnap.data()));
    });
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    memoryVideosCache = list;
    writeCache(CACHE_KEYS.videos, list);
    return list;
  } catch (err) {
    console.warn('Could not fetch fleet_videos from Firestore:', err);
    return memoryVideosCache;
  }
}

// Real-time listener on 'fleet_videos' collection
export function subscribeToVideos(
  onUpdate: (videos: FirestoreVideo[]) => void,
  onError?: (err: any) => void
) {
  try {
    const colRef = collection(db, 'fleet_videos');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: FirestoreVideo[] = [];
        snapshot.forEach((docSnap) => {
          list.push(parseFirestoreVideoDoc(docSnap.id, docSnap.data()));
        });
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        memoryVideosCache = list;
        writeCache(CACHE_KEYS.videos, list);
        onUpdate(list);
      },
      (error) => {
        console.warn('Firestore fleet_videos listener error:', error.message);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to fleet_videos:', err);
    return () => {};
  }
}

// Update video cover frame / custom cover image & title in Firestore (fleet_videos/{id})
export async function updateFirestoreVideoCover(
  videoId: string,
  updates: { coverUrl: string; coverTimestamp?: number; title?: string }
): Promise<boolean> {
  try {
    const docRef = doc(db, 'fleet_videos', videoId);
    const normalizedCover = normalizeHttpsUrl(updates.coverUrl);
    const payload: any = {
      coverUrl: normalizedCover,
      posterUrl: normalizedCover,
      updatedAt: new Date().toISOString(),
    };
    if (typeof updates.coverTimestamp === 'number') {
      payload.coverTimestamp = updates.coverTimestamp;
    }
    if (updates.title !== undefined) {
      payload.title = updates.title;
    }
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Error updating video cover in Firestore:', err);
    return false;
  }
}

// Create or update a Frontend Video document matching Homepage Watch + Video Vault schema
export async function saveFrontendVideo(video: FirestoreVideo): Promise<boolean> {
  try {
    const docRef = doc(db, 'fleet_videos', video.id);
    const safeVideoUrl = normalizeHttpsUrl(video.videoUrl || video.secureUrl || video.url);
    const safePoster = normalizeHttpsUrl(
      video.posterUrl ||
        video.coverUrl ||
        getCloudinaryVideoFrameUrl(safeVideoUrl, video.coverTimestamp ?? 1.5)
    );

    const payload: any = {
      id: video.id,
      title: video.title?.trim() || 'Emma X Fleet Showcase',
      subtitle: video.subtitle?.trim() || '',
      badge: video.badge?.trim() || '',
      duration: video.duration?.trim() || '',
      videoUrl: safeVideoUrl,
      secureUrl: safeVideoUrl,
      url: safeVideoUrl,
      posterUrl: safePoster,
      coverUrl: safePoster,
      coverTimestamp: typeof video.coverTimestamp === 'number' ? video.coverTimestamp : 1.5,
      isFeatured: Boolean(video.isFeatured),
      isActive: video.isActive !== false,
      order: Number(video.order) || 1,
      format: video.format || 'mp4',
      updatedAt: new Date().toISOString(),
    };

    if (!video.createdAt) {
      payload.createdAt = new Date().toISOString();
    }

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving frontend video to Firestore:', err);
    return false;
  }
}

// Quick partial field update (toggling isFeatured, isActive, order, etc.)
export async function updateFrontendVideoFields(
  videoId: string,
  fields: Partial<FirestoreVideo>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'fleet_videos', videoId);
    const payload: any = {
      ...fields,
      updatedAt: new Date().toISOString(),
    };
    if (fields.videoUrl) {
      const safe = normalizeHttpsUrl(fields.videoUrl);
      payload.videoUrl = safe;
      payload.secureUrl = safe;
      payload.url = safe;
    }
    if (fields.posterUrl) {
      const safePoster = normalizeHttpsUrl(fields.posterUrl);
      payload.posterUrl = safePoster;
      payload.coverUrl = safePoster;
    }
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Error updating frontend video fields:', err);
    return false;
  }
}

// Delete video reel from Firestore (fleet_videos/{id})
export async function deleteFirestoreVideo(videoId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'fleet_videos', videoId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting video from Firestore:', err);
    return false;
  }
}

// Parse raw Firestore document to VehicleItem
export function parseFirestoreVehicle(id: string, data: any): VehicleItem {
  const galleries = data.galleryImages || (data.imageUrl ? [data.imageUrl] : []);
  const img =
    data.imageUrl ||
    data.sideProfileImage ||
    (galleries[0] || '');

  const rate = Number(data.dailyRate || data.pricePerDay || 0);

  const status: 'Available' | 'Dispatched' =
    data.status === 'Dispatched' || data.isAvailable === false
      ? 'Dispatched'
      : 'Available';

  return {
    id,
    name: data.name || 'Unnamed Vehicle',
    subtitle: data.subtitle || '',
    description: data.description || '',
    category: data.category || 'SUV',
    badge: data.badge || 'VIP EXECUTIVE',
    promoBadge: data.promoBadge || '',
    isAvailable: status === 'Available',
    status,
    seats: Number(data.seats) || 7,
    doors: Number(data.doors) || 5,
    transmission: data.transmission || 'Automatic',
    fuel: data.fuel || 'Petrol',
    luggage: Number(data.luggage) || 5,
    rangeOrPower: data.rangeOrPower || '',
    dailyRate: rate,
    pricePerDay: rate,
    monthlyRate: Number(data.monthlyRate) || rate * 24,
    registrationFee: Number(data.registrationFee) || 0,
    imageUrl: img,
    sideProfileImage: data.sideProfileImage || galleries[1] || img,
    galleryImages: galleries,
    galleryLabels: data.galleryLabels || [],
    videoUrl: data.videoUrl || '',
    options: data.options || [],
    plateNumber: data.plateNumber || data.subtitle || 'Edo Plate',
    location: data.location || 'Benin City Central Garage',
    driver: data.driver || 'Certified Executive Chauffeur',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    images: galleries,
  };
}

// Fetch all live vehicles directly from fleet_vehicles collection
export async function fetchLiveFleetVehicles(): Promise<VehicleItem[]> {
  try {
    const colRef = collection(db, FLEET_COLLECTION);
    const snapshot = await getDocs(colRef);
    const list: VehicleItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(parseFirestoreVehicle(docSnap.id, docSnap.data()));
    });
    return list;
  } catch (error) {
    console.error('Error fetching live fleet vehicles from Firestore:', error);
    return [];
  }
}

// Real-time listener on fleet_vehicles collection
export function subscribeToFleetVehicles(
  onUpdate: (vehicles: VehicleItem[]) => void,
  onError?: (err: any) => void
) {
  try {
    const colRef = collection(db, FLEET_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: VehicleItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push(parseFirestoreVehicle(docSnap.id, docSnap.data()));
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Firestore fleet_vehicles listener error:', error.message);
        onError?.(error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to fleet_vehicles:', err);
    return () => {};
  }
}

// Direct Firestore Save to fleet_vehicles collection
export async function syncVehicleToFirestore(vehicle: VehicleItem): Promise<boolean> {
  try {
    const docRef = doc(db, FLEET_COLLECTION, vehicle.id);

    const galleries = vehicle.galleryImages && vehicle.galleryImages.length > 0
      ? vehicle.galleryImages.filter(Boolean).slice(0, 4)
      : [vehicle.imageUrl].filter(Boolean);

    const defaultOptions: any[] = [
      {
        id: 'escort',
        name: 'Armed Security Escort (2 Personnel)',
        price: 40000,
        description: 'Vetted armed highway convoy officers',
        category: 'protection'
      },
      {
        id: 'full-tank',
        name: 'Pre-Paid Full Tank Petrol',
        price: 35000,
        description: 'Drive out on full tank, return empty',
        category: 'fuel'
      },
      {
        id: 'interstate-lagos',
        name: 'Interstate Permit (Benin ➔ Lagos/Abuja)',
        price: 25000,
        description: 'Includes highway toll passes and interstate clearance',
        category: 'service'
      }
    ];

    const defaultLabels = [
      'VIP Front Profile',
      'Side & Convoy Stance',
      'Luxury Leather Interior',
      'Rear View'
    ];

    const dailyRate = Number(vehicle.dailyRate || vehicle.pricePerDay || 0);
    const monthlyRate = vehicle.monthlyRate || dailyRate * 24;

    const payload: any = {
      id: vehicle.id,
      name: vehicle.name,
      subtitle: vehicle.subtitle || `${vehicle.category || 'SUV'} · ${vehicle.plateNumber || 'Benin City Fleet'}`,
      description: vehicle.description || `Executive ${vehicle.name} for VIP car rental, armed escort convoy, and chauffeur fleet operations in Benin City, Nigeria.`,
      category: vehicle.category || 'SUV',
      badge: vehicle.badge || 'VIP EXECUTIVE',
      promoBadge: vehicle.promoBadge || 'Top Executive Choice',
      isAvailable: vehicle.status === 'Available',
      status: vehicle.status || 'Available',
      seats: Number(vehicle.seats) || 7,
      doors: Number(vehicle.doors) || 5,
      transmission: vehicle.transmission || 'Automatic',
      fuel: vehicle.fuel || 'Petrol',
      luggage: Number(vehicle.luggage) || 5,
      rangeOrPower: vehicle.rangeOrPower || 'V6 4.0L 4WD',
      dailyRate: dailyRate,
      pricePerDay: dailyRate,
      monthlyRate: monthlyRate,
      registrationFee: 0,
      imageUrl: galleries[0] || vehicle.imageUrl || '',
      sideProfileImage: galleries[1] || galleries[0] || vehicle.sideProfileImage || vehicle.imageUrl || '',
      galleryImages: galleries,
      galleryLabels: vehicle.galleryLabels && vehicle.galleryLabels.length > 0
        ? vehicle.galleryLabels
        : defaultLabels.slice(0, Math.max(galleries.length, 1)),
      options: vehicle.options && vehicle.options.length > 0 ? vehicle.options : defaultOptions,
      plateNumber: vehicle.plateNumber || 'Edo Plate',
      location: vehicle.location || 'Benin City Central Garage',
      driver: vehicle.driver || 'Certified Executive Chauffeur',
      updatedAt: new Date().toISOString(),
    };

    if (vehicle.videoUrl && vehicle.videoUrl.trim()) {
      payload.videoUrl = vehicle.videoUrl.trim();
    } else {
      payload.videoUrl = deleteField();
    }

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save vehicle directly to Firestore:', error);
    return false;
  }
}

// Direct Firestore Delete from fleet_vehicles collection
export async function deleteVehicleFromFirestore(vehicleId: string): Promise<boolean> {
  try {
    const docRef = doc(db, FLEET_COLLECTION, vehicleId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Failed to delete vehicle from Firestore:', error);
    return false;
  }
}
