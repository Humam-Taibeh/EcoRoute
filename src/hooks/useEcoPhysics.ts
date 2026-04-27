import { useMemo } from 'react';
import type { Route, EcoMetrics, VehicleConfig } from '../types';

// ─── Physical Constants ───────────────────────────────────────────────────────
const G = 9.81; // m/s²
const KWH_PER_JOULE = 1 / 3_600_000;
const CO2_PER_KWH = 0.233; // kg CO₂ per kWh (grid average)
const PETROL_BASELINE_KWH_KM = 0.65; // equivalent petrol consumption per km

export const DEFAULT_VEHICLE: VehicleConfig = {
  mass: 1500, // kg (typical EV)
  regenEfficiency: 0.3, // 30% regenerative efficiency
  baseConsumption: 0.18, // kWh/km base draw
  dragCoefficient: 0.28,
};

/**
 * Physics-based Eco-Impact engine
 *
 * Elevation penalty:    ΔE = m · g · Δh  (potential energy)
 * Regen recovery:       E_regen = η_regen · m · g · |Δh_downhill|
 * Net energy:           E_net = E_base + E_climb − E_regen
 * CO₂ saved:            Δm_CO₂ = (E_petrol_baseline − E_net) × CO2_per_kWh
 */
export function useEcoPhysics(
  route: Route | null,
  vehicle: VehicleConfig = DEFAULT_VEHICLE
): EcoMetrics {
  return useMemo(() => {
    if (!route) {
      return {
        ecoScore: 0,
        energyPenaltyKWh: 0,
        regenRecoveryKWh: 0,
        netEnergyKWh: 0,
        co2SavedKg: 0,
        totalElevationGain: 0,
        totalElevationLoss: 0,
        efficiencyRating: 0,
      };
    }

    const { mass, regenEfficiency, baseConsumption } = vehicle;
    const profile = route.elevationProfile;

    let elevationGain = 0;
    let elevationLoss = 0;
    let energyPenaltyJ = 0;
    let regenRecoveryJ = 0;

    for (let i = 1; i < profile.length; i++) {
      const dh = profile[i].elevation - profile[i - 1].elevation; // meters

      if (dh > 0) {
        // Uphill — energy cost
        const energy = mass * G * dh; // Joules
        energyPenaltyJ += energy;
        elevationGain += dh;
      } else {
        // Downhill — regen opportunity
        const energy = mass * G * Math.abs(dh);
        regenRecoveryJ += energy * regenEfficiency;
        elevationLoss += Math.abs(dh);
      }
    }

    const energyPenaltyKWh = energyPenaltyJ * KWH_PER_JOULE;
    const regenRecoveryKWh = regenRecoveryJ * KWH_PER_JOULE;

    // Base consumption (flat terrain equivalent)
    const baseEnergyKWh = baseConsumption * route.distance;

    // Net energy = base + climb penalty - regen recovery
    const netEnergyKWh = Math.max(0, baseEnergyKWh + energyPenaltyKWh - regenRecoveryKWh);

    // CO₂ saved vs petrol equivalent
    const petrolEnergyKWh = PETROL_BASELINE_KWH_KM * route.distance;
    const co2SavedKg = Math.max(0, (petrolEnergyKWh - netEnergyKWh) * CO2_PER_KWH);

    // Eco score (0–100) — higher regen recovery & lower net = better score
    const regenRatio = regenRecoveryKWh / (energyPenaltyKWh + 0.001);
    const efficiencyFactor = 1 - netEnergyKWh / (petrolEnergyKWh + 0.001);
    const rawScore = (regenRatio * 40 + efficiencyFactor * 60) * route.ecoRating / 100;
    const ecoScore = Math.min(100, Math.max(0, rawScore * 1.2));

    const efficiencyRating = Math.min(100, (regenRecoveryKWh / (baseEnergyKWh + 0.001)) * 100);

    return {
      ecoScore: +ecoScore.toFixed(1),
      energyPenaltyKWh: +energyPenaltyKWh.toFixed(3),
      regenRecoveryKWh: +regenRecoveryKWh.toFixed(3),
      netEnergyKWh: +netEnergyKWh.toFixed(3),
      co2SavedKg: +co2SavedKg.toFixed(2),
      totalElevationGain: +elevationGain.toFixed(0),
      totalElevationLoss: +elevationLoss.toFixed(0),
      efficiencyRating: +efficiencyRating.toFixed(1),
    };
  }, [route, vehicle]);
}
