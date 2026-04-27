import { useApp, type Language } from './context/AppContext';

// ─── Full bilingual translation map ──────────────────────────────────────────
export const T = {
  en: {
    boot: {
      steps: [
        'Initializing physics engine',
        'Loading Amman terrain data',
        'Calibrating mgh model',
        'Connecting Gemini co-pilot',
        'Ready',
      ],
      subtitle: 'AMMAN NAVIGATION HUB',
      done: 'done',
    },
    tabs: { routes: 'Routes', metrics: 'Metrics', vehicle: 'Vehicle' },
    route: { dist: 'DIST', eta: 'ETA', eco: 'ECO', waypoints: 'WAYPOINTS' },
    sidebar: {
      distance:   'Distance',
      estTime:    'Est. Time',
      mghPenalty: 'mgh Penalty',
      regenOpp:   'Regen Opportunity',
      gain:       'gain',
      efficiency: 'η',
    },
    // ── Route-specific translations ──────────────────────────────────────────
    routeNames: {
      'route-alpha': 'ALPHA — University to Rainbow St',
      'route-beta':  'BETA — Abdali to 7th Circle',
    } as Record<string, string>,
    routeDescs: {
      'route-alpha': 'Jabal Amman descent — maximum regen capture on 7th Circle slopes',
      'route-beta':  'Abdoun bridge traverse + 7th Circle climb — maximum mgh penalty test',
    } as Record<string, string>,
    waypointLabels: {
      'route-alpha': ['ORIGIN · UJ', 'VIA · MECCA ST', 'DEST · RAINBOW ST'],
      'route-beta':  ['ORIGIN · ABDALI', 'VIA · ABDOUN BRIDGE', 'VIA · 7TH CIRCLE', 'DEST · SWEIFIEH'],
    } as Record<string, string[]>,
    // ── Live search ──────────────────────────────────────────────────────────
    search: {
      placeholder:        'Search destination in Amman...',
      originPlaceholder:  'Type origin or tap GPS...',
      destPlaceholder:    'Where do you want to go?',
      from:               'FROM',
      to:                 'TO',
      myLocation:         'My Location',
      quickRoutes:        'QUICK',
      clearRoute:         'Clear',
      searching:          'Computing route...',
      customRoute:        'Custom Route',
      customDesc:         'Live route to your destination',
    },
    welcome: {
      title:       'EcoRoute Ready',
      subtitle:    'Enter origin & destination — terrain physics computes instantly',
      selectRoute: 'Select your eco-route',
    },
    eco: {
      impact:       'ECO IMPACT',
      climbPenalty: 'Climb Penalty',
      regenCapture: 'Regen Capture',
      elevGain:     'Elev. Gain',
    },
    vehicle: {
      params:   'VEHICLE PARAMS',
      mass:     'Mass',
      regenEff: 'Regen Efficiency',
    },
    physics: {
      title:      'PHYSICS ENGINE',
      mghPenalty: 'mgh Penalty',
      regenEta:   'Regen η=30%',
      netDraw:    'Net Draw',
      co2Offset:  'CO₂ Offset',
    },
    regen:     { title: 'REGEN EFFICIENCY' },
    traffic:   { title: 'TRAFFIC',          low: 'Low',  medium: 'Medium',  high: 'High' },
    score:     { title: 'ECO SCORE' },
    elevation: { title: 'ELEVATION',        gain: 'GAIN',   loss: 'LOSS' },
    chart:     { title: 'ELEVATION',        altitude: 'Altitude', distance: 'Distance', grade: 'Grade' },
    hud: {
      netEnergy: 'Net Energy',
      regen:     'Regen',
      co2Saved:  'CO₂ Saved',
    },
    ai: {
      title:   'AI Co-pilot',
      badge:   'Gemini 2.0 Flash · Jordanian context',
      refresh: 'Regenerate insight',
      error:   'Gemini offline — tap to retry',
    },
    settings: {
      title:       'Settings',
      profile:     'Profile',
      language:    'Language · اللغة',
      appearance:  'Appearance',
      dark:        'Dark',
      light:       'Light',
      tapToEdit:   'Tap to edit name · Click avatar to change photo',
      arabicNote:  'Arabic Interface · Gemini responds in Jordanian dialect',
      lightNote:   'Tactical Light Mode · Apple-style premium display',
      footer:      'EcoRoute v2.0 · Amman Navigation Hub',
    },
    offline: {
      badge:    'TACTICAL OFFLINE MODE',
      fallback: 'Running on Amman terrain fallback · Physics engine active',
    },
    metrics: {
      netEnergy:    'Net Energy',
      regenRecovery:'Regen Recovery',
      co2Saved:     'CO₂ Saved',
    },
  },
  ar: {
    boot: {
      steps: [
        'تهيئة محرك الفيزياء',
        'تحميل بيانات تضاريس عمّان',
        'معايرة نموذج mgh',
        'الاتصال بمساعد Gemini',
        'جاهز',
      ],
      subtitle: 'مركز ملاحة عمّان',
      done: 'تم',
    },
    tabs: { routes: 'المسارات', metrics: 'المقاييس', vehicle: 'السيارة' },
    route: { dist: 'مسافة', eta: 'وقت', eco: 'بيئي', waypoints: 'نقاط المرور' },
    sidebar: {
      distance:   'المسافة',
      estTime:    'الوقت المتوقع',
      mghPenalty: 'عقوبة mgh',
      regenOpp:   'فرصة التوليد',
      gain:       'ارتفاع',
      efficiency: 'كفاءة',
    },
    // ── Route-specific translations ──────────────────────────────────────────
    routeNames: {
      'route-alpha': 'ALPHA — الجامعة إلى شارع الرينبو',
      'route-beta':  'BETA — عبدالي إلى الدوار السابع',
    } as Record<string, string>,
    routeDescs: {
      'route-alpha': 'نزلة جبل عمّان — أقصى استرداد للطاقة على منحدرات الدوار السابع',
      'route-beta':  'عبور جسر عبدون + صعود الدوار السابع — أقصى اختبار لعقوبة mgh',
    } as Record<string, string>,
    waypointLabels: {
      'route-alpha': ['البداية · الجامعة الأردنية', 'عبر · شارع مكة', 'الوجهة · شارع الرينبو'],
      'route-beta':  ['البداية · عبدالي', 'عبر · جسر عبدون', 'عبر · الدوار السابع', 'الوجهة · الصويفية'],
    } as Record<string, string[]>,
    // ── Live search ──────────────────────────────────────────────────────────
    search: {
      placeholder:        'ابحث عن وجهتك في عمّان...',
      originPlaceholder:  'نقطة البداية أو GPS...',
      destPlaceholder:    'إلى أين تريد الذهاب؟',
      from:               'من',
      to:                 'إلى',
      myLocation:         'موقعي الحالي',
      quickRoutes:        'سريع',
      clearRoute:         'مسح',
      searching:          'جاري حساب المسار...',
      customRoute:        'مسار مخصص',
      customDesc:         'مسار مباشر إلى وجهتك',
    },
    welcome: {
      title:       'EcoRoute جاهز',
      subtitle:    'أدخل البداية والوجهة — الفيزياء تُحسب فوراً',
      selectRoute: 'اختر مسارك البيئي',
    },
    eco: {
      impact:       'الأثر البيئي',
      climbPenalty: 'عقوبة الصعود',
      regenCapture: 'استرداد الطاقة',
      elevGain:     'ارتفاع مكتسب',
    },
    vehicle: {
      params:   'مواصفات السيارة',
      mass:     'الكتلة',
      regenEff: 'كفاءة التوليد',
    },
    physics: {
      title:      'محرك الفيزياء',
      mghPenalty: 'عقوبة mgh',
      regenEta:   'استرداد η=30%',
      netDraw:    'السحب الصافي',
      co2Offset:  'تعويض CO₂',
    },
    regen:     { title: 'كفاءة التوليد' },
    traffic:   { title: 'حركة المرور',      low: 'خفيف', medium: 'متوسط',   high: 'كثيف' },
    score:     { title: 'النقاط البيئية' },
    elevation: { title: 'الارتفاع',         gain: 'صعود',   loss: 'هبوط' },
    chart:     { title: 'الارتفاع',         altitude: 'الارتفاع', distance: 'المسافة', grade: 'الميل' },
    hud: {
      netEnergy: 'الطاقة الصافية',
      regen:     'التوليد',
      co2Saved:  'CO₂ موفّر',
    },
    ai: {
      title:   'مساعد الذكاء',
      badge:   'جيميناي 2.0 · لهجة أردنية',
      refresh: 'تجديد',
      error:   'Gemini غاب — اضغط للمحاولة',
    },
    settings: {
      title:       'الإعدادات',
      profile:     'الملف الشخصي',
      language:    'اللغة',
      appearance:  'المظهر',
      dark:        'داكن',
      light:       'فاتح',
      tapToEdit:   'اضغط للتعديل · اضغط على الصورة لتغييرها',
      arabicNote:  'واجهة عربية · Gemini يرد باللهجة الأردنية',
      lightNote:   'وضع الضوء التكتيكي · عرض عالي الجودة',
      footer:      'EcoRoute v2.0 · مركز ملاحة عمّان',
    },
    offline: {
      badge:    'وضع عدم الاتصال التكتيكي',
      fallback: 'يعمل على بيانات تضاريس عمّان · محرك الفيزياء نشط',
    },
    metrics: {
      netEnergy:    'الطاقة الصافية',
      regenRecovery:'استرداد الطاقة',
      co2Saved:     'CO₂ موفّر',
    },
  },
} satisfies Record<Language, unknown>;

export type Translations = typeof T.en;

export function useT(): Translations {
  const { language } = useApp();
  return T[language] as unknown as Translations;
}
