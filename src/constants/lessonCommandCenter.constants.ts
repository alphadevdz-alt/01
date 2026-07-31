/**
 * SPEX - Lesson Command Center Constants
 */

export const DEFAULT_TIMING_SETTINGS = {
  totalDurationMinutes: 45,
  warmupMinutes: 10,
  mainPhaseMinutes: 25,
  cooldownMinutes: 10,
  whistleAtPhaseChange: true,
  vibrationEnabled: true,
  soundEnabled: true,
  voiceAnnouncements: true,
};

export const CONTINGENCY_MODES = [
  { id: 'normal', name: 'الظروف العادية (قياسي)', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'hot_weather', name: 'الطقس الحار / ضربة شمس', badge: 'bg-amber-100 text-amber-800' },
  { id: 'equipment_shortage', name: 'نقص العتاد / الفضاء', badge: 'bg-blue-100 text-blue-800' },
  { id: 'high_fatigue', name: 'إرهاق التلاميذ / صيام', badge: 'bg-rose-100 text-rose-800' },
] as const;
