import { createClient } from '@supabase/supabase-js';
import { getDailyTasks, CORE_TASK_IDS, BONUS_TASK_IDS, detectTimezone } from './tasks';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
console.log('KEY_CHECK:', OPENROUTER_API_KEY ? '✅ set' : '❌ empty');

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Hardcoded admin whitelist array
const ADMIN_EMAILS = [
  'muhummadzarrar09@gmail.com',
  'muhummadzarrar99@gmail.com',
  'sinz.lumi@icloud.com',
  'elbezawyabdalla@gmail.com'
];

// ── COHORT START DATE ─────────────────────────────────────────────────────────
// Set this to the date the 30-day challenge officially begins.
// Tasks are locked and day counter won't start until this date at 00:00 local time.
// Format: 'YYYY-MM-DD'
export const COHORT_START_DATE = '2025-06-01'; // ← CHANGE THIS TO YOUR LAUNCH DATE

// Knowledge Base Predefined Content (ElBezawy Challenge Guide)
const DEFAULT_KNOWLEDGE_BASE = [
  {
    id: 'kb-1',
    title: 'ما هو تحدي البزاوي؟',
    content: 'تحدي البزاوي هو تحدٍ يومي مكثف يمتد لـ 30 يوماً متواصلة، يهدف لبناء العادات الإيجابية والالتزام الذاتي. يتكون التحدي من 6 مهام يومية ثابتة يجب إكمالها قبل نهاية وقت كل مهمة.',
    category: 'عام',
    created_at: new Date().toISOString()
  },
  {
    id: 'kb-2',
    title: 'ما هي المهام اليومية الست؟',
    content: 'المهام هي: 1) صلاة الفجر (05:00-07:00). 2) أذكار الصباح (06:00-09:00). 3) تمرين 30 دقيقة (07:00-12:00). 4) قراءة 10 صفحات (10:00-14:00). 5) مراجعة الأهداف (16:00-20:00). 6) قراءة القرآن (20:00-23:59).',
    category: 'المهام',
    created_at: new Date().toISOString()
  },
  {
    id: 'kb-3',
    title: 'كيف يتم احتساب السلسلة (Streak)؟',
    content: 'يجب إكمال كافة المهام اليومية الستة في وقتها المحدد. المهام الروحانية لا تكسر السلسلة إذا فُوِّتت — هي بينك وبين الله. أما المهام البدنية والذهنية التي تتطلب صورة، فإن فواتها يكسر السلسلة.',
    category: 'السلسلة والترتيب',
    created_at: new Date().toISOString()
  },
  {
    id: 'kb-4',
    title: 'كيف أثبت إنجاز المهمة؟',
    content: 'المهام الروحانية (الفجر، الأذكار، القرآن) لا تحتاج إثبات — اضغط على الزر فقط. المهام البدنية والذهنية (تمرين، قراءة، أهداف) تتطلب رفع صورة إثبات مصورة.',
    category: 'الإثباتات',
    created_at: new Date().toISOString()
  },
  {
    id: 'kb-5',
    title: 'ما هي شروط الاستمرار في التحدي؟',
    content: 'أن يبقى حساب المشترك نشطاً من قبل الإدارة، والالتزام برفع صور إثبات حقيقية وغير مزيفة. يحق للإدارة مراجعة الصور وإلغاؤها أو رفضها إذا لم تكن مطابقة للواقع أو مكررة، مما قد يعرض السلسلة للكسر.',
    category: 'الشروط والإدارة',
    created_at: new Date().toISOString()
  },
  {
    id: 'kb-6',
    title: 'من هو المنظم أو المشرف؟',
    content: 'التحدي مستوحى ومقدم من طرف البزاوي (ElBezawi) لرفع الكفاءة وتغيير العادات للمجتمع العربي والشباب الباحث عن الانضباط والتميز والريادة في الحياة اليومية.',
    category: 'عام',
    created_at: new Date().toISOString()
  }
];

// Mock Users and Streaks for interactive presentation
const DEFAULT_MOCK_USERS: any[] = [];
const DEFAULT_MOCK_STREAKS: any[] = [];

// Helper to load or initialize mock database
const getLocalData = (key: string, defaultData: any) => {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(`elbezawi_${key}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse localStorage key:', key, e);
    }
  }
  localStorage.setItem(`elbezawi_${key}`, JSON.stringify(defaultData));
  return defaultData;
};

const setLocalData = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`elbezawi_${key}`, JSON.stringify(data));
  }
};

// Clear stale placeholder mock data from localStorage on first run
export function clearPlaceholderData() {
  if (typeof window === 'undefined') return;
  const users = getLocalData('users', []);
  const placeholderEmails = [
    'ahmed@elbezawy.com', 'yassin@elbezawy.com', 'omar@elbezawy.com',
    'fatima@elbezawy.com', 'sarah@elbezawy.com', 'med.magh@elbezawy.com',
    'khaled.b@elbezawy.com', 'maryam.s@elbezawy.com', 'abdullah@elbezawy.com'
  ];
  const hasPlaceholders = users.some((u: any) => placeholderEmails.includes(u.email));
  if (hasPlaceholders) {
    const realUsers = users.filter((u: any) => !placeholderEmails.includes(u.email));
    localStorage.setItem('elbezawi_users', JSON.stringify(realUsers));
    // Clean up streaks for placeholder users too
    const streaks = getLocalData('streaks', []);
    const placeholderIds = ['usr-1','usr-2','usr-3','usr-4','usr-5','usr-6','usr-7','usr-8','usr-9'];
    const realStreaks = streaks.filter((s: any) => !placeholderIds.includes(s.user_id));
    localStorage.setItem('elbezawi_streaks', JSON.stringify(realStreaks));
    console.log('Cleared placeholder mock data');
  }
}

// Check if a task is locked (deadline passed)
export const isTaskLocked = (deadlineUtcString: string): boolean => {
  const now = new Date();
  const deadline = new Date(deadlineUtcString);
  return now.getTime() > deadline.getTime();
};

// ---------- PERCEPTUAL HASH DUPLICATE DETECTION ----------

/** Compute a 256-bit perceptual hash from a File using a 16x16 canvas */
function computePerceptualHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 16, 16);
      URL.revokeObjectURL(url);
      const imageData = ctx.getImageData(0, 0, 16, 16);
      const pixels: number[] = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        pixels.push(avg);
      }
      const total = pixels.reduce((s, v) => s + v, 0);
      const mean = total / pixels.length;
      let hash = '';
      for (const p of pixels) {
        hash += p >= mean ? '1' : '0';
      }
      resolve(hash);
    };
    img.onerror = () => reject(new Error('Failed to load image for hashing'));
    img.src = url;
  });
}

/** Compute Hamming distance between two binary strings */
function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

/**
 * Check if a photo is a duplicate by comparing perceptual hashes.
 * Stores hashes in localStorage under elbezawi_photo_hashes.
 */
export async function isPhotoDuplicate(
  file: File,
  userId: string
): Promise<{ isDuplicate: boolean; matchedTaskId?: string }> {
  const newHash = await computePerceptualHash(file);
  const stored = localStorage.getItem('elbezawi_photo_hashes');
  const entries: { hash: string; taskId: string; userId: string }[] = stored ? JSON.parse(stored) : [];

  // Filter entries for this user
  const userEntries = entries.filter(e => e.userId === userId);

  for (const entry of userEntries) {
    const dist = hammingDistance(newHash, entry.hash);
    if (dist <= 15) {
      return { isDuplicate: true, matchedTaskId: entry.taskId };
    }
  }

  // Not duplicate — save the hash
  entries.push({ hash: newHash, taskId: '', userId });
  localStorage.setItem('elbezawi_photo_hashes', JSON.stringify(entries));
  return { isDuplicate: false };
}

// ---------- EXIF TIMESTAMP EXTRACTION ----------

/** Extract the EXIF DateTimeOriginal (0x9003) or DateTime (0x0132) from a JPEG file */
export function extractExifDate(file: File): Promise<Date | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = new Uint8Array(reader.result as ArrayBuffer);
      try {
        const date = parseExifDateFromBuffer(buffer);
        resolve(date);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    // Read first 128KB — EXIF header is always near the start
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

function parseExifDateFromBuffer(buffer: Uint8Array): Date | null {
  // Find the EXIF marker 0xFFE1
  for (let i = 0; i < buffer.length - 2; i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xE1) {
      const segment = buffer.subarray(i + 2);
      return parseTiffDate(segment);
    }
  }
  return null;
}

function parseTiffDate(data: Uint8Array): Date | null {
  // Check TIFF header: "II" (little-endian) or "MM" (big-endian)
  if (data[0] !== 0x49 && data[0] !== 0x4D) return null;
  const littleEndian = data[0] === 0x49;
  const get16 = (offset: number) =>
    littleEndian
      ? data[offset] | (data[offset + 1] << 8)
      : (data[offset] << 8) | data[offset + 1];
  const get32 = (offset: number) =>
    littleEndian
      ? data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
      : (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];

  const ifdOffset = get32(4);
  if (ifdOffset <= 0 || ifdOffset > data.length - 2) return null;

  const entries = get16(ifdOffset);
  let foundDate: Date | null = null;

  for (let i = 0; i < entries; i++) {
    const tagStart = ifdOffset + 2 + i * 12;
    if (tagStart + 12 > data.length) break;
    const tag = get16(tagStart);
    // DateTimeOriginal = 0x9003, DateTime = 0x0132
    if (tag === 0x9003 || tag === 0x0132) {
      const type = get16(tagStart + 2);
      const count = get32(tagStart + 4);
      let valuePtr = tagStart + 8;
      // If type is 2 (ASCII string) and count <= 4, value is inline, otherwise it's an offset
      if (type === 2 && count > 4) {
        valuePtr = get32(valuePtr);
      }
      if (valuePtr + count <= data.length + 2) {
        const bytes = data.subarray(valuePtr, valuePtr + count - 1); // Exclude null terminator
        const str = String.fromCharCode(...bytes);
        // Format: "YYYY:MM:DD HH:MM:SS"
        const match = str.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          foundDate = new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]),
            parseInt(match[4]),
            parseInt(match[5]),
            parseInt(match[6])
          );
        }
      }
      break; // We only need the first date found
    }
  }
  return foundDate;
}

// ---------- AI VISION VALIDATION VIA OPENROUTER ----------

/**
 * Validate a photo with OpenRouter using google/gemma-3-12b-it:free.
 * Returns { approved, reason }.
 */
export async function validatePhotoWithAI(
  file: File,
  taskTitle: string
): Promise<{ approved: boolean; reason: string }> {
  if (!OPENROUTER_API_KEY) {
    return { approved: true, reason: 'تعذر التحقق، تم القبول تلقائياً' };
  }

  // Convert file to base64
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const prompt = `You are a challenge proof validator. Task: "${taskTitle}".

Be LENIENT. Approve unless it is OBVIOUSLY fake. Real people upload blurry, dark, or imperfect photos — that is fine.

ONLY reject if:
- The image is completely black, blank, or corrupted (no visible content)
- It is clearly a screenshot OF another photo or a stock image watermark is visible
- The image has zero relation to the task (e.g. a selfie submitted for a workout task with no gym/exercise context at all)

Give benefit of the doubt. A person at a gym, food on a plate, someone outdoors running — all valid even if low quality.

Reply ONLY with valid JSON, no extra text:
{"approved": true/false, "reason": "one sentence reason"}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'ElBezawy Challenge'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('OpenRouter vision API error:', response.status, errText);
      return { approved: true, reason: 'تعذر التحقق، تم القبول تلقائياً' };
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      return { approved: true, reason: 'تعذر التحقق، تم القبول تلقائياً' };
    }

    // Try to parse JSON from the response
    try {
      const result = JSON.parse(content);
      return {
        approved: result.approved === true,
        reason: result.reason || 'تم القبول'
      };
    } catch {
      // Fallback: check if content contains true/false
      const lower = content.toLowerCase();
      if (lower.includes('"approved": false') || lower.includes('false')) {
        return { approved: false, reason: 'لم يتم التحقق من صحة الصورة' };
      }
      return { approved: true, reason: 'تعذر التحقق، تم القبول تلقائياً' };
    }
  } catch (e) {
    console.error('OpenRouter vision call failed:', e);
    return { approved: true, reason: 'تعذر التحقق، تم القبول تلقائياً' };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Local storage active state management
class MockDatabase {
  users: any[];
  tasks: any[];
  streaks: any[];
  knowledge_base: any[];
  currentUser: any | null;

  constructor() {
    this.users = getLocalData('users', DEFAULT_MOCK_USERS);
    this.streaks = getLocalData('streaks', DEFAULT_MOCK_STREAKS);
    this.knowledge_base = getLocalData('knowledge_base', DEFAULT_KNOWLEDGE_BASE);
    this.tasks = getLocalData('tasks', []);

    const savedUser = getLocalData('current_user', null);
    this.currentUser = savedUser;
  }

  save() {
    setLocalData('users', this.users);
    setLocalData('streaks', this.streaks);
    setLocalData('knowledge_base', this.knowledge_base);
    setLocalData('tasks', this.tasks);
    setLocalData('current_user', this.currentUser);
  }

  // User Actions
  registerUser(name: string, email: string, timezone: string) {
    let user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const id = 'usr_' + Math.random().toString(36).substr(2, 9);
      user = {
        id,
        name,
        email,
        whop_id: null,
        timezone,
        created_at: new Date().toISOString(),
        is_admin: ADMIN_EMAILS.includes(email.toLowerCase()),
        is_active: true
      };
      this.users.push(user);

      const streak = {
        id: 'str_' + Math.random().toString(36).substr(2, 9),
        user_id: id,
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
        total_completed: 0
      };
      this.streaks.push(streak);
    }
    
    this.currentUser = user;
    this.save();
    return user;
  }

  logout() {
    this.currentUser = null;
    this.save();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getStreak(userId: string) {
    return this.streaks.find(s => s.user_id === userId) || {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      total_completed: 0
    };
  }

  getDayNumber(user: any): number {
    // Day number is based on COHORT start date, not user registration date
    const cohortStart = new Date(COHORT_START_DATE + 'T00:00:00').getTime();
    const now = new Date().getTime();
    if (now < cohortStart) return 1; // Challenge hasn't started yet
    const diffDays = Math.floor((now - cohortStart) / (24 * 3600 * 1000)) + 1;
    return Math.min(30, Math.max(1, diffDays));
  }

  getOrCreateTodayTasks(userId: string, _timezone: string) {
    const userTasks = this.tasks.filter(t => t.user_id === userId);
    const user = this.users.find(u => u.id === userId);
    const dayNumber = user ? this.getDayNumber(user) : 1;
    const todayTasks = userTasks.filter(t => t.day_number === dayNumber);
    const newFormatTasks = todayTasks.filter(t => t.task_id);

    const hasAllCore = (CORE_TASK_IDS as readonly string[]).every(id =>
      newFormatTasks.some((t: any) => t.task_id === id)
    );
    const ALL_VALID_MOCK = [...CORE_TASK_IDS, ...BONUS_TASK_IDS] as string[];
    const hasNoStaleMock = newFormatTasks.every((t: any) => ALL_VALID_MOCK.includes(t.task_id));
    if (hasAllCore && hasNoStaleMock) return newFormatTasks;
    // Stale (e.g. 'reading' exists) — purge and recreate
    this.tasks = this.tasks.filter(t => !(t.user_id === userId && t.day_number === dayNumber));

    // Generate tasks (5 core + 2 bonus) with Adhan-synced windows
    const newTasks = getDailyTasks().map(def => ({
      id: `task_${userId}_d${dayNumber}_${def.id}_${Math.random().toString(36).substr(2, 5)}`,
      user_id: userId,
      day_number: dayNumber,
      task_id: def.id,
      title_ar: def.title_ar,
      type: def.type,
      window_start: def.window_start,
      window_end: def.window_end,
      requires_photo: def.requires_photo,
      note_ar: def.note_ar,
      completed: false,
      completed_at: null,
      photo_url: null,
      rejected: false,
      rejection_reason: null,
      created_at: new Date().toISOString()
    }));

    this.tasks.push(...newTasks);
    this.save();
    return newTasks;
  }

  completeTask(taskId: string, photoUrl: string | null) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    const task = this.tasks[taskIndex];

    // For physical/mental tasks, photo is required
    if (task.requires_photo && !photoUrl) {
      return { error: 'هذه المهمة تتطلب صورة إثبات!' };
    }

    task.completed = true;
    task.completed_at = new Date().toISOString();
    task.photo_url = photoUrl || null;

    this.tasks[taskIndex] = task;

    this.checkAndUpdateStreak(task.user_id, task.day_number);

    this.save();
    return task;
  }

  checkAndUpdateStreak(userId: string, dayNumber: number) {
    const userTasks = this.tasks.filter(t => t.user_id === userId && t.day_number === dayNumber);
    const coreTasks = userTasks.filter(t => (CORE_TASK_IDS as readonly string[]).includes(t.task_id));
    const allCompleted = coreTasks.length === 9 && coreTasks.every(t => t.completed);

    if (allCompleted) {
      const streakIndex = this.streaks.findIndex(s => s.user_id === userId);
      if (streakIndex !== -1) {
        const streak = this.streaks[streakIndex];
        const todayStr = new Date().toLocaleDateString('sv');

        if (streak.last_completed_date !== todayStr) {
          streak.current_streak += 1;
          streak.longest_streak = Math.max(streak.longest_streak, streak.current_streak);
          streak.last_completed_date = todayStr;
          streak.total_completed += userTasks.filter(t => t.completed).length;
          this.streaks[streakIndex] = streak;
        }
      }
    }
  }

  /** Check if any requires_photo task has expired and break streak if so */
  checkExpiredTasksAndBreakStreak(userId: string, dayNumber: number) {
    const now = new Date();
    const userTasks = this.tasks.filter(t => t.user_id === userId && t.day_number === dayNumber);
    
    for (const task of userTasks) {
      if (task.requires_photo && !task.completed && !task.rejected) {
        const [eh, em] = task.window_end.split(':').map(Number);
        const end = new Date();
        end.setHours(eh, em, 59, 999);
        if (now > end) {
          const streakIndex = this.streaks.findIndex(s => s.user_id === userId);
          if (streakIndex !== -1 && this.streaks[streakIndex].current_streak > 0) {
            this.streaks[streakIndex].current_streak = 0;
            this.save();
          }
          return;
        }
      }
    }
  }

  adminOverrideTask(taskId: string, completed: boolean, photoUrl?: string) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    const task = this.tasks[taskIndex];
    task.completed = completed;
    task.completed_at = completed ? new Date().toISOString() : null;
    if (photoUrl !== undefined) {
      task.photo_url = photoUrl;
    }
    this.tasks[taskIndex] = task;

    const userId = task.user_id;
    const dayNumber = task.day_number;
    this.checkAndUpdateStreak(userId, dayNumber);
    
    this.save();
    return true;
  }

  toggleUserActive(userId: string) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    this.users[userIndex].is_active = !this.users[userIndex].is_active;
    this.save();
    return this.users[userIndex];
  }

  getLeaderboard() {
    return this.users
      .filter(u => u.is_active && !u.is_admin)
      .map(u => {
        const streak = this.getStreak(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          timezone: u.timezone,
          day_number: this.getDayNumber(u),
          current_streak: streak.current_streak,
          longest_streak: streak.longest_streak,
          total_completed: streak.total_completed
        };
      })
      .sort((a, b) => b.current_streak - a.current_streak);
  }

  /** Get all photo submissions across all users for admin review */
  getPhotoSubmissions() {
    return this.tasks
      .filter(t => t.photo_url && t.requires_photo)
      .map(t => {
        const user = this.users.find(u => u.id === t.user_id);
        return {
          ...t,
          user_name: user?.name || 'غير معروف',
          user_email: user?.email || ''
        };
      })
      .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime());
  }

  /** Reject a photo submission — mark task incomplete, break streak, save reason */
  rejectPhoto(taskId: string, reason: string) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    const task = this.tasks[taskIndex];
    task.completed = false;
    task.completed_at = null;
    task.photo_url = null;
    task.rejected = true;
    task.rejection_reason = reason;

    this.tasks[taskIndex] = task;

    // Break streak for this user
    const streakIndex = this.streaks.findIndex(s => s.user_id === task.user_id);
    if (streakIndex !== -1) {
      this.streaks[streakIndex].current_streak = 0;
    }

    this.save();
    return true;
  }

  updateUserTimezone(userId: string, timezone: string): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.timezone = timezone;
      this.save();
    }
  }

  addKnowledgeItem(title: string, content: string, category: string) {
    const item = {
      id: 'kb_' + Math.random().toString(36).substr(2, 9),
      title,
      content,
      category,
      created_at: new Date().toISOString()
    };
    this.knowledge_base.push(item);
    this.save();
    return item;
  }
}

export const mockDb = new MockDatabase();

// Supabase helper API proxies
export const db = {
  loginWithWhop: async (whopUser: { id: string; name: string; email: string; picture?: string | null }) => {
    if (supabase) {
      try {
        // Look up by whop_id first, then fall back to email (covers admin bypass logins)
        let { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('whop_id', whopUser.id)
          .maybeSingle();

        if (!existing) {
          const { data: byEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', whopUser.email)
            .maybeSingle();
          existing = byEmail;
          // Backfill whop_id if found by email
          if (existing && whopUser.id) {
            await supabase.from('users').update({ whop_id: whopUser.id }).eq('id', existing.id);
          }
        }

        if (existing) {
          // Sync name + ALWAYS correct is_admin based on current email list
          const hasCustomName = !!localStorage.getItem(`elbezawi_display_name_${existing.id}`);
          const isAdmin = ADMIN_EMAILS.includes(whopUser.email.toLowerCase());
          const updatePayload: any = { email: whopUser.email, is_admin: isAdmin };
          if (!hasCustomName) updatePayload.name = whopUser.name;
          await supabase.from('users').update(updatePayload).eq('id', existing.id);
          if (!hasCustomName) existing.name = whopUser.name;
          existing.is_admin = isAdmin;

          // Always nuke duplicate rows for this email
          const { data: dupes } = await supabase
            .from('users')
            .select('id')
            .eq('email', whopUser.email)
            .neq('id', existing.id);
          if (dupes && dupes.length > 0) {
            const dupeIds = dupes.map((d: any) => d.id);
            await supabase.from('tasks').delete().in('user_id', dupeIds);
            await supabase.from('streaks').delete().in('user_id', dupeIds);
            await supabase.from('users').delete().in('id', dupeIds);
            console.log(`🧹 Nuked ${dupeIds.length} duplicate user rows for ${whopUser.email}`);
          }

          mockDb.currentUser = existing;
          mockDb.save();
          return existing;
        }

        const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
        const newUser = {
          id: userId,
          name: whopUser.name,
          email: whopUser.email,
          whop_id: whopUser.id,
          timezone: detectTimezone(),
          is_admin: ADMIN_EMAILS.includes(whopUser.email.toLowerCase()),
          is_active: true,
          created_at: new Date().toISOString(),
        };

        await supabase.from('users').insert([newUser]);
        await supabase.from('streaks').insert([{
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_completed_date: null,
          total_completed: 0,
        }]);

        mockDb.currentUser = newUser;
        mockDb.users.push(newUser);
        mockDb.save();
        return newUser;
      } catch (e) {
        console.warn('Supabase loginWithWhop failed, using mock:', e);
      }
    }

    // Mock fallback — match by whop_id OR email to prevent duplicates
    let user = mockDb.users.find((u: any) => u.whop_id === whopUser.id || u.email === whopUser.email);
    if (!user) {
      user = mockDb.registerUser(whopUser.name, whopUser.email, detectTimezone());
    }
    user.whop_id = whopUser.id;
    user.name = whopUser.name;
    user.email = whopUser.email;
    mockDb.currentUser = user;
    mockDb.save();
    return user;
  },

  getCurrentUser: async () => {
    if (supabase) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return mockDb.getCurrentUser();
        }
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error || !data) {
          return mockDb.getCurrentUser();
        }
        return data;
      } catch (e) {
        return mockDb.getCurrentUser();
      }
    }
    return mockDb.getCurrentUser();
  },

  register: async (name: string, email: string, timezone: string) => {
    if (supabase) {
      try {
        const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
        const userObj = {
          id: userId,
          name,
          email,
          timezone,
          created_at: new Date().toISOString(),
          is_admin: ADMIN_EMAILS.includes(email.toLowerCase()),
          is_active: true
        };
        
        const { data, error } = await supabase
          .from('users')
          .insert([userObj])
          .select()
          .single();

        if (error) {
          console.error("Supabase insert error, falling back:", error);
          return mockDb.registerUser(name, email, timezone);
        }

        await supabase.from('streaks').insert([{
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_completed_date: null,
          total_completed: 0
        }]);

        mockDb.currentUser = userObj;
        mockDb.users.push(userObj);
        mockDb.save();

        return data;
      } catch (e) {
        return mockDb.registerUser(name, email, timezone);
      }
    }
    return mockDb.registerUser(name, email, timezone);
  },

  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    mockDb.logout();
  },

  getOrCreateTodayTasks: async (userId: string, timezone: string) => {
    if (supabase) {
      try {
        const userObj = mockDb.users.find(u => u.id === userId) || mockDb.currentUser;
        const dayNumber = userObj ? mockDb.getDayNumber(userObj) : 1;

        const { data: existing, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('day_number', dayNumber);

        const withTaskId = existing?.filter((t: any) => t.task_id) || [];
        const hasAllCore = (CORE_TASK_IDS as readonly string[]).every(id =>
          withTaskId.some((t: any) => t.task_id === id)
        );
        // Only delete stale if NONE of the core tasks exist (don't nuke on partial mismatch)
        if (!error && hasAllCore) return withTaskId;
        // Missing core tasks — delete old and recreate
        if (withTaskId.length > 0) {
          await supabase.from('tasks').delete().eq('user_id', userId).eq('day_number', dayNumber);
        }

        const newTasks = getDailyTasks().map((def) => ({
          user_id: userId,
          day_number: dayNumber,
          task_id: def.id,
          title_ar: def.title_ar,
          type: def.type,
          window_start: def.window_start,
          window_end: def.window_end,
          requires_photo: def.requires_photo,
          note_ar: def.note_ar,
          completed: false,
          completed_at: null,
          photo_url: null,
          rejected: false,
          rejection_reason: null,
        }));

        const { data: inserted, error: insError } = await supabase
          .from('tasks')
          .insert(newTasks)
          .select();

        if (!insError && inserted) {
          return inserted;
        }
      } catch (e) {
        console.warn("Supabase tasks fetch fail, using mock:", e);
      }
    }
    return mockDb.getOrCreateTodayTasks(userId, timezone);
  },

  completeTask: async (taskId: string, photoFile: File | string | null, userId: string, dayNumber: number, requiresPhotoOverride?: boolean) => {
    // First, determine if this task requires a photo
    let requiresPhoto = requiresPhotoOverride ?? true;
    let taskTitle = 'المهمة';
    
    if (requiresPhotoOverride === undefined) {
      // Only hit the DB if caller didn't tell us
      if (supabase) {
        try {
          const { data: taskRow } = await supabase.from('tasks').select('*').eq('id', taskId).single();
          if (taskRow) {
            requiresPhoto = taskRow.requires_photo;
            taskTitle = taskRow.title_ar;
          }
        } catch (e) {
          const taskRow = mockDb.tasks.find(t => t.id === taskId);
          if (taskRow) {
            requiresPhoto = taskRow.requires_photo;
            taskTitle = taskRow.title_ar;
          }
        }
      } else {
        const taskRow = mockDb.tasks.find(t => t.id === taskId);
        if (taskRow) {
          requiresPhoto = taskRow.requires_photo;
          taskTitle = taskRow.title_ar;
        }
      }
    } else {
      // Still get taskTitle from DB if possible
      if (supabase) {
        try {
          const { data: taskRow } = await supabase.from('tasks').select('title_ar').eq('id', taskId).single();
          if (taskRow) taskTitle = taskRow.title_ar;
        } catch { /* silent */ }
      } else {
        const taskRow = mockDb.tasks.find(t => t.id === taskId);
        if (taskRow) taskTitle = taskRow.title_ar;
      }
    }

    let photoUrl: string | null = null;

    if (requiresPhoto) {
      if (!photoFile) {
        return { error: 'هذه المهمة تتطلب صورة إثبات!' };
      }

      if (photoFile instanceof File) {
        // 1️⃣ Perceptual hash duplicate check (skip silently if hashing fails)
        try {
          const dupResult = await isPhotoDuplicate(photoFile, userId);
          if (dupResult.isDuplicate) {
            return { error: 'تم رفض الصورة — يبدو أنك رفعت هذه الصورة من قبل. يجب أن تكون كل إثبات صورة جديدة ومختلفة.' };
          }
        } catch (hashErr) {
          console.warn('Perceptual hash failed, skipping duplicate check:', hashErr);
        }

        // 2️⃣ EXIF timestamp check
        try {
          const exifDate = await extractExifDate(photoFile);
          if (exifDate) {
            const now = new Date().getTime();
            const diffHours = (now - exifDate.getTime()) / (1000 * 60 * 60);
            if (diffHours > 24) {
              return { error: 'تم رفض الصورة — تاريخ التقاط الصورة قديم. يجب أن تلتقط الصورة اليوم لإثبات إنجاز المهمة.' };
            }
          }
        } catch (e) {
          // No EXIF data — proceed
        }

        // 3️⃣ AI vision validation via OpenRouter (silently skip if no API key)
        if (OPENROUTER_API_KEY) {
          const aiResult = await validatePhotoWithAI(photoFile, taskTitle);
          if (!aiResult.approved) {
            const arMsg = `ظننت أنك تستطيع خداعنا؟ 😏 ارفع صورة حقيقية. (${aiResult.reason})`;
            const enMsg = `You thought you could deceive us? 😏 Upload a valid photo. (${aiResult.reason})`;
            return { error: arMsg, error_en: enMsg };
          }
        }

        // Upload to Supabase Storage or fallback to base64
        if (supabase) {
          try {
            const fileExt = photoFile.name.split('.').pop() || 'jpg';
            const fileName = `${userId}_d${dayNumber}_${Date.now()}.${fileExt}`;
            const { data, error } = await supabase.storage
              .from('proofs')
              .upload(fileName, photoFile, { upsert: true });

            if (error) {
              console.warn('Supabase storage error:', error.message, '— falling back to base64');
            } else if (data) {
              const { data: urlData } = supabase.storage
                .from('proofs')
                .getPublicUrl(fileName);
              photoUrl = urlData.publicUrl;
            }
          } catch (e) {
            console.warn('Supabase storage upload failed, using base64:', e);
          }
        }

        // Always fall back to base64 if no URL yet
        if (!photoUrl) {
          photoUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(photoFile as File);
          });
        }
      } else {
        photoUrl = photoFile as string;
      }
    }
    // Spiritual tasks: photoUrl stays null, no validation needed

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
            photo_url: photoUrl
          })
          .eq('id', taskId)
          .select()
          .single();

        if (!error && data) {
          const { data: allDayTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('day_number', dayNumber);

          const coreDayTasks = allDayTasks?.filter((t: any) =>
              (CORE_TASK_IDS as readonly string[]).includes(t.task_id)
            ) || [];
          if (coreDayTasks.length === CORE_TASK_IDS.length && coreDayTasks.every((t: any) => t.completed)) {
            const { data: curStreak } = await supabase
              .from('streaks')
              .select('*')
              .eq('user_id', userId)
              .single();

            if (curStreak) {
              const todayStr = new Date().toLocaleDateString('sv');
              if (curStreak.last_completed_date !== todayStr) {
                const updatedStreak = curStreak.current_streak + 1;
                const updatedLongest = Math.max(curStreak.longest_streak, updatedStreak);
                await supabase
                  .from('streaks')
                  .update({
                    current_streak: updatedStreak,
                    longest_streak: updatedLongest,
                    last_completed_date: todayStr,
                    total_completed: curStreak.total_completed + (allDayTasks?.filter((t: any) => t.completed).length || 5)
                  })
                  .eq('user_id', userId);
              }
            }
          }
          return data;
        }
      } catch (e) {
        console.warn("Supabase task complete fail, falling back to mock:", e);
      }
    }

    return mockDb.completeTask(taskId, photoUrl);
  },

  updateDisplayName: async (userId: string, displayName: string) => {
    // Store in localStorage always (guaranteed to work)
    localStorage.setItem(`elbezawi_display_name_${userId}`, displayName);
    // Also try to update Supabase name field
    if (supabase) {
      try {
        await supabase.from('users').update({ name: displayName }).eq('id', userId);
        // Update mockDb cache too
        const u = mockDb.users.find((u: any) => u.id === userId);
        if (u) { u.name = displayName; mockDb.save(); }
      } catch (e) {
        console.warn('Could not update display name in Supabase:', e);
      }
    } else {
      const u = mockDb.users.find((u: any) => u.id === userId);
      if (u) { u.name = displayName; mockDb.save(); }
    }
  },

  getDisplayName: (userId: string, fallback: string): string => {
    try {
      return localStorage.getItem(`elbezawi_display_name_${userId}`) || fallback;
    } catch {
      return fallback;
    }
  },

  getLeaderboard: async () => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            timezone,
            created_at,
            streaks (
              current_streak,
              longest_streak,
              total_completed
            )
          `)
          .eq('is_active', true)
          .eq('is_admin', false);

        if (!error && data) {
          const formatted = data.map((u: any) => {
            const streakObj = u.streaks?.[0] || { current_streak: 0, longest_streak: 0, total_completed: 0 };
            
            const cohortStart = new Date(COHORT_START_DATE + 'T00:00:00').getTime();
            const now = new Date().getTime();
            const diffDays = now < cohortStart ? 0 : Math.floor((now - cohortStart) / (24 * 3600 * 1000)) + 1;
            const day_number = Math.min(30, Math.max(1, diffDays));

            return {
              id: u.id,
              name: u.name,
              email: u.email,
              timezone: u.timezone,
              day_number,
              current_streak: streakObj.current_streak,
              longest_streak: streakObj.longest_streak,
              total_completed: streakObj.total_completed
            };
          });

          return formatted.sort((a, b) => b.current_streak - a.current_streak);
        }
      } catch (e) {
        console.warn("Supabase leaderboard fetch fail, using mock:", e);
      }
    }
    return mockDb.getLeaderboard();
  },

  adminGetUsers: async () => {
    if (supabase) {
      try {
        const { data: users, error: userErr } = await supabase
          .from('users')
          .select('*')
          .eq('is_admin', false); // never show admins in admin panel
        const { data: streaks } = await supabase.from('streaks').select('*');
        const { data: tasks } = await supabase.from('tasks').select('*');

        if (!userErr && users) {
          // Dedup by email — keep the one with most tasks (most active)
          const seenEmails = new Map<string, any>();
          for (const u of users) {
            const uTasks = tasks?.filter((t: any) => t.user_id === u.id) || [];
            const existing = seenEmails.get(u.email);
            if (!existing || uTasks.length > (tasks?.filter((t: any) => t.user_id === existing.id) || []).length) {
              seenEmails.set(u.email, u);
            }
          }
          const dedupedUsers = Array.from(seenEmails.values());

          const cohortStart = new Date(COHORT_START_DATE + 'T00:00:00').getTime();
          const now = new Date().getTime();
          const diffDays = now < cohortStart ? 0 : Math.floor((now - cohortStart) / (24 * 3600 * 1000)) + 1;
          const day_number = Math.min(30, Math.max(1, diffDays));

          return dedupedUsers.map((u: any) => {
            const streak = streaks?.find((s: any) => s.user_id === u.id) || { current_streak: 0, longest_streak: 0, total_completed: 0 };
            const uTasks = tasks?.filter((t: any) => t.user_id === u.id) || [];
            const totalTasksCount = uTasks.length;
            const completedCount = uTasks.filter((t: any) => t.completed).length;
            const completionRate = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
            return {
              ...u,
              day_number,
              current_streak: streak.current_streak,
              longest_streak: streak.longest_streak,
              completion_rate: completionRate,
              tasks: uTasks
            };
          });
        }
      } catch (e) {
        console.warn("Supabase admin users read fail, using mock:", e);
      }
    }

    return mockDb.users.map(u => {
      const streak = mockDb.getStreak(u.id);
      const uTasks = mockDb.tasks.filter(t => t.user_id === u.id);
      
      const totalTasksCount = uTasks.length;
      const completedCount = uTasks.filter(t => t.completed).length;
      const completionRate = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
      
      return {
        ...u,
        day_number: mockDb.getDayNumber(u),
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        completion_rate: completionRate,
        tasks: uTasks
      };
    });
  },

  adminToggleUser: async (userId: string) => {
    if (supabase) {
      try {
        const user = mockDb.users.find(u => u.id === userId);
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .update({ is_active: !user.is_active })
            .eq('id', userId)
            .select()
            .single();
          if (!error && data) {
            const idx = mockDb.users.findIndex(u => u.id === userId);
            mockDb.users[idx].is_active = data.is_active;
            mockDb.save();
            return data;
          }
        }
      } catch (e) {
        console.warn("Supabase admin toggle fail:", e);
      }
    }
    return mockDb.toggleUserActive(userId);
  },

  adminOverrideTask: async (taskId: string, completed: boolean, photoUrl?: string) => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            ...(photoUrl !== undefined ? { photo_url: photoUrl } : {})
          })
          .eq('id', taskId);
        
        if (!error) {
          const taskObj = mockDb.tasks.find(t => t.id === taskId);
          if (taskObj) {
            mockDb.adminOverrideTask(taskId, completed, photoUrl);
            return true;
          }
        }
      } catch (e) {
        console.warn("Supabase admin override fail:", e);
      }
    }
    return mockDb.adminOverrideTask(taskId, completed, photoUrl);
  },

  /** Get all photo submissions for admin review */
  adminGetPhotoSubmissions: async () => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, users(name, email)')
          .not('photo_url', 'is', null)
          .eq('requires_photo', true);
        if (!error && data) {
          return data.map((t: any) => ({
            ...t,
            user_name: t.users?.name || 'غير معروف',
            user_email: t.users?.email || ''
          }));
        }
      } catch (e) {
        console.warn("Supabase photo submissions fetch fail:", e);
      }
    }
    return mockDb.getPhotoSubmissions();
  },

  /** Reject a photo submission */
  adminRejectPhoto: async (taskId: string, reason: string) => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            completed: false,
            completed_at: null,
            photo_url: null,
            rejected: true,
            rejection_reason: reason
          })
          .eq('id', taskId);
        if (!error) {
          mockDb.rejectPhoto(taskId, reason);
          return true;
        }
      } catch (e) {
        console.warn("Supabase reject photo fail:", e);
      }
    }
    return mockDb.rejectPhoto(taskId, reason);
  },

  getKnowledgeBase: async () => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('knowledge_base').select('*');
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn("Supabase KB load fail:", e);
      }
    }
    return mockDb.knowledge_base;
  },

  updateUserTimezone: async (userId: string, timezone: string) => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ timezone })
          .eq('id', userId);
        if (!error) {
          mockDb.updateUserTimezone(userId, timezone);
          return true;
        }
      } catch (e) {
        console.warn("Supabase timezone update fail:", e);
      }
    }
    mockDb.updateUserTimezone(userId, timezone);
    return true;
  }
};

// Chat widget API helper to OpenRouter
export const callOpenRouter = async (messages: { role: string; content: string }[], _knowledgeContext?: string) => {
  const lang = (typeof window !== 'undefined' ? localStorage.getItem('elbezawi_lang') : 'ar') as 'ar' | 'en';
  const isAr = lang !== 'en';

  const SYSTEM_PROMPT = `
أنت مساعد تحدي البزاوي الذكي — مدرب عقلية متخصص مبني على محتوى برنامج ElBezawy الحصري.

## هويتك:
- اسمك: مساعد البزاوي
- أسلوبك: مباشر، عملي، بدون مبالغة
- تجيب بنفس لغة المستخدم (عربي←عربي، إنجليزي←إنجليزي)
- ردودك مختصرة وعملية — لا خطب طويلة (3-5 جمل كحد أقصى)

## التحدي — 9 مهام أساسية + 2 إضافية:
المهام الروحانية (بينك وبين الله — بدون صورة): صلاة الفجر، أذكار الصباح، الظهر، العصر، المغرب، العشاء، قراءة القرآن
المهام البدنية/الذهنية (تحتاج صورة إثبات): تمرين 30 دقيقة (طوال اليوم)، مراجعة الأهداف (بعد العصر)
مهام إضافية (نقاط إضافية): قيام الليل ⭐، السنن الرواتب ⭐ (2 قبل الفجر، 4+2 قبل/بعد الظهر، 2 بعد المغرب، 2 بعد العشاء)
الهدف: 30 يوماً متواصلة — كسر السلسلة = الرجوع للصفر

## وحدات العقلية:

### الوحدة 2 — رؤية العادة المؤجلة:
الفرق: "أنا كسول" = حكم عام. "أنا أؤجل" = سلوك يمكن تغييره.
التأجيل يبدأ بجملة ناعمة: "سأبدأ غداً". الاعتراف بالنمط ليس فشلاً — هو بداية التحرر منه.

### الوحدة 3 — كسر وهم الاستعداد الكامل:
لا تحتاج أن تكون جاهزاً بالكامل. السؤال الصحيح: "ما هو الفعل الصغير الواضح الذي يمكنني فعله الآن؟"

### الوحدة 4 — أول خطوة قابلة للتنفيذ:
اختر خطوة واحدة صغيرة ومحددة يمكنك تنفيذها اليوم. اختبرها: "هل أستطيع فعلها الآن دون تجهيز طويل؟"

### الوحدة 5 — تنفيذ البداية دون تفاوض داخلي:
لا تسأل "كيف أقتنع؟" — اسأل "ما الذي سأفعله الآن حتى لو لم أكن مقتنعاً بالكامل؟"

## قواعد الرد:
1. لا محاضرات طويلة — 3-5 جمل عملية كحد أقصى
2. اربط المشاكل الشخصية بمحتوى الوحدات
3. أجب على أسئلة المهام بدقة ومباشرة
4. تكلم بثقة — لا تقل "كما ذكر البزاوي"
`.trim();

  // Free models on OpenRouter — try in order
  const FREE_MODELS = [
    'deepseek/deepseek-v4-flash:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ];

  if (OPENROUTER_API_KEY) {
    for (const model of FREE_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://elbezawy-challenge.vercel.app',
            'X-Title': 'ElBezawy Challenge'
          },
          body: JSON.stringify({
            model,
            max_tokens: 512,
            temperature: 0.7,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-8) // last 8 messages for context window
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply) return reply;
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`OpenRouter ${model} → ${response.status}: ${errText.slice(0, 200)}`);
          continue; // always try next model
        }

      } catch (e) {
        console.warn(`OpenRouter model ${model} failed:`, e);
        continue;
      }
    }
  }

  // Dumb fallback if all models fail or no API key
  return isAr
    ? 'عذراً، المساعد الذكي غير متاح حالياً. حاول مرة أخرى بعد قليل.'
    : 'Sorry, the AI assistant is temporarily unavailable. Try again in a moment.';
};