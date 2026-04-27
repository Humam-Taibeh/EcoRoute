import { useState, useEffect, useCallback } from 'react';
import type { AmmanRouteConfig, ElevationPoint, RealRouteData, LatLng } from '../types';
import { FALLBACK_ALPHA, FALLBACK_BETA } from '../data/mockRoutes';

const ELEVATION_SAMPLES = 40;
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ROUTES_API = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// ─── Routes API v2 response shape ────────────────────────────────────────────
interface RoutesApiRoute {
  distanceMeters: number;
  duration: string; // "1234s"
  polyline: { encodedPolyline: string };
}
interface RoutesApiResponse {
  routes?: RoutesApiRoute[];
  error?: { code: number; message: string; status: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function decodePath(encoded: string): LatLng[] {
  return window.google.maps.geometry.encoding
    .decodePath(encoded)
    .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
}

function buildElevationProfile(
  points: LatLng[],
  elevResults: google.maps.ElevationResult[]
): ElevationPoint[] {
  const profile: ElevationPoint[] = [];
  let cumDist = 0;

  for (let i = 0; i < elevResults.length; i++) {
    if (i > 0) {
      const a = points[Math.floor((i / (elevResults.length - 1)) * (points.length - 1))];
      const b = points[Math.floor(((i - 1) / (elevResults.length - 1)) * (points.length - 1))];
      const R = 6371;
      const dLat = ((a.lat - b.lat) * Math.PI) / 180;
      const dLng = ((a.lng - b.lng) * Math.PI) / 180;
      const sinLat = Math.sin(dLat / 2);
      const sinLng = Math.sin(dLng / 2);
      const c = Math.sqrt(
        sinLat * sinLat +
        Math.cos((b.lat * Math.PI) / 180) * Math.cos((a.lat * Math.PI) / 180) * sinLng * sinLng
      );
      cumDist += 2 * R * Math.asin(c);
    }
    const elevation = elevResults[i].elevation;
    const prevElevation = i > 0 ? elevResults[i - 1].elevation : elevation;
    const segDist = cumDist > 0 && i > 0 ? (cumDist / i) * 1000 : 350;
    const grade = ((elevation - prevElevation) / segDist) * 100;
    profile.push({
      distance: +cumDist.toFixed(3),
      elevation: +elevation.toFixed(1),
      grade: +Math.max(-30, Math.min(30, grade)).toFixed(1),
    });
  }
  return profile;
}

function getFallback(routeId: string): ElevationPoint[] {
  if (routeId === 'route-alpha') return FALLBACK_ALPHA;
  if (routeId === 'route-beta')  return FALLBACK_BETA;
  return FALLBACK_ALPHA; // generic fallback for custom routes
}

// ─── Routes API v2 (replaces deprecated DirectionsService, Feb 2026) ──────────
async function computeRouteV2(
  config: AmmanRouteConfig
): Promise<{ path: LatLng[]; distance: number; duration: number }> {
  if (!GMAPS_KEY) {
    throw new Error('NO_KEY · Set VITE_GOOGLE_MAPS_API_KEY in .env.local');
  }

  const res = await fetch(ROUTES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GMAPS_KEY,
      // Only request the fields we use — keeps response tiny and avoids billing extra SKUs
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: {
        location: { latLng: { latitude: config.origin.lat, longitude: config.origin.lng } },
      },
      destination: {
        location: {
          latLng: { latitude: config.destination.lat, longitude: config.destination.lng },
        },
      },
      intermediates: config.waypointCoords.map((c) => ({
        location: { latLng: { latitude: c.lat, longitude: c.lng } },
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      regionCode: 'JO',
    }),
  });

  const data: RoutesApiResponse = await res.json();

  if (!res.ok || data.error) {
    const status = data.error?.status ?? `HTTP_${res.status}`;
    const msg    = data.error?.message ?? res.statusText;
    throw new Error(`ROUTES_API [${status}] ${msg}`);
  }

  const route = data.routes?.[0];
  if (!route?.polyline?.encodedPolyline) {
    throw new Error('ROUTES_API · Response contained no route polyline');
  }

  return {
    path:     decodePath(route.polyline.encodedPolyline),
    distance: route.distanceMeters / 1000,
    duration: parseInt(route.duration.replace('s', ''), 10) / 60,
  };
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
export function useRealRoute(
  config: AmmanRouteConfig,
  googleLoaded: boolean,
  /** Set to false to skip fetching (e.g. custom route slot before user searches) */
  enabled = true
): RealRouteData {
  const [data, setData] = useState<RealRouteData>(() => ({
    path: [],
    elevationProfile: enabled ? getFallback(config.id) : [],
    distance: 0,
    duration: 0,
    loading: false,
    error: null,
  }));

  const fetchRoute = useCallback(async () => {
    if (!enabled || !googleLoaded || !window.google?.maps) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // ── 1. Routes API v2 (2026 standard) ──────────────────────────────────
      const { path, distance, duration } = await computeRouteV2(config);

      // ── 2. Elevation API (still current — not deprecated) ──────────────────
      const elevService = new window.google.maps.ElevationService();
      const elevResult  = await elevService.getElevationAlongPath({
        path:    path.map((p) => new window.google.maps.LatLng(p.lat, p.lng)),
        samples: ELEVATION_SAMPLES,
      });

      if (!elevResult.results?.length) {
        throw new Error('ELEVATION_API · No elevation data returned');
      }

      setData({
        path,
        elevationProfile: buildElevationProfile(path, elevResult.results),
        distance: +distance.toFixed(2),
        duration: +duration.toFixed(0),
        loading:  false,
        error:    null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[EcoRoute] API fetch failed — running on terrain fallback:', message);
      setData((prev) => ({
        ...prev,
        elevationProfile: getFallback(config.id),
        loading: false,
        error:   message,
      }));
    }
  }, [config, enabled, googleLoaded]);

  useEffect(() => {
    if (!enabled) {
      // Clear data when slot is disabled
      setData({ path: [], elevationProfile: [], distance: 0, duration: 0, loading: false, error: null });
      return;
    }
    if (googleLoaded) fetchRoute();
  }, [fetchRoute, googleLoaded, enabled]);

  return data;
}
