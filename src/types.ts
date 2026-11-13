export interface VehicleOption {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'protection' | 'service' | 'fuel' | string;
}

export interface VehicleItem {
  id: string;
  name: string; // e.g. Toyota Land Cruiser Prado TXL
  subtitle?: string; // e.g. VIP Executive SUV · Lagos Plate
  description?: string;
  category: 'SUV' | 'Pickup' | 'MPV' | 'Sedan' | 'Bus' | string;
  badge?: string;
  promoBadge?: string;
  isAvailable?: boolean;
  status: 'Available' | 'Dispatched' | string;
  seats: number;
  doors?: number;
  transmission: 'Automatic' | 'Manual' | string;
  fuel: 'Petrol' | 'Diesel' | 'Hybrid' | string;
  luggage?: number;
  rangeOrPower?: string;
  dailyRate: number;
  pricePerDay?: number;
  monthlyRate?: number;
  registrationFee?: number;
  imageUrl: string;
  sideProfileImage?: string;
  galleryImages?: string[];
  galleryLabels?: string[];
  videoUrl?: string;
  options?: VehicleOption[];
  plateNumber?: string;
  location?: string;
  driver?: string;
  createdAt?: any;
  updatedAt?: any;
  images?: string[];
}

export interface BookingRecord {
  id: string;
  bookingCode: string;
  clientName: string;
  clientPhone: string;
  vehicleName: string;
  pickupLocation: string;
  returnLocation: string;
  dates: string;
  amount: number;
  escortIncluded: boolean;
  status: 'Active' | 'Confirmed' | 'Completed' | 'Pending';
}

export interface PromoCode {
  code: string;
  discount: string;
  target: string;
  expiry: string;
  uses: number;
  status: 'Active' | 'Expired';
}

export interface ReviewItem {
  id: string;
  author: string;
  company: string;
  vehicle: string;
  rating: number;
  comment: string;
  date: string;
}

export interface FleetAlert {
  id: string;
  title: string;
  level: 'info' | 'warning' | 'urgent';
  time: string;
  message: string;
}
