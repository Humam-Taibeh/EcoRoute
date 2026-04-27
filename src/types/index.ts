export interface LatLng {
  lat: number;
  lng: number;
}

export interface ElevationPoint {
  distance: number; // km from start
  elevation: number; // meters
  grade: number; // % grade
}

export interface Route {
  id: string;
  name: string;
  description: string;
  distance: number; // km
  estimatedTime: number; // minutes
  path: LatLng[];
  elevationProfile: ElevationPoint[];
  waypoints: { label: string; position: LatLng }[];
  ecoRating: number; // 0-100
  trafficLevel: 'low' | 'medium' | 'high';
}

export interface EcoMetrics {
  ecoScore: number;
  energyPenaltyKWh: number;
  regenRecoveryKWh: number;
  netEnergyKWh: number;
  co2SavedKg: number;
  totalElevationGain: number;
  totalElevationLoss: number;
  efficiencyRating: number;
}

export interface VehicleConfig {
  mass: number; // kg
  regenEfficiency: number; // 0-1
  baseConsumption: number; // kWh/km
  dragCoefficient: number;
}

// ─── Real API Route Config ────────────────────────────────────────────────────
export interface AmmanRouteConfig {
  id: string;
  name: string;
  description: string;
  ecoRating: number;
  trafficLevel: 'low' | 'medium' | 'high';
  origin: LatLng;
  destination: LatLng;
  waypointCoords: LatLng[];
  waypointLabels: string[];
  // Landmark context for AI co-pilot
  landmarks: string[];
}

// ─── Real-fetched route data ──────────────────────────────────────────────────
export interface RealRouteData {
  path: LatLng[];
  elevationProfile: ElevationPoint[];
  distance: number;
  duration: number;
  loading: boolean;
  error: string | null;
}
