import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, normalizeHttpsUrl } from './firebase';

// ============================================================================
// TYPES MATCHING PART 2 FRONTEND SCHEMAS
// ============================================================================

export type ReservationStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface FirestoreReservation {
  id: string;
  userId?: string;
  code: string;
  carName: string;
  category?: string;
  plateNumber?: string;
  pickupLocation: string;
  dropoffLocation: string;
  startDate: string;
  endDate: string;
  chauffeurName?: string;
  chauffeurPhone?: string;
  chauffeurPhoto?: string;
  totalAmount: string | number;
  status: ReservationStatus;
  statusLabel?: string;
  hasEscort?: boolean;
  tripPurpose?: string;
  paymentMethod?: string;
  clientName?: string;
  clientPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoCardBadge {
  prefix: string;
  value: string;
  suffix: string;
}

export interface FirestorePromoCard {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl: string;
  badge?: PromoCardBadge;
  isActive: boolean;
  updatedAt?: string;
}

export interface FirestoreServiceItem {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  imageUrl: string;
  fallbackUrl?: string;
  baseRate?: number;
  isActive: boolean;
  updatedAt?: string;
}

export interface FirestoreSubscriptionPlan {
  id: string;
  title: string;
  subtitle: string;
  monthlyPrice: string;
  badge: string;
  popular?: boolean;
  vehicleAccess: string;
  features: string[];
  isActive: boolean;
  updatedAt?: string;
}

export interface FirestorePromoCode {
  id: string;
  code: string;
  discount: string;
  target: string;
  expiry: string;
  uses: number;
  status: 'Active' | 'Expired';
  isActive?: boolean;
  updatedAt?: string;
}

export interface FirestoreReview {
  id: string;
  author: string;
  company: string;
  vehicle: string;
  rating: number;
  comment: string;
  date: string;
  isVisible: boolean;
  updatedAt?: string;
}

export interface FirestoreFleetAlert {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'urgent';
  time: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreOpResult {
  ok: boolean;
  permissionDenied?: boolean;
  error?: string;
}

function isPermError(err: any): boolean {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return code.includes('permission-denied') || msg.includes('missing or insufficient permissions');
}

// ============================================================================
// CACHE HELPERS
// ============================================================================
const PART2_CACHE_KEYS = {
  reservations: 'emmax_cache_reservations_v1',
  promoCards: 'emmax_cache_promo_cards_v1',
  services: 'emmax_cache_services_v1',
  subscriptionPlans: 'emmax_cache_sub_plans_v1',
  promoCodes: 'emmax_cache_promo_codes_v1',
  reviews: 'emmax_cache_reviews_v1',
  fleetAlerts: 'emmax_cache_fleet_alerts_v1',
};

function readLocalCache<T>(key: string): T[] {
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

function writeLocalCache<T>(key: string, data: T[]) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

let cacheReservations: FirestoreReservation[] = readLocalCache(PART2_CACHE_KEYS.reservations);
let cachePromoCards: FirestorePromoCard[] = readLocalCache(PART2_CACHE_KEYS.promoCards);
let cacheServices: FirestoreServiceItem[] = readLocalCache(PART2_CACHE_KEYS.services);
let cacheSubscriptionPlans: FirestoreSubscriptionPlan[] = readLocalCache(PART2_CACHE_KEYS.subscriptionPlans);
let cachePromoCodes: FirestorePromoCode[] = readLocalCache(PART2_CACHE_KEYS.promoCodes);
let cacheReviews: FirestoreReview[] = readLocalCache(PART2_CACHE_KEYS.reviews);
let cacheFleetAlerts: FirestoreFleetAlert[] = readLocalCache(PART2_CACHE_KEYS.fleetAlerts);

export const getCachedReservations = () => cacheReservations;
export const getCachedPromoCards = () => cachePromoCards;
export const getCachedServices = () => cacheServices;
export const getCachedSubscriptionPlans = () => cacheSubscriptionPlans;
export const getCachedPromoCodes = () => cachePromoCodes;
export const getCachedReviews = () => cacheReviews;
export const getCachedFleetAlerts = () => cacheFleetAlerts;

// ============================================================================
// A. RESERVATIONS (bookings & calendar)
// ============================================================================
function parseReservation(id: string, data: any): FirestoreReservation {
  const rawStatus = String(data.status || 'upcoming').toLowerCase();
  const status: ReservationStatus =
    rawStatus === 'active' || rawStatus === 'completed' || rawStatus === 'cancelled'
      ? rawStatus
      : 'upcoming';

  return {
    id,
    userId: data.userId || '',
    code: data.code || data.bookingCode || id.toUpperCase().slice(0, 10),
    carName: data.carName || data.vehicleName || 'Emma X VIP Vehicle',
    category: data.category || 'Executive VIP Fleet',
    plateNumber: data.plateNumber || '',
    pickupLocation: data.pickupLocation || 'Benin City Hub',
    dropoffLocation: data.dropoffLocation || data.returnLocation || 'Benin City Hub',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    chauffeurName: data.chauffeurName || '',
    chauffeurPhone: data.chauffeurPhone || '',
    chauffeurPhoto: data.chauffeurPhoto ? normalizeHttpsUrl(data.chauffeurPhoto) : '',
    totalAmount: data.totalAmount ?? data.amount ?? '₦0',
    status,
    statusLabel: data.statusLabel || '',
    hasEscort: Boolean(data.hasEscort || data.escortIncluded),
    tripPurpose: data.tripPurpose || '',
    paymentMethod: data.paymentMethod || '',
    clientName: data.clientName || 'VIP Client',
    clientPhone: data.clientPhone || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

export async function fetchLiveReservations(): Promise<{
  data: FirestoreReservation[];
  permissionDenied?: boolean;
}> {
  try {
    const snap = await getDocs(collection(db, 'reservations'));
    const list: FirestoreReservation[] = [];
    snap.forEach((d) => list.push(parseReservation(d.id, d.data())));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    cacheReservations = list;
    writeLocalCache(PART2_CACHE_KEYS.reservations, list);
    return { data: list };
  } catch (err) {
    return { data: cacheReservations, permissionDenied: isPermError(err) };
  }
}

export function subscribeToReservations(
  onUpdate: (list: FirestoreReservation[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        const list: FirestoreReservation[] = [];
        snap.forEach((d) => list.push(parseReservation(d.id, d.data())));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        cacheReservations = list;
        writeLocalCache(PART2_CACHE_KEYS.reservations, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) {
          onPermissionDenied?.();
        }
      }
    );
  } catch {
    return () => {};
  }
}

export async function updateReservationFields(
  id: string,
  fields: Partial<FirestoreReservation>
): Promise<FirestoreOpResult> {
  try {
    const payload: any = {
      ...fields,
      updatedAt: new Date().toISOString(),
    };
    if (fields.chauffeurPhoto) {
      payload.chauffeurPhoto = normalizeHttpsUrl(fields.chauffeurPhoto);
    }
    await setDoc(doc(db, 'reservations', id), payload, { merge: true });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deleteFirestoreReservation(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'reservations', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

// ============================================================================
// B. PROMO CARDS (promo_cards)
// ============================================================================
function parsePromoCard(id: string, data: any): FirestorePromoCard {
  return {
    id,
    title: data.title || '',
    subtitle: data.subtitle || '',
    ctaText: data.ctaText || 'Hire Now',
    imageUrl: data.imageUrl ? normalizeHttpsUrl(data.imageUrl) : '',
    badge: data.badge
      ? {
          prefix: data.badge.prefix || '',
          value: data.badge.value || '',
          suffix: data.badge.suffix || '',
        }
      : undefined,
    isActive: data.isActive !== false,
    updatedAt: data.updatedAt || '',
  };
}

export async function fetchLivePromoCards(): Promise<FirestorePromoCard[]> {
  try {
    const snap = await getDocs(collection(db, 'promo_cards'));
    const list: FirestorePromoCard[] = [];
    snap.forEach((d) => list.push(parsePromoCard(d.id, d.data())));
    cachePromoCards = list;
    writeLocalCache(PART2_CACHE_KEYS.promoCards, list);
    return list;
  } catch {
    return cachePromoCards;
  }
}

export function subscribeToPromoCards(
  onUpdate: (list: FirestorePromoCard[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'promo_cards'),
      (snap) => {
        const list: FirestorePromoCard[] = [];
        snap.forEach((d) => list.push(parsePromoCard(d.id, d.data())));
        cachePromoCards = list;
        writeLocalCache(PART2_CACHE_KEYS.promoCards, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) onPermissionDenied?.();
      }
    );
  } catch {
    return () => {};
  }
}

export async function savePromoCard(card: FirestorePromoCard): Promise<FirestoreOpResult> {
  try {
    const payload: any = {
      id: card.id,
      title: card.title.trim(),
      subtitle: card.subtitle.trim(),
      ctaText: card.ctaText.trim() || 'Hire Now',
      imageUrl: normalizeHttpsUrl(card.imageUrl),
      isActive: card.isActive !== false,
      updatedAt: new Date().toISOString(),
    };
    if (card.badge && (card.badge.prefix || card.badge.value || card.badge.suffix)) {
      payload.badge = {
        prefix: card.badge.prefix.trim(),
        value: card.badge.value.trim(),
        suffix: card.badge.suffix.trim(),
      };
    }
    await setDoc(doc(db, 'promo_cards', card.id), payload, { merge: true });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function updatePromoCardFields(
  id: string,
  fields: Partial<FirestorePromoCard>
): Promise<FirestoreOpResult> {
  try {
    await setDoc(
      doc(db, 'promo_cards', id),
      { ...fields, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deletePromoCard(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'promo_cards', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

// ============================================================================
// C. SERVICES (services)
// ============================================================================
function parseServiceItem(id: string, data: any): FirestoreServiceItem {
  return {
    id,
    title: data.title || '',
    description: data.description || '',
    ctaText: data.ctaText || 'Inquire Now',
    imageUrl: data.imageUrl || data.fallbackUrl || '',
    fallbackUrl: data.fallbackUrl || '',
    baseRate: typeof data.baseRate === 'number' ? data.baseRate : Number(data.baseRate) || undefined,
    isActive: data.isActive !== false,
    updatedAt: data.updatedAt || '',
  };
}

export async function fetchLiveServices(): Promise<FirestoreServiceItem[]> {
  try {
    const snap = await getDocs(collection(db, 'services'));
    const list: FirestoreServiceItem[] = [];
    snap.forEach((d) => list.push(parseServiceItem(d.id, d.data())));
    cacheServices = list;
    writeLocalCache(PART2_CACHE_KEYS.services, list);
    return list;
  } catch {
    return cacheServices;
  }
}

export function subscribeToServices(
  onUpdate: (list: FirestoreServiceItem[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'services'),
      (snap) => {
        const list: FirestoreServiceItem[] = [];
        snap.forEach((d) => list.push(parseServiceItem(d.id, d.data())));
        cacheServices = list;
        writeLocalCache(PART2_CACHE_KEYS.services, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) onPermissionDenied?.();
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveServiceItem(service: FirestoreServiceItem): Promise<FirestoreOpResult> {
  try {
    const safeImg = normalizeHttpsUrl(service.imageUrl);
    const payload: any = {
      id: service.id,
      title: service.title.trim(),
      description: service.description.trim(),
      ctaText: service.ctaText.trim() || 'Inquire Now',
      imageUrl: safeImg,
      isActive: service.isActive !== false,
      updatedAt: new Date().toISOString(),
    };
    if (typeof service.baseRate === 'number' && !Number.isNaN(service.baseRate)) {
      payload.baseRate = service.baseRate;
    }
    await setDoc(doc(db, 'services', service.id), payload, { merge: true });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function updateServiceFields(
  id: string,
  fields: Partial<FirestoreServiceItem>
): Promise<FirestoreOpResult> {
  try {
    await setDoc(
      doc(db, 'services', id),
      { ...fields, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deleteServiceItem(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'services', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

// ============================================================================
// D. SUBSCRIPTION PLANS (subscription_plans)
// ============================================================================
function parseSubscriptionPlan(id: string, data: any): FirestoreSubscriptionPlan {
  return {
    id,
    title: data.title || '',
    subtitle: data.subtitle || '',
    monthlyPrice: data.monthlyPrice || '₦0 / mo',
    badge: data.badge || 'VIP PASS',
    popular: Boolean(data.popular),
    vehicleAccess: data.vehicleAccess || '',
    features: Array.isArray(data.features) ? data.features : [],
    isActive: data.isActive !== false,
    updatedAt: data.updatedAt || '',
  };
}

export async function fetchLiveSubscriptionPlans(): Promise<FirestoreSubscriptionPlan[]> {
  try {
    const snap = await getDocs(collection(db, 'subscription_plans'));
    const list: FirestoreSubscriptionPlan[] = [];
    snap.forEach((d) => list.push(parseSubscriptionPlan(d.id, d.data())));
    cacheSubscriptionPlans = list;
    writeLocalCache(PART2_CACHE_KEYS.subscriptionPlans, list);
    return list;
  } catch {
    return cacheSubscriptionPlans;
  }
}

export function subscribeToSubscriptionPlans(
  onUpdate: (list: FirestoreSubscriptionPlan[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'subscription_plans'),
      (snap) => {
        const list: FirestoreSubscriptionPlan[] = [];
        snap.forEach((d) => list.push(parseSubscriptionPlan(d.id, d.data())));
        cacheSubscriptionPlans = list;
        writeLocalCache(PART2_CACHE_KEYS.subscriptionPlans, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) onPermissionDenied?.();
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveSubscriptionPlan(
  plan: FirestoreSubscriptionPlan
): Promise<FirestoreOpResult> {
  try {
    const payload = {
      id: plan.id,
      title: plan.title.trim(),
      subtitle: plan.subtitle.trim(),
      monthlyPrice: plan.monthlyPrice.trim(),
      badge: plan.badge.trim() || 'VIP PASS',
      popular: Boolean(plan.popular),
      vehicleAccess: plan.vehicleAccess.trim(),
      features: plan.features.map((f) => f.trim()).filter(Boolean),
      isActive: plan.isActive !== false,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'subscription_plans', plan.id), payload, { merge: true });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function updateSubscriptionPlanFields(
  id: string,
  fields: Partial<FirestoreSubscriptionPlan>
): Promise<FirestoreOpResult> {
  try {
    await setDoc(
      doc(db, 'subscription_plans', id),
      { ...fields, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deleteSubscriptionPlan(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'subscription_plans', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

// ============================================================================
// E. PROMO CODES, REVIEWS & FLEET ALERTS
// ============================================================================
function parsePromoCode(id: string, data: any): FirestorePromoCode {
  const status = data.status === 'Expired' || data.isActive === false ? 'Expired' : 'Active';
  return {
    id,
    code: data.code || id.toUpperCase(),
    discount: data.discount || '10% OFF',
    target: data.target || '',
    expiry: data.expiry || '',
    uses: Number(data.uses) || 0,
    status,
    isActive: status === 'Active',
    updatedAt: data.updatedAt || '',
  };
}

export function subscribeToPromoCodes(
  onUpdate: (list: FirestorePromoCode[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'promo_codes'),
      (snap) => {
        const list: FirestorePromoCode[] = [];
        snap.forEach((d) => list.push(parsePromoCode(d.id, d.data())));
        cachePromoCodes = list;
        writeLocalCache(PART2_CACHE_KEYS.promoCodes, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) onPermissionDenied?.();
      }
    );
  } catch {
    return () => {};
  }
}

export async function fetchLivePromoCodes(): Promise<{
  data: FirestorePromoCode[];
  permissionDenied?: boolean;
}> {
  try {
    const snap = await getDocs(collection(db, 'promo_codes'));
    const list: FirestorePromoCode[] = [];
    snap.forEach((d) => list.push(parsePromoCode(d.id, d.data())));
    cachePromoCodes = list;
    writeLocalCache(PART2_CACHE_KEYS.promoCodes, list);
    return { data: list };
  } catch (err) {
    return { data: cachePromoCodes, permissionDenied: isPermError(err) };
  }
}

export async function savePromoCode(promo: FirestorePromoCode): Promise<FirestoreOpResult> {
  try {
    await setDoc(
      doc(db, 'promo_codes', promo.id),
      {
        id: promo.id,
        code: promo.code.trim().toUpperCase(),
        discount: promo.discount.trim(),
        target: promo.target.trim(),
        expiry: promo.expiry.trim(),
        uses: Number(promo.uses) || 0,
        status: promo.status,
        isActive: promo.status === 'Active',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deletePromoCodeDoc(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'promo_codes', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

// Reviews
function parseReview(id: string, data: any): FirestoreReview {
  return {
    id,
    author: data.author || 'VIP Client',
    company: data.company || '',
    vehicle: data.vehicle || '',
    rating: Number(data.rating) || 5,
    comment: data.comment || '',
    date: data.date || '',
    isVisible: data.isVisible !== false,
    updatedAt: data.updatedAt || '',
  };
}

export function subscribeToReviews(
  onUpdate: (list: FirestoreReview[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        const list: FirestoreReview[] = [];
        snap.forEach((d) => list.push(parseReview(d.id, d.data())));
        cacheReviews = list;
        writeLocalCache(PART2_CACHE_KEYS.reviews, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) onPermissionDenied?.();
      }
    );
  } catch {
    return () => {};
  }
}

export async function fetchLiveReviews(): Promise<{
  data: FirestoreReview[];
  permissionDenied?: boolean;
}> {
  try {
    const snap = await getDocs(collection(db, 'reviews'));
    const list: FirestoreReview[] = [];
    snap.forEach((d) => list.push(parseReview(d.id, d.data())));
    cacheReviews = list;
    writeLocalCache(PART2_CACHE_KEYS.reviews, list);
    return { data: list };
  } catch (err) {
    return { data: cacheReviews, permissionDenied: isPermError(err) };
  }
}

export async function saveReview(rev: FirestoreReview): Promise<FirestoreOpResult> {
  try {
    await setDoc(
      doc(db, 'reviews', rev.id),
      {
        id: rev.id,
        author: rev.author.trim(),
        company: rev.company.trim(),
        vehicle: rev.vehicle.trim(),
        rating: Number(rev.rating) || 5,
        comment: rev.comment.trim(),
        date: rev.date.trim(),
        isVisible: rev.isVisible !== false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deleteReviewDoc(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'reviews', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

// Fleet Alerts
function parseFleetAlert(id: string, data: any): FirestoreFleetAlert {
  const level =
    data.level === 'urgent' || data.level === 'warning' ? data.level : 'info';
  return {
    id,
    title: data.title || '',
    message: data.message || '',
    level,
    time: data.time || 'Just now',
    isActive: data.isActive !== false,
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

export function subscribeToFleetAlerts(
  onUpdate: (list: FirestoreFleetAlert[]) => void,
  onPermissionDenied?: () => void
) {
  try {
    return onSnapshot(
      collection(db, 'fleet_alerts'),
      (snap) => {
        const list: FirestoreFleetAlert[] = [];
        snap.forEach((d) => list.push(parseFleetAlert(d.id, d.data())));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        cacheFleetAlerts = list;
        writeLocalCache(PART2_CACHE_KEYS.fleetAlerts, list);
        onUpdate(list);
      },
      (err) => {
        if (isPermError(err)) onPermissionDenied?.();
      }
    );
  } catch {
    return () => {};
  }
}

export async function fetchLiveFleetAlerts(): Promise<{
  data: FirestoreFleetAlert[];
  permissionDenied?: boolean;
}> {
  try {
    const snap = await getDocs(collection(db, 'fleet_alerts'));
    const list: FirestoreFleetAlert[] = [];
    snap.forEach((d) => list.push(parseFleetAlert(d.id, d.data())));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    cacheFleetAlerts = list;
    writeLocalCache(PART2_CACHE_KEYS.fleetAlerts, list);
    return { data: list };
  } catch (err) {
    return { data: cacheFleetAlerts, permissionDenied: isPermError(err) };
  }
}

export async function saveFleetAlert(alertItem: FirestoreFleetAlert): Promise<FirestoreOpResult> {
  try {
    await setDoc(
      doc(db, 'fleet_alerts', alertItem.id),
      {
        id: alertItem.id,
        title: alertItem.title.trim(),
        message: alertItem.message.trim(),
        level: alertItem.level,
        time: alertItem.time,
        isActive: alertItem.isActive !== false,
        createdAt: alertItem.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}

export async function deleteFleetAlertDoc(id: string): Promise<FirestoreOpResult> {
  try {
    await deleteDoc(doc(db, 'fleet_alerts', id));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, permissionDenied: isPermError(err), error: err?.message };
  }
}
