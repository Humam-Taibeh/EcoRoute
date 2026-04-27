import type { EcoMetrics, AmmanRouteConfig } from '../types';
import type { Language } from '../context/AppContext';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ─── Language-aware Prompt Builder ────────────────────────────────────────────
function buildPrompt(
  route:     AmmanRouteConfig,
  metrics:   EcoMetrics,
  distance:  number,
  mass:      number,
  regenEff:  number,
  language:  Language
): string {
  const topGrade = metrics.totalElevationGain > 200 ? 'steep' : 'moderate';
  const regenPct = ((metrics.regenRecoveryKWh / (metrics.energyPenaltyKWh + 0.001)) * 100).toFixed(0);

  const langInstruction = language === 'ar'
    ? `أجب حصراً باللهجة العامية الأردنية (عمّانية). استخدم تعبيرات مثل "يا زلمة", "يا كبير", "هيك", "والله", "يلا", "شو بدك أكتر". اذكر المعالم بالاسم. جملة أو جملتان فقط، ذكية وموجزة.`
    : `Respond in sharp, confident, professional English. Be witty and data-driven. 1-2 sentences max. Reference specific Amman landmarks by name.`;

  // For custom routes, add generic Amman context so Gemini can still give specific insights
  const isCustom  = route.id === 'custom';
  const routeCtx  = isCustom
    ? `Custom user route from Abdali Boulevard to ${route.name} (live search result)`
    : route.name;

  const landmarkCtx = route.landmarks.length > 0
    ? route.landmarks.join('; ')
    : 'Abdali Boulevard, Downtown Amman, 3rd Circle area, Jabal Amman slopes';

  return `You are EcoRoute AI's co-pilot — a brilliant, context-aware driving assistant for Amman, Jordan.
You know Amman's streets intimately: the brutal 7th Circle climb, the Abdoun bridge's satisfying regen descent,
Rainbow Street's winding drop from Jabal Amman, and the way Sweifieh sits between two hills.

LANGUAGE INSTRUCTION: ${langInstruction}

Route: ${routeCtx}
Distance: ${distance.toFixed(1)} km
Terrain: ${topGrade} (${metrics.totalElevationGain}m gain, ${metrics.totalElevationLoss}m loss)
mgh Energy Penalty: ${metrics.energyPenaltyKWh.toFixed(3)} kWh  (m=${mass}kg, g=9.81)
Regen Recovery:     ${metrics.regenRecoveryKWh.toFixed(3)} kWh  (η=${Math.round(regenEff * 100)}%)
Regen vs Climb:     ${regenPct}%
Net Energy Draw:    ${metrics.netEnergyKWh.toFixed(3)} kWh
CO₂ Saved vs Petrol: ${metrics.co2SavedKg.toFixed(2)} kg
Eco Score: ${metrics.ecoScore.toFixed(0)}/100
Landmarks / Context: ${landmarkCtx}

Generate ONE insight. Be specific to both the physics numbers AND the Amman terrain.`;
}

// ─── Main API Call ────────────────────────────────────────────────────────────
export async function getEcoInsight(
  route:     AmmanRouteConfig,
  metrics:   EcoMetrics,
  distance:  number,
  mass:      number,
  regenEff:  number,
  language:  Language = 'en'
): Promise<string> {
  if (!GEMINI_KEY) {
    return getFallbackInsight(route, metrics, language);
  }

  const response = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(route, metrics, distance, mass, regenEff, language) }] }],
      generationConfig: {
        temperature:      0.92,
        maxOutputTokens:  130,
        topK:             40,
        topP:             0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    console.warn('[EcoRoute] Gemini API error:', response.status);
    return getFallbackInsight(route, metrics, language);
  }

  const data = await response.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text
    ?? getFallbackInsight(route, metrics, language);
}

// ─── Welcome / No-Route Insight ───────────────────────────────────────────────
export async function getWelcomeInsight(language: Language): Promise<string> {
  if (!GEMINI_KEY) return getWelcomeFallback(language);

  const prompt = language === 'ar'
    ? `أنت مساعد EcoRoute AI لمدينة عمّان. اكتب رسالة ترحيب قصيرة (جملة واحدة أو جملتان) باللهجة الأردنية العامية. تحدث عن توفير الطاقة وتضاريس عمّان الجبلية والمسارات البيئية. استخدم تعابير مثل "يا زلمة" أو "والله" أو "يا كبير".`
    : `You are EcoRoute AI for Amman, Jordan. Write a one-line welcome message in sharp, witty English. Reference Amman's unique hilly topology (7th Circle, Abdoun, Jabal Amman) and real-time mgh physics. Be energetic and data-driven.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 90, topK: 40, topP: 0.95 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    });
    if (!response.ok) return getWelcomeFallback(language);
    const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? getWelcomeFallback(language);
  } catch {
    return getWelcomeFallback(language);
  }
}

function getWelcomeFallback(language: Language): string {
  return language === 'ar'
    ? 'يا زلمة، أهلاً بك في EcoRoute — عمّان بتضاريسها الجبلية تعطيك طاقة مجانية من كل منحدر!'
    : "Welcome to EcoRoute — Amman's hills are a free energy source. Enter your route and let the mgh engine do the math.";
}

// ─── Bilingual Fallback Insights ──────────────────────────────────────────────
function getFallbackInsight(
  route:    AmmanRouteConfig,
  metrics:  EcoMetrics,
  language: Language = 'en'
): string {
  const en: Record<string, string[]> = {
    'route-alpha': [
      `${metrics.regenRecoveryKWh.toFixed(3)} kWh recaptured on the Jabal Amman descent — that's the EV tax refund Rainbow Street owes you.`,
      `The 7th Circle tried to drain you. Net draw: ${metrics.netEnergyKWh.toFixed(3)} kWh. You win.`,
      `${metrics.co2SavedKg.toFixed(2)} kg CO₂ saved vs petrol — the eco score doesn't lie: ${metrics.ecoScore.toFixed(0)}/100.`,
    ],
    'route-beta': [
      `Abdoun Bridge handed you ${metrics.regenRecoveryKWh.toFixed(3)} kWh for free. That's the most efficient descent in West Amman.`,
      `7th Circle summit: ${metrics.energyPenaltyKWh.toFixed(3)} kWh cost, eco score still ${metrics.ecoScore.toFixed(0)}/100. Gravity is on your side on the way down.`,
      `Sweifieh to Abdali: net ${metrics.netEnergyKWh.toFixed(3)} kWh — the city's best kept efficiency secret.`,
    ],
  };

  const ar: Record<string, string[]> = {
    'route-alpha': [
      `يا زلمة، ${metrics.regenRecoveryKWh.toFixed(3)} kWh رجعولك من نزلة جبل عمّان — هيك بتكسر فاتورة البنزين بدون ما تحكي.`,
      `والله الدوار السابع ما قدر عليك — صافي الطاقة ${metrics.netEnergyKWh.toFixed(3)} kWh بس. يا كبير هاد إنجاز!`,
      `${metrics.co2SavedKg.toFixed(2)} كغ CO₂ وفّرت عالبيئة — الكوكب بيقولك شكراً يا زلمة.`,
    ],
    'route-beta': [
      `يا كبير، جسر عبدون أعطاك ${metrics.regenRecoveryKWh.toFixed(3)} kWh مجاناً — هيك بتطلع الفاتورة بكرة.`,
      `الدوار السابع يا زلمة — ${metrics.energyPenaltyKWh.toFixed(3)} kWh عشان تطلعه، بس نقاط البيئة ${metrics.ecoScore.toFixed(0)}/100. والله ما في أحسن منك!`,
      `الصويفية لعبدالي: ${metrics.netEnergyKWh.toFixed(3)} kWh صافي — يلا هاي أقوى وجبة مجانية بعمّان.`,
    ],
  };

  const pool = (language === 'ar' ? ar : en)[route.id] ?? [
    language === 'ar'
      ? `نقاط البيئة ${metrics.ecoScore.toFixed(0)}/100 — يا زلمة، حتى جبال عمّان صارت تشتغل معك.`
      : `Eco score ${metrics.ecoScore.toFixed(0)}/100 — even Amman's hills are working for you now.`,
  ];

  return pool[Math.floor(Math.random() * pool.length)];
}
