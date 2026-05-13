/**
 * ElBezawy Challenge — Task Definitions + Adhan API Service
 * Prayers synced to real adhan times via api.aladhan.com (cached daily in localStorage)
 */

export const CORE_TASK_IDS  = ['fajr', 'adhkar', 'dhuhr', 'asr', 'exercise', 'maghrib', 'goals', 'isha', 'quran'] as const;
export const BONUS_TASK_IDS = ['qiyam', 'sunnah'] as const;
export type CoreTaskId  = typeof CORE_TASK_IDS[number];
export type BonusTaskId = typeof BONUS_TASK_IDS[number];

export interface AdhanTimings {
  Fajr: string; Sunrise: string; Dhuhr: string;
  Asr: string; Maghrib: string; Isha: string; Lastthird: string;
}

// Fallback times (Arabian Peninsula approximation)
export const DEFAULT_ADHAN_TIMINGS: AdhanTimings = {
  Fajr: '05:00', Sunrise: '06:15', Dhuhr: '12:00',
  Asr: '15:30', Maghrib: '18:15', Isha: '19:45', Lastthird: '02:30'
};

// Timezone → approximate coordinates for Adhan API fallback
const TZ_COORDS: Record<string, [number, number]> = {
  'Asia/Riyadh':    [24.68, 46.72],
  'Asia/Jeddah':    [21.54, 39.19],
  'Africa/Cairo':   [30.06, 31.24],
  'Asia/Dubai':     [25.20, 55.27],
  'Africa/Casablanca': [33.59, -7.62],
  'Asia/Kuwait':    [29.37, 47.98],
  'Asia/Qatar':     [25.28, 51.52],
  'Asia/Bahrain':   [26.22, 50.58],
  'Asia/Muscat':    [23.61, 58.59],
  'Africa/Tunis':   [36.82, 10.17],
  'Africa/Tripoli': [32.90, 13.18],
  'Asia/Amman':     [31.96, 35.95],
  'Asia/Beirut':    [33.89, 35.50],
  'Asia/Damascus':  [33.51, 36.29],
  'Asia/Baghdad':   [33.34, 44.40],
  'Europe/London':  [51.51, -0.13],
  'Europe/Paris':   [48.86,  2.35],
  'Europe/Berlin':  [52.52, 13.41],
};

/** Read today's adhan timings from localStorage cache */
export function getAdhanTimings(): AdhanTimings {
  if (typeof window === 'undefined') return DEFAULT_ADHAN_TIMINGS;
  const today = new Date().toLocaleDateString('sv');
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/\//g,'_') : 'UTC';
  try {
    const raw = localStorage.getItem(`elbezawi_adhan_${today}_${tz}`);
    if (raw) return { ...DEFAULT_ADHAN_TIMINGS, ...JSON.parse(raw) };
  } catch { /* silent */ }
  return DEFAULT_ADHAN_TIMINGS;
}

/** Derive Adhan calculation method from IANA timezone string */
function getAdhanMethod(tz: string): number {
  // Specific overrides for known standards
  if (tz === 'Asia/Karachi')                         return 1;  // University of Islamic Sciences, Karachi
  if (['Asia/Riyadh','Asia/Jeddah','Asia/Mecca',
       'Asia/Bahrain','Asia/Muscat'].includes(tz))   return 4;  // Umm al-Qura, Makkah
  if (tz === 'Africa/Cairo')                         return 5;  // Egyptian General Authority
  if (['Asia/Singapore','Asia/Kuala_Lumpur',
       'Asia/Jakarta','Asia/Makassar'].includes(tz)) return 11; // MUIS Singapore (widely used in SEA)
  if (tz === 'Asia/Tehran')                          return 7;  // University of Tehran
  if (tz === 'Asia/Kuwait')                          return 9;  // Kuwait
  if (tz === 'Asia/Qatar')                           return 10; // Qatar
  if (['Europe/Istanbul','Asia/Istanbul'].includes(tz)) return 13; // Diyanet, Turkey
  if (['Asia/Dubai','Asia/Abu_Dhabi'].includes(tz))  return 4;  // UAE → Umm al-Qura

  // Prefix-based fallback — covers every other IANA timezone
  if (tz.startsWith('America/'))   return 2;  // ISNA
  if (tz.startsWith('Europe/'))    return 3;  // Muslim World League
  return 3;                                   // Default: Muslim World League (globally accepted)
}

/** Fetch today's adhan timings from api.aladhan.com and cache in localStorage.
 *  Pass userTimezone (the one selected in app settings) for correct local times + method. */
export async function fetchAndCacheAdhan(userTimezone?: string): Promise<AdhanTimings> {
  if (typeof window === 'undefined') return DEFAULT_ADHAN_TIMINGS;

  const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date().toLocaleDateString('sv');
  const cacheKey = `elbezawi_adhan_${today}_${tz.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Return cached if available
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { return { ...DEFAULT_ADHAN_TIMINGS, ...JSON.parse(cached) }; } catch { /* fall through */ }
  }

  // Resolve coordinates: geolocation → timezone fallback → Mecca
  let lat = 21.39, lng = 39.86;
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
    );
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } catch {
    const coords = TZ_COORDS[tz];
    if (coords) { lat = coords[0]; lng = coords[1]; }
  }

  const method = getAdhanMethod(tz);

  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}&timezonestring=${encodeURIComponent(tz)}`
    );
    if (res.ok) {
      const json = await res.json();
      const raw = json?.data?.timings as Record<string, string> | undefined;
      if (raw) {
        const keys: (keyof AdhanTimings)[] = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha','Lastthird'];
        const clean: Partial<AdhanTimings> = {};
        for (const k of keys) {
          if (raw[k]) clean[k] = raw[k].replace(/\s*\(.*\)/, '').trim();
        }
        const timings = { ...DEFAULT_ADHAN_TIMINGS, ...clean };
        localStorage.setItem(cacheKey, JSON.stringify(timings));
        return timings;
      }
    }
  } catch (e) {
    console.warn('Adhan API fetch failed, using defaults:', e);
  }

  return DEFAULT_ADHAN_TIMINGS;
}



/** Add N minutes to an "HH:MM" string, clamped to 23:59 */
function addMinutes(time: string, n: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + n, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

/** Build the full task list using latest cached Adhan timings */
export function getDailyTasks() {
  const t = getAdhanTimings();
  const adhkarEnd = addMinutes(t.Sunrise, 30); // 30 min after sunrise (islamically correct)

  return [
    // ── CORE (5) — all required for streak ───────────────────────────────────
    {
      id: 'fajr',
      title_ar: 'صلاة الفجر',
      type: 'spiritual',
      window_start: t.Fajr,
      window_end: t.Sunrise,
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    {
      id: 'adhkar',
      title_ar: 'أذكار الصباح',
      type: 'spiritual',
      window_start: t.Fajr,
      window_end: adhkarEnd,
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    {
      id: 'dhuhr',
      title_ar: 'صلاة الظهر',
      type: 'spiritual',
      window_start: t.Dhuhr,
      window_end: addMinutes(t.Dhuhr, 60),
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    {
      id: 'asr',
      title_ar: 'صلاة العصر',
      type: 'spiritual',
      window_start: t.Asr,
      window_end: t.Maghrib,
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    {
      id: 'exercise',
      title_ar: 'تمرين ٣٠ دقيقة',
      type: 'physical',
      window_start: '00:00',
      window_end: '23:59',
      requires_photo: true,
      note_ar: 'أرسل صورة كدليل على الإنجاز',
      is_bonus: false
    },
    {
      id: 'maghrib',
      title_ar: 'صلاة المغرب',
      type: 'spiritual',
      window_start: t.Maghrib,
      window_end: addMinutes(t.Maghrib, 30),
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    {
      id: 'goals',
      title_ar: 'مراجعة الأهداف',
      type: 'mental',
      window_start: t.Asr,
      window_end: t.Maghrib,
      requires_photo: true,
      note_ar: 'صورة لمفكرتك أو تسجيلك',
      is_bonus: false
    },
    {
      id: 'isha',
      title_ar: 'صلاة العشاء',
      type: 'spiritual',
      window_start: t.Isha,
      window_end: addMinutes(t.Isha, 30),
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    {
      id: 'quran',
      title_ar: 'قراءة القرآن',
      type: 'spiritual',
      window_start: t.Isha,
      window_end: '23:59',
      requires_photo: false,
      note_ar: 'بينك وبين الله — لا إثبات مطلوب',
      is_bonus: false
    },
    // ── BONUS (2) — optional, add to total_completed & leaderboard ────────────
    {
      id: 'qiyam',
      title_ar: 'قيام الليل',
      type: 'spiritual',
      window_start: t.Lastthird,
      window_end: t.Fajr,
      requires_photo: false,
      note_ar: 'نقاط إضافية — بينك وبين الله',
      is_bonus: true
    },
    {
      id: 'sunnah',
      title_ar: 'السنن الرواتب',
      type: 'spiritual',
      window_start: '00:00',
      window_end: '23:59',
      requires_photo: false,
      note_ar: 'نقاط إضافية — حافظ على سننك اليومية',
      is_bonus: true
    },
  ];
}

// Static export for backward compat — call getDailyTasks() inside async fns for live times
export const DAILY_TASKS = getDailyTasks();

/** Convert Western numerals to Eastern Arabic numerals (٠١٢٣) */
export function toEasternArabic(num: number | string): string {
  const map: Record<string, string> = {
    '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
    '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
  };
  return String(num).split('').map(c => map[c] ?? c).join('');
}

/** Format a time string like "05:00" into Eastern Arabic "٠٥:٠٠" */
export function formatTimeEastern(timeStr: string): string {
  return toEasternArabic(timeStr);
}

/** Detect the user's timezone using the browser Intl API */
export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';
  } catch {
    return 'Asia/Riyadh';
  }
};

export const calculateTimeRemaining = (deadlineUtc: string): {
  hours: number; minutes: number; seconds: number; isExpired: boolean; formatted: string;
} => {
  const now = new Date().getTime();
  const deadline = new Date(deadlineUtc).getTime();
  const diff = deadline - now;

  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: 'انتهت المهلة' };

  const hours   = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isExpired: false, formatted: `${hours} ساعة و ${minutes} دقيقة` };
};

export function getTaskWindowDates(window_start: string, window_end: string, timezone: string): { start: Date; end: Date } {
  const now = new Date();
  const dateBase = now.toLocaleDateString('en-US', { timeZone: timezone });

  const start = new Date(dateBase);
  const [sh, sm] = window_start.split(':').map(Number);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(dateBase);
  const [eh, em] = window_end.split(':').map(Number);
  end.setHours(eh, em, 59, 999);

  return { start, end };
}

export type TaskState = 'locked' | 'active' | 'expired' | 'done';

export function getTaskState(task: any, now: Date = new Date()): TaskState {
  if (task.completed) return 'done';
  const tz = task.timezone || 'Asia/Riyadh';
  const { start, end } = getTaskWindowDates(task.window_start || '00:00', task.window_end || '23:59', tz);
  if (now < start) return 'locked';
  if (now >= start && now <= end) return 'active';
  return 'expired';
}

export function getMinutesUntilWindowEnd(task: any, now: Date = new Date()): number {
  const tz = task.timezone || 'Asia/Riyadh';
  const { end } = getTaskWindowDates(task.window_start || '00:00', task.window_end || '23:59', tz);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60)));
}

export function getMinutesUntilWindowStart(task: any, now: Date = new Date()): number {
  const tz = task.timezone || 'Asia/Riyadh';
  const { start } = getTaskWindowDates(task.window_start || '00:00', task.window_end || '23:59', tz);
  return Math.max(0, Math.ceil((start.getTime() - now.getTime()) / (1000 * 60)));
}

export function getTaskStartMinutes(task: any): number {
  const [h, m] = (task.window_start || '00:00').split(':').map(Number);
  return h * 60 + m;
}

export function buildTimelineItems(tasks: any[], now: Date = new Date()): Array<
  | { kind: 'task'; task: any; startMinutes: number }
  | { kind: 'now'; startMinutes: number }
> {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const taskItems = tasks.map(task => ({
    kind: 'task' as const,
    task,
    startMinutes: getTaskStartMinutes(task)
  }));

  const items: Array<
    | { kind: 'task'; task: any; startMinutes: number }
    | { kind: 'now'; startMinutes: number }
  > = [];

  let nowInserted = false;
  for (const item of taskItems) {
    if (!nowInserted && nowMinutes < item.startMinutes) {
      items.push({ kind: 'now', startMinutes: nowMinutes });
      nowInserted = true;
    }
    items.push(item);
  }
  if (!nowInserted) {
    items.push({ kind: 'now', startMinutes: nowMinutes });
  }
  return items;
}
