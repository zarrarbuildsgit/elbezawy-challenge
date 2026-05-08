/**
 * ElBezawy Challenge v3 — Task Generation and Time Calculations
 */

export const DAILY_TASKS = [
  {
    id: 'fajr',
    title_ar: 'صلاة الفجر',
    type: 'spiritual',
    window_start: '05:00',
    window_end: '07:00',
    requires_photo: false,
    note_ar: 'بينك وبين الله — لا إثبات مطلوب'
  },
  {
    id: 'adhkar',
    title_ar: 'أذكار الصباح',
    type: 'spiritual',
    window_start: '06:00',
    window_end: '09:00',
    requires_photo: false,
    note_ar: 'بينك وبين الله — لا إثبات مطلوب'
  },
  {
    id: 'exercise',
    title_ar: 'تمرين ٣٠ دقيقة',
    type: 'physical',
    window_start: '07:00',
    window_end: '12:00',
    requires_photo: true,
    note_ar: 'أرسل صورة كدليل على الإنجاز'
  },
  {
    id: 'reading',
    title_ar: 'قراءة ١٠ صفحات',
    type: 'mental',
    window_start: '10:00',
    window_end: '14:00',
    requires_photo: true,
    note_ar: 'أرسل صورة للكتاب أو الصفحة'
  },
  {
    id: 'goals',
    title_ar: 'مراجعة الأهداف',
    type: 'mental',
    window_start: '16:00',
    window_end: '20:00',
    requires_photo: true,
    note_ar: 'صورة لمفكرتك أو تسجيلك'
  },
  {
    id: 'quran',
    title_ar: 'قراءة القرآن',
    type: 'spiritual',
    window_start: '20:00',
    window_end: '23:59',
    requires_photo: false,
    note_ar: 'بينك وبين الله — لا إثبات مطلوب'
  }
];

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

/**
 * Detect the user's timezone using the browser Intl API
 */
export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';
  } catch (e) {
    return 'Asia/Riyadh';
  }
};

/**
 * Calculates remaining time in hours, minutes, and seconds from now until the target UTC ISO deadline
 */
export const calculateTimeRemaining = (deadlineUtc: string): {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
} => {
  const now = new Date().getTime();
  const deadline = new Date(deadlineUtc).getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: 'انتهت المهلة'
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted: `${hours} ساعة و ${minutes} دقيقة`
  };
};

/** Get today's Date objects for a task's window_start and window_end in the user's timezone */
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

/** Determine the visual state of a task based on current time and completion status */
export function getTaskState(task: any, now: Date = new Date()): TaskState {
  if (task.completed) return 'done';
  const tz = task.timezone || 'Asia/Riyadh';
  const { start, end } = getTaskWindowDates(task.window_start || '00:00', task.window_end || '23:59', tz);
  if (now < start) return 'locked';
  if (now >= start && now <= end) return 'active';
  return 'expired';
}

/** Minutes remaining until the task's window closes */
export function getMinutesUntilWindowEnd(task: any, now: Date = new Date()): number {
  const tz = task.timezone || 'Asia/Riyadh';
  const { end } = getTaskWindowDates(task.window_start || '00:00', task.window_end || '23:59', tz);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60)));
}

/** Minutes remaining until the task's window opens */
export function getMinutesUntilWindowStart(task: any, now: Date = new Date()): number {
  const tz = task.timezone || 'Asia/Riyadh';
  const { start } = getTaskWindowDates(task.window_start || '00:00', task.window_end || '23:59', tz);
  return Math.max(0, Math.ceil((start.getTime() - now.getTime()) / (1000 * 60)));
}

/** Get the start time of a task in minutes from midnight (for sorting) */
export function getTaskStartMinutes(task: any): number {
  const [h, m] = (task.window_start || '00:00').split(':').map(Number);
  return h * 60 + m;
}

/** Build a sorted list of timeline items: tasks + a "now" marker inserted at the correct position */
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
