import type { AmmanRouteConfig, ElevationPoint } from '../types';

// ─── Real Amman Route Definitions ────────────────────────────────────────────
// Directions + Elevation APIs will be called at runtime for real path & terrain data.
// These configs seed the DirectionsService requests.

export const AMMAN_ROUTES: AmmanRouteConfig[] = [
  {
    id: 'route-alpha',
    name: 'ALPHA — University to Rainbow St',
    description: 'Jabal Amman descent — maximum regen capture on 7th Circle slopes',
    ecoRating: 88,
    trafficLevel: 'low',
    origin: { lat: 31.9916, lng: 35.8708 },       // University of Jordan
    destination: { lat: 31.9534, lng: 35.9234 },   // Rainbow Street / 1st Circle
    waypointCoords: [
      { lat: 31.9680, lng: 35.8778 },              // Mecca Street
    ],
    waypointLabels: ['ORIGIN · UJ', 'VIA · MECCA ST', 'DEST · RAINBOW ST'],
    landmarks: [
      'University of Jordan campus (elevation ~960m)',
      'Mecca Street arterial — moderate 6% descent',
      '3rd Circle slopes — strong regen zone',
      'Jabal Amman approach — winding 8% grade',
      'Rainbow Street arrival — downtown 780m',
    ],
  },
  {
    id: 'route-beta',
    name: 'BETA — Abdali to 7th Circle',
    description: 'Abdoun bridge traverse + 7th Circle climb — maximum mgh penalty test',
    ecoRating: 71,
    trafficLevel: 'medium',
    origin: { lat: 31.9769, lng: 35.9095 },        // Abdali Boulevard
    destination: { lat: 31.9491, lng: 35.8545 },   // Sweifieh
    waypointCoords: [
      { lat: 31.9590, lng: 35.9105 },              // Abdoun Bridge area
      { lat: 31.9546, lng: 35.8623 },              // 7th Circle
    ],
    waypointLabels: ['ORIGIN · ABDALI', 'VIA · ABDOUN BRIDGE', 'VIA · 7TH CIRCLE', 'DEST · SWEIFIEH'],
    landmarks: [
      'Abdali Boulevard start (elevation ~820m)',
      'Abdoun Bridge — notorious 9% grade, key regen zone',
      '4th Circle area — moderate climb',
      '7th Circle summit (~950m) — max mgh penalty on ascent',
      'Sweifieh Village descent — 920m',
    ],
  },
];

export const DEFAULT_CENTER = { lat: 31.9762, lng: 35.8958 };
export const DEFAULT_ZOOM = 13;

// ─── Fallback elevation profiles (used when Elevation API unavailable) ────────
function buildFallback(elevations: number[]): ElevationPoint[] {
  let d = 0;
  return elevations.map((elevation, i) => {
    if (i > 0) d += 0.35;
    const grade = i > 0 ? ((elevation - elevations[i - 1]) / 350) * 100 : 0;
    return { distance: +d.toFixed(2), elevation, grade: +grade.toFixed(1) };
  });
}

// Route Alpha — University → Rainbow St (steep descent)
export const FALLBACK_ALPHA = buildFallback([
  980, 965, 942, 920, 905, 890, 872, 858, 840, 825,
  815, 808, 800, 795, 790, 788, 790, 800, 815, 830,
  845, 860, 872, 880, 875, 865, 852, 838, 822, 808,
  793, 779, 764, 750, 738, 726, 715, 705, 795, 780,
]);

// Route Beta — Abdali → 7th Circle → Sweifieh (climb then descent)
export const FALLBACK_BETA = buildFallback([
  820, 815, 808, 812, 820, 832, 848, 862, 875, 888,
  900, 912, 922, 930, 936, 940, 944, 946, 948, 950,
  948, 942, 935, 926, 918, 910, 905, 900, 895, 890,
  884, 876, 868, 858, 848, 938, 928, 924, 921, 920,
]);

// ─── Google Maps Pearl / Silver Light Theme ───────────────────────────────────
// Cool pearl-white land, crisp white roads, silver-blue water — zero labels.
// Inspired by Apple Vision Pro's minimal spatial UI.
export const MAP_STYLE_LIGHT: google.maps.MapTypeStyle[] = [
  // Pearl-white base
  { elementType: 'geometry',           stylers: [{ color: '#EBEBEB' }] },
  // Hide ALL labels — clean viewport
  { elementType: 'labels',             stylers: [{ visibility: 'off' }] },
  // Strip POIs and transit clutter
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Roads — crisp white on silver base
  { featureType: 'road',              elementType: 'geometry',        stylers: [{ color: '#FAFAFA' }] },
  { featureType: 'road',              elementType: 'geometry.stroke', stylers: [{ color: '#E0E0E0' }] },
  { featureType: 'road.local',        elementType: 'geometry',        stylers: [{ color: '#F5F5F5' }] },
  { featureType: 'road.arterial',     elementType: 'geometry',        stylers: [{ color: '#F0EFEA' }] },
  { featureType: 'road.arterial',     elementType: 'geometry.stroke', stylers: [{ color: '#E4E2DA' }] },
  { featureType: 'road.highway',      elementType: 'geometry',        stylers: [{ color: '#E8E6DE' }] },
  { featureType: 'road.highway',      elementType: 'geometry.stroke', stylers: [{ color: '#DCDAD0' }] },
  // Silver-blue water (cool, premium)
  { featureType: 'water',             elementType: 'geometry',        stylers: [{ color: '#C8D8EC' }] },
  // Landscape — subtle grey tones
  { featureType: 'landscape',         elementType: 'geometry',        stylers: [{ color: '#E8E8E8' }] },
  { featureType: 'landscape.natural', elementType: 'geometry',        stylers: [{ color: '#DEEBD6' }] },
  { featureType: 'landscape.man_made',elementType: 'geometry',        stylers: [{ color: '#EDEDED' }] },
  { featureType: 'poi.park',          elementType: 'geometry',        stylers: [{ color: '#D4E4CE' }] },
  { featureType: 'poi.sports_complex',elementType: 'geometry',        stylers: [{ color: '#D8E8CC' }] },
];

// ─── Google Maps Dark Style ───────────────────────────────────────────────────
export const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',           stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels',             stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050505' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: 'rgba(255,255,255,0.25)' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.25)' }],
  },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1a2235' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#243050' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0a1628' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
];
