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

// ─── Google Maps Apple-style Light Theme ─────────────────────────────────────
// Warm ivory land (#FAF9F6), clean white roads, Apple-blue water, green parks.
// Minimal labels — only locality names. No POIs, no transit clutter.
export const MAP_STYLE_LIGHT: google.maps.MapTypeStyle[] = [
  // Warm ivory base (Apple Maps' signature — not stark white)
  { elementType: 'geometry',           stylers: [{ color: '#FAF9F6' }] },
  // Default: hide all labels
  { elementType: 'labels',             stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FAF9F6' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: 'rgba(0,0,0,0.48)' }] },
  // Show only locality/neighbourhood names
  { featureType: 'administrative.locality', elementType: 'labels',              stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill',    stylers: [{ color: 'rgba(0,0,0,0.58)' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.stroke',  stylers: [{ color: '#FAF9F6', weight: 3 }] },
  // Strip POIs and transit
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Road hierarchy — local streets white, arterials warm, highways warm amber
  { featureType: 'road',              elementType: 'geometry',        stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road',              elementType: 'geometry.stroke', stylers: [{ color: '#ECEAE4' }] },
  { featureType: 'road.local',        elementType: 'geometry',        stylers: [{ color: '#FDFCF9' }] },
  { featureType: 'road.arterial',     elementType: 'geometry',        stylers: [{ color: '#F7F4EE' }] },
  { featureType: 'road.arterial',     elementType: 'geometry.stroke', stylers: [{ color: '#EAE6DC' }] },
  { featureType: 'road.highway',      elementType: 'geometry',        stylers: [{ color: '#EEEADB' }] },
  { featureType: 'road.highway',      elementType: 'geometry.stroke', stylers: [{ color: '#E2DCCC' }] },
  // Apple Maps blue water
  { featureType: 'water',             elementType: 'geometry',        stylers: [{ color: '#BDD8F0' }] },
  // Land + nature
  { featureType: 'landscape',         elementType: 'geometry',        stylers: [{ color: '#FAF9F6' }] },
  { featureType: 'landscape.natural', elementType: 'geometry',        stylers: [{ color: '#EDF2E2' }] },
  { featureType: 'landscape.man_made',elementType: 'geometry',        stylers: [{ color: '#F4F2EC' }] },
  { featureType: 'poi.park',          elementType: 'geometry',        stylers: [{ color: '#D8EAC8' }] },
  { featureType: 'poi.sports_complex',elementType: 'geometry',        stylers: [{ color: '#DCE8C8' }] },
];

// ─── Google Maps Dark Style ───────────────────────────────────────────────────
export const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',           stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels',             stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050505' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: 'rgba(255,255,255,0.25)' }] },
  {
    featureType: 'administrative.locality',
    el