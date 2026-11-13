import React, { useState, useEffect } from 'react';
import { EmmaXHeader } from './components/EmmaXHeader';
import { WelcomeCard } from './components/WelcomeCard';
import { MetricCards } from './components/MetricCards';
import { FleetOperationsAnalytics } from './components/FleetOperationsAnalytics';
import { SystemHealthCard } from './components/SystemHealthCard';
import { ManageOperationalDataGrid } from './components/ManageOperationalDataGrid';
import { VehicleInventory } from './components/VehicleInventory';
import { AddVehicleForm } from './components/AddVehicleForm';
import { BookingsView } from './components/BookingsView';
import { UsersView } from './components/UsersView';
import { BookingCalendarView } from './components/BookingCalendarView';
import { PromoCodesView } from './components/PromoCodesView';
import { PromoCardsView } from './components/PromoCardsView';
import { ServicesView } from './components/ServicesView';
import { SubscriptionPlansView } from './components/SubscriptionPlansView';
import { ReviewsView } from './components/ReviewsView';
import { FleetAlertsView } from './components/FleetAlertsView';
import { VideoVaultView } from './components/VideoVaultView';
import { FrontendVideoPage } from './components/FrontendVideoPage';
import { BottomNavBar } from './components/BottomNavBar';
import { INITIAL_VEHICLES } from './data/mockFleetData';
import { VehicleItem } from './types';
import {
  syncVehicleToFirestore,
  deleteVehicleFromFirestore,
  fetchLiveFleetVehicles,
  subscribeToFleetVehicles,
  subscribeToUsers,
  subscribeToSubscriptions,
  subscribeToVideos,
  getCachedUsers,
  getCachedSubscriptions,
  getCachedVideos,
  FirestoreUser,
  FirestoreSubscription,
  FirestoreVideo,
} from './services/firebase';
import {
  subscribeToReservations,
  subscribeToPromoCards,
  subscribeToServices,
  subscribeToSubscriptionPlans,
  subscribeToPromoCodes,
  subscribeToReviews,
  subscribeToFleetAlerts,
  getCachedReservations,
  getCachedPromoCards,
  getCachedServices,
  getCachedSubscriptionPlans,
  getCachedPromoCodes,
  getCachedReviews,
  getCachedFleetAlerts,
  FirestoreReservation,
  FirestorePromoCard,
  FirestoreServiceItem,
  FirestoreSubscriptionPlan,
  FirestorePromoCode,
  FirestoreReview,
  FirestoreFleetAlert,
} from './services/part2Firebase';
import { CheckCircle2 } from 'lucide-react';

export type ViewMode =
  | 'dashboard'
  | 'inventory'
  | 'add-vehicle'
  | 'bookings'
  | 'users'
  | 'calendar'
  | 'promos'
  | 'promo-cards'
  | 'services'
  | 'subscription-plans'
  | 'reviews'
  | 'alerts'
  | 'videos'
  | 'frontend-video';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Part 1 pre-hydrated instant states
  const [users, setUsers] = useState<FirestoreUser[]>(() => getCachedUsers());
  const [subscriptions, setSubscriptions] = useState<FirestoreSubscription[]>(() => getCachedSubscriptions());
  const [videos, setVideos] = useState<FirestoreVideo[]>(() => getCachedVideos());
  const [usersLoaded, setUsersLoaded] = useState<boolean>(() => getCachedUsers().length > 0);
  const [videosLoaded, setVideosLoaded] = useState<boolean>(() => getCachedVideos().length > 0);
  const [vehicles, setVehicles] = useState<VehicleItem[]>(INITIAL_VEHICLES);

  // Part 2 pre-hydrated instant states
  const [reservations, setReservations] = useState<FirestoreReservation[]>(() => getCachedReservations());
  const [reservationsLoaded, setReservationsLoaded] = useState<boolean>(() => getCachedReservations().length > 0);
  const [reservationsDenied, setReservationsDenied] = useState(false);

  const [promoCards, setPromoCards] = useState<FirestorePromoCard[]>(() => getCachedPromoCards());
  const [promoCardsLoaded, setPromoCardsLoaded] = useState<boolean>(() => getCachedPromoCards().length > 0);

  const [services, setServices] = useState<FirestoreServiceItem[]>(() => getCachedServices());
  const [servicesLoaded, setServicesLoaded] = useState<boolean>(() => getCachedServices().length > 0);

  const [subPlans, setSubPlans] = useState<FirestoreSubscriptionPlan[]>(() => getCachedSubscriptionPlans());
  const [subPlansLoaded, setSubPlansLoaded] = useState<boolean>(() => getCachedSubscriptionPlans().length > 0);

  const [promoCodes, setPromoCodes] = useState<FirestorePromoCode[]>(() => getCachedPromoCodes());
  const [promoCodesLoaded, setPromoCodesLoaded] = useState<boolean>(() => getCachedPromoCodes().length > 0);
  const [promoCodesDenied, setPromoCodesDenied] = useState(false);

  const [reviews, setReviews] = useState<FirestoreReview[]>(() => getCachedReviews());
  const [reviewsLoaded, setReviewsLoaded] = useState<boolean>(() => getCachedReviews().length > 0);
  const [reviewsDenied, setReviewsDenied] = useState(false);

  const [fleetAlerts, setFleetAlerts] = useState<FirestoreFleetAlert[]>(() => getCachedFleetAlerts());
  const [fleetAlertsLoaded, setFleetAlertsLoaded] = useState<boolean>(() => getCachedFleetAlerts().length > 0);
  const [fleetAlertsDenied, setFleetAlertsDenied] = useState(false);

  // Real-time Firestore listeners on mount
  useEffect(() => {
    fetchLiveFleetVehicles().then((live) => {
      if (live && live.length > 0) setVehicles(live);
    });
    const unsubVehicles = subscribeToFleetVehicles((liveList) => {
      if (liveList && liveList.length > 0) setVehicles(liveList);
    });

    const unsubUsers = subscribeToUsers((liveUsers) => {
      setUsers(liveUsers);
      setUsersLoaded(true);
    });

    const unsubSubs = subscribeToSubscriptions((liveSubs) => {
      setSubscriptions(liveSubs);
    });

    const unsubVideos = subscribeToVideos((liveVideos) => {
      setVideos(liveVideos);
      setVideosLoaded(true);
    });

    // Part 2 real-time listeners
    const unsubReservations = subscribeToReservations(
      (list) => {
        setReservations(list);
        setReservationsLoaded(true);
        setReservationsDenied(false);
      },
      () => {
        setReservationsDenied(true);
        setReservationsLoaded(true);
      }
    );

    const unsubPromoCards = subscribeToPromoCards((list) => {
      setPromoCards(list);
      setPromoCardsLoaded(true);
    });

    const unsubServices = subscribeToServices((list) => {
      setServices(list);
      setServicesLoaded(true);
    });

    const unsubSubPlans = subscribeToSubscriptionPlans((list) => {
      setSubPlans(list);
      setSubPlansLoaded(true);
    });

    const unsubPromoCodes = subscribeToPromoCodes(
      (list) => {
        setPromoCodes(list);
        setPromoCodesLoaded(true);
        setPromoCodesDenied(false);
      },
      () => {
        setPromoCodesDenied(true);
        setPromoCodesLoaded(true);
      }
    );

    const unsubReviews = subscribeToReviews(
      (list) => {
        setReviews(list);
        setReviewsLoaded(true);
        setReviewsDenied(false);
      },
      () => {
        setReviewsDenied(true);
        setReviewsLoaded(true);
      }
    );

    const unsubAlerts = subscribeToFleetAlerts(
      (list) => {
        setFleetAlerts(list);
        setFleetAlertsLoaded(true);
        setFleetAlertsDenied(false);
      },
      () => {
        setFleetAlertsDenied(true);
        setFleetAlertsLoaded(true);
      }
    );

    return () => {
      unsubVehicles();
      unsubUsers();
      unsubSubs();
      unsubVideos();
      unsubReservations();
      unsubPromoCards();
      unsubServices();
      unsubSubPlans();
      unsubPromoCodes();
      unsubReviews();
      unsubAlerts();
    };
  }, []);

  // Compute live operational metrics
  const dispatchedCount = vehicles.filter(
    (v) => v.status === 'Dispatched' || v.isAvailable === false
  ).length;

  const totalDailyRevenue = vehicles.reduce(
    (acc, v) => acc + (Number(v.dailyRate) || 0),
    0
  );
  const monthlyVolume = totalDailyRevenue > 0
    ? totalDailyRevenue * 20 + 10000000
    : 24850000;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentView === 'add-vehicle') {
      setCurrentView('inventory');
    } else {
      setCurrentView('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTileClick = (tileId: string) => {
    if (tileId === 'vehicles') {
      setCurrentView('inventory');
    } else if (tileId === 'bookings') {
      setCurrentView('bookings');
    } else if (tileId === 'calendar') {
      setCurrentView('calendar');
    } else if (tileId === 'promo-cards') {
      setCurrentView('promo-cards');
    } else if (tileId === 'services') {
      setCurrentView('services');
    } else if (tileId === 'subscription-plans') {
      setCurrentView('subscription-plans');
    } else if (tileId === 'promos') {
      setCurrentView('promos');
    } else if (tileId === 'reviews') {
      setCurrentView('reviews');
    } else if (tileId === 'alerts') {
      setCurrentView('alerts');
    } else if (tileId === 'users') {
      setCurrentView('users');
    } else if (tileId === 'editor') {
      setCurrentView('videos');
    } else if (tileId === 'frontend-video') {
      setCurrentView('frontend-video');
    } else {
      setCurrentView('inventory');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'home') {
      setCurrentView('dashboard');
    } else if (tab === 'fleet') {
      setCurrentView('inventory');
    } else if (tab === 'bookings') {
      setCurrentView('bookings');
    } else if (tab === 'users') {
      setCurrentView('users');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Vehicle operations
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setCurrentView('add-vehicle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEditVehicle = (vehicle: VehicleItem) => {
    setEditingVehicle(vehicle);
    setCurrentView('add-vehicle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveVehicle = async (vehicle: VehicleItem) => {
    const isEdit = vehicles.some((v) => v.id === vehicle.id);

    if (isEdit) {
      setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? vehicle : v)));
      showToast(`Updated "${vehicle.name}" successfully!`);
    } else {
      setVehicles((prev) => [vehicle, ...prev]);
      showToast(`Saved "${vehicle.name}" to Cloud Firestore!`);
    }

    await syncVehicleToFirestore(vehicle);

    setCurrentView('inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const toDelete = vehicles.find((v) => v.id === vehicleId);
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    if (toDelete) {
      showToast(`Removed "${toDelete.name}" from fleet.`);
    }
    await deleteVehicleFromFirestore(vehicleId);
  };

  return (
    <div className="min-h-screen bg-[#f1f4f9] text-slate-800 flex flex-col font-sans">
      <EmmaXHeader
        showBack={currentView !== 'dashboard'}
        onBack={handleBack}
      />

      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[360px] w-[90%] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      <main className="flex-grow w-full max-w-[390px] sm:max-w-[410px] mx-auto px-3 py-2.5 pb-20">
        {currentView === 'dashboard' && (
          <div className="space-y-2.5">
            <WelcomeCard />
            <MetricCards
              usersCount={users.length || 6}
              dispatchedCount={dispatchedCount}
              totalVehicles={vehicles.length}
              monthlyVolume={monthlyVolume}
            />
            <FleetOperationsAnalytics />
            <SystemHealthCard />
            <ManageOperationalDataGrid onTileClick={handleTileClick} />
          </div>
        )}

        {currentView === 'inventory' && (
          <VehicleInventory
            vehicles={vehicles}
            onAddVehicleClick={handleOpenAddVehicle}
            onEditVehicleClick={handleOpenEditVehicle}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {currentView === 'add-vehicle' && (
          <AddVehicleForm
            initialVehicle={editingVehicle}
            onSave={handleSaveVehicle}
            onCancel={() => setCurrentView('inventory')}
          />
        )}

        {currentView === 'bookings' && (
          <BookingsView
            initialReservations={reservations}
            initialLoaded={reservationsLoaded}
            permissionDenied={reservationsDenied}
          />
        )}

        {currentView === 'calendar' && (
          <BookingCalendarView
            vehicles={vehicles}
            reservations={reservations}
            permissionDenied={reservationsDenied}
            onOpenBookings={() => setCurrentView('bookings')}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'promo-cards' && (
          <PromoCardsView
            initialCards={promoCards}
            initialLoaded={promoCardsLoaded}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'services' && (
          <ServicesView
            initialServices={services}
            initialLoaded={servicesLoaded}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'subscription-plans' && (
          <SubscriptionPlansView
            initialPlans={subPlans}
            initialLoaded={subPlansLoaded}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'promos' && (
          <PromoCodesView
            initialPromoCodes={promoCodes}
            initialLoaded={promoCodesLoaded}
            permissionDenied={promoCodesDenied}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'reviews' && (
          <ReviewsView
            initialReviews={reviews}
            initialLoaded={reviewsLoaded}
            permissionDenied={reviewsDenied}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'alerts' && (
          <FleetAlertsView
            initialAlerts={fleetAlerts}
            initialLoaded={fleetAlertsLoaded}
            permissionDenied={fleetAlertsDenied}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'users' && (
          <UsersView
            initialUsers={users}
            initialSubscriptions={subscriptions}
            initialLoaded={usersLoaded}
          />
        )}

        {currentView === 'videos' && (
          <VideoVaultView
            initialVideos={videos}
            initialLoaded={videosLoaded}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'frontend-video' && (
          <FrontendVideoPage
            initialVideos={videos}
            initialLoaded={videosLoaded}
            onBack={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      <BottomNavBar
        activeTab={
          currentView === 'dashboard'
            ? 'home'
            : currentView === 'inventory' || currentView === 'add-vehicle'
            ? 'fleet'
            : currentView === 'bookings' || currentView === 'calendar'
            ? 'bookings'
            : currentView === 'users'
            ? 'users'
            : 'home'
        }
        onTabChange={handleTabChange}
      />
    </div>
  );
}
