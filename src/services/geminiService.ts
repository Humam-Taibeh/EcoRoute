import type { EcoMetrics, AmmanRouteConfig } from '../types';
import type { Language } from '../context/AppContext';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ─── Tactical Advisor Prompt ───────────────────────────────────────────────────
function buildPrompt(
  route:    AmmanRouteConfig,
  metrics:  EcoMetrics,
  distance: number,
  mass:     number,
  regenEff: number,
  language: Language,
  userName: string
): string {
  const topGrade  = metrics.totalElevationGain > 200 ? 'steep' : 'moderate';
  const regenPct  = ((metrics.regenRecoveryKWh / (metrics.energyPenaltyKWh + 0.001)) * 100).toFixed(0);
  const isCustom  = route.id === 'custom' || route.id === 'live';
  const routeCtx  = isCustom
    ? `Custom route to ${route.name}`
    : route.name;
  const landmarkCtx = route.landmarks.length > 0
    ? route.landmarks.join('; ')
    : 'Abdali Boulevard, Downtown Amman, 3rd Circle, Jabal Amman slopes';

  const langInstruction = language === 'ar'
    ? `أجب حصراً باللهجة العامية الأردنية (عمّانية). ابدأ الرسالة بـ "يا ${userName}،" مباشرة. استخدم تعبيرات مثل "يا زلمة", "يا كبير", "هيك", "والله", "يلا", "شو بدك أكتر". اذكر معالم بالاسم. جملة واحدة إلى جملتين فقط — ذكية، تكتيكية، مبنية على الأرقام.`
    : `Respond in razor-sharp, confident English. Open with "Ya ${userName}," — then deliver ONE tactical insight fusing the physics numbers with specific Amman landmarks. Max 2 sentences. Be witty and precise. Never use generic phrases.`;

  return `You are EcoRoute AI — a Tactical Driving Advisor for Amman, Jordan.
You know Amman intimately: the punishing 7th Circle climb, Abdoun Bridge's satisfying regen descent,
Rainbow Street's winding drop from Jabal Amman, Sweifieh's dual-hill trap.
Your tone: professional, sharp, data-driven — part F1 race engineer, part street-smart Ammani.

PERSONA: Address the user as "Ya ${userName}" (English) or "يا ${userName}" (Arabic) in your opening.
Combine precise physics data with hyper-local Amman street knowledge.
Give ONE actionable insight. No greetings. No padding. Pure tactical intelligence.

LANGUAGE INSTRUCTION: ${langInstruction}

Route: ${routeCtx}
Distance: ${distance.toFixed(1)} km
Terrain: ${topGrade} (↑${metrics.totalElevationGain}m / ↓${metrics.totalElevationLoss}m)
mgh Penalty: ${metrics.energyPenaltyKWh.toFixed(3)} kWh  (m=${mass}kg · g=9.81 m/s²)
Regen Recovery: ${metrics.regenRecoveryKWh.toFixed(3)} kWh  (η=${Math.round(regenEff * 100)}%)
Regen vs Climb: ${regenPct}% recovered
Net Energy Draw: ${metrics.netEnergyKWh.toFixed(3)} kWh
CO₂ Saved vs Petrol: ${metrics.co2SavedKg.toFixed(2)} kg
Eco Score: ${metrics.ecoScore.toFixed(0)}/100
Landmarks: ${landmarkCtx}

Generate ONE tactical insight now.`;
}

// ─── Main Insight API Call ─────────────────────────────────────────────────────
export async function getEcoInsight(
  route:    AmmanRouteConfig,
  metrics:  EcoMetrics,
  distance: number,
  mass:     number,
  regenEff: number,
  language: Language = 'en',
  userName = 'Driver'
): Promise<string> {
  const safeName = normalizeName(userName);
  if (!GEMINI_KEY) return getFallbackInsight(route, metrics, language, safeName);

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(route, metrics, distance, mass, regenEff, language, safeName) }] }],
        generationConfig: { temperature: 0.94, maxOutputTokens: 140, topK: 40, topP: 0.95 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    });
    if (!response.ok) return getFallbackInsight(route, metrics, language, safeName);

    const data = await response.json() as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      ?? getFallbackInsight(route, metrics, language, safeName);
  } catch {
    return getFallbackInsight(route, metrics, language, safeName);
  }
}

// ─── Welcome Insight ───────────────────────────────────────────────────────────
export async function getWelcomeInsight(language: Language, userName = 'Driver'): Promise<string> {
  const safeName = normalizeName(userName);
  if (!GEMINI_KEY) return getWelcomeFallback(language, safeName);

  const prompt = language === 'ar'
    ? `أنت مستشار EcoRoute التكتيكي لعمّان. اكتب رسالة ترحيب قصيرة — جملة واحدة أو جملتان باللهجة الأردنية العامية. ابدأ بـ "يا ${safeName}،". تحدث عن تضاريس عمّان الجبلية وتوفير الطاقة وفيزياء mgh. لا تقل أشياء مبتذلة.`
    : `You are EcoRoute's Tactical Advisor for Amman. Write one sharp, witty welcome line in English. Open with "Ya ${safeName}," — then reference Amman's terrain (7th Circle, Abdoun, Jabal Amman) and mgh energy physics. Be energetic and data-forward. No fluff.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.92, maxOutputTokens: 95, topK: 40, topP: 0.95 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    });
    if (!response.ok) return getWelcomeFallback(language, safeName);
    const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? getWelcomeFallback(language, safeName);
  } catch {
    return getWelcomeFallback(language, safeName);
  }
}

function getWelcomeFallback(language: Language, userName: string): string {
  return language === 'ar'
    ? `يا ${userName}، أهلاً بك في EcoRoute — عمّان بجبالها تعطيك طاقة مجانية من كل منحدر. أدخل مسارك والـ mgh engine يحسب لك كل شيء.`
    : `Ya ${userName}, welcome to EcoRoute — Amman's hills are your free energy grid. Drop a route and let the mgh engine run the numbers.`;
}

// ─── Fallback Insights ─────────────────────────────────────────────────────────
function getFallbackInsight(
  route:    AmmanRouteConfig,
  metrics:  EcoMetrics,
  language: Language = 'en',
  userName = 'Driver'
): string {
  const en: Record<string, string[]> = {
    'route-alpha': [
      `Ya ${userName}, the Jabal Amman descent just handed you ${metrics.regenRecoveryKWh.toFixed(3)} kWh — that's Rainbow Street paying your EV bill.`,
      `Ya ${userName}, 7th Circle tried to drain you. Net: ${metrics.netEnergyKWh.toFixed(3)} kWh. Eco score ${metrics.ecoScore.toFixed(0)}/100. You win this round.`,
      `Ya ${userName}, ${metrics.co2SavedKg.toFixed(2)} kg CO₂ saved vs petrol — the mgh engine didn't miss a single slope.`,
    ],
    'route-beta': [
      `Ya ${userName}, Abdoun Bridge delivered ${metrics.regenRecoveryKWh.toFixed(3)} kWh free — the most efficient descent in West Amman is yours.`,
      `Ya ${userName}, 7th Circle summit cost ${metrics.energyPenaltyKWh.toFixed(3)} kWh but your eco score is still ${metrics.ecoScore.toFixed(0)}/100. Physics is working for you.`,
      `Ya ${userName}, Sweifieh to Abdali: net ${metrics.netEnergyKWh.toFixed(3)} kWh — the city's best-kept efficiency secret.`,
    ],
  };
  const ar: Record<string, string[]> = {
    'route-alpha': [
      `يا ${userName}، نزلة جبل عمّان ردّت لك ${metrics.regenRecoveryKWh.toFixed(3)} kWh — هيك بتطلع فاتورة Rainbow Street بالمجان.`,
      `يا زلمة، الدوار السابع ما قدر عليك — الطاقة الصافية ${metrics.netEnergyKWh.toFixed(3)} kWh بس. يا كبير، هاد رقم تحفة!`,
      `يا ${userName}، ${metrics.co2SavedKg.toFixed(2)} كغ CO₂ وفّرت على الكوكب — والله محرك mgh ما ضيّع تضرس.`,
    ],
    'route-beta': [
      `يا كبير، جسر عبدون أعطاك ${metrics.regenRecoveryKWh.toFixed(3)} kWh مجاناً — هيك أحسن طاقة مجانية بغرب عمّان.`,
      `يا ${userName}، قمة الدوار السابع كلّفت ${metrics.energyPenaltyKWh.toFixed(3)} kWh، بس نقاطك ${metrics.ecoScore.toFixed(0)}/100. والله ما في أحسن منك.`,
      `يا زلمة، الصويفية لعبدالي: ${metrics.netEnergyKWh.toFixed(3)} kWh صافي — يلا هاي أقوى جلسة كفاءة بالمدينة.`,
    ],
  };
  const pool = (language === 'ar' ? ar : en)[route.id] ?? [
    language === 'ar'
      ? `يا ${userName}، الإيكو سكور ${metrics.ecoScore.toFixed(0)}/100 — حتى جبال عمّان صارت تشتغل معك.`
      : `Ya ${userName}, eco score ${metrics.ecoScore.toFixed(0)}/100 — even Amman's brutal hills are on your side now.`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeName(userName: string): string {
  const trimmed = userName.trim().slice(0, 40);
  return trimmed || 'Driver';
}
