import { createClient } from '@supabase/supabase-js';
import { DAILY_TASKS, detectTimezone } from './tasks';

// Environment variables detection
// Vite loads from import.meta.env, we support standard VITE_ and NEXT_ prefixes
const metaAny = import.meta as any;
const SUPABASE_URL = 
  metaAny.env?.VITE_SUPABASE_URL || 
  metaAny.env?.NEXT_PUBLIC_SUPABASE_URL || 
  (window as any)._SUPABASE_URL || '';

const SUPABASE_ANON_KEY = 
  metaAny.env?.VITE_SUPABASE_ANON_KEY || 
  metaAny.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  (window as any)._SUPABASE_ANON_KEY || '';

const OPENROUTER_API_KEY = 
  metaAny.env?.VITE_OPENROUTER_API_KEY || 
  metaAny.env?.OPENROUTER_API_KEY || 
  (window as any)._OPENROUTER_API_KEY || '';

// Initialize real Supabase client if keys are provided
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// Hardcoded admin whitelist array
const ADMIN_EMAILS = [
  'admin@elbezawy.com',
  'yunus@elbezawy.com',
  'zq8th@elbezawy.com'
];

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
const DEFAULT_MOCK_USERS = [
  { id: 'usr-1', name: 'أحمد الهاشمي', email: 'ahmed@elbezawy.com', whop_id: 'whop_ahmed', timezone: 'Asia/Riyadh', created_at: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(), is_admin: true, is_active: true },
  { id: 'usr-2', name: 'ياسين بن علي', email: 'yassin@elbezawy.com', whop_id: 'whop_yassin', timezone: 'Africa/Casablanca', created_at: new Date(Date.now() - 24 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-3', name: 'عمر الفاروق', email: 'omar@elbezawy.com', whop_id: 'whop_omar', timezone: 'Asia/Dubai', created_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-4', name: 'فاطمة الزهراء', email: 'fatima@elbezawy.com', whop_id: 'whop_fatima', timezone: 'Africa/Cairo', created_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-5', name: 'سارة العتيبي', email: 'sarah@elbezawy.com', whop_id: null, timezone: 'Asia/Riyadh', created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-6', name: 'محمد المغربي', email: 'med.magh@elbezawy.com', whop_id: null, timezone: 'Africa/Casablanca', created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-7', name: 'خالد البلوشي', email: 'khaled.b@elbezawy.com', whop_id: null, timezone: 'Asia/Muscat', created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-8', name: 'مريم الشحي', email: 'maryam.s@elbezawy.com', whop_id: null, timezone: 'Asia/Dubai', created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
  { id: 'usr-9', name: 'عبد الله الجزائري', email: 'abdullah@elbezawy.com', whop_id: null, timezone: 'Africa/Algiers', created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), is_admin: false, is_active: true },
];

const DEFAULT_MOCK_STREAKS = [
  { id: 'str-1', user_id: 'usr-1', current_streak: 28, longest_streak: 28, last_completed_date: new Date(Date.now() - 12 * 3600 * 1000).toISOString().split('T')[0], total_completed: 168 },
  { id: 'str-2', user_id: 'usr-2', current_streak: 24, longest_streak: 24, last_completed_date: new Date(Date.now() - 14 * 3600 * 1000).toISOString().split('T')[0], total_completed: 144 },
  { id: 'str-3', user_id: 'usr-3', current_streak: 21, longest_streak: 21, last_completed_date: new Date(Date.now() - 15 * 3600 * 1000).toISOString().split('T')[0], total_completed: 126 },
  { id: 'str-4', user_id: 'usr-4', current_streak: 18, longest_streak: 18, last_completed_date: new Date(Date.now() - 18 * 3600 * 1000).toISOString().split('T')[0], total_completed: 108 },
  { id: 'str-5', user_id: 'usr-5', current_streak: 15, longest_streak: 15, last_completed_date: new Date(Date.now() - 20 * 3600 * 1000).toISOString().split('T')[0], total_completed: 90 },
  { id: 'str-6', user_id: 'usr-6', current_streak: 12, longest_streak: 12, last_completed_date: new Date(Date.now() - 22 * 3600 * 1000).toISOString().split('T')[0], total_completed: 72 },
  { id: 'str-7', user_id: 'usr-7', current_streak: 8, longest_streak: 8, last_completed_date: new Date(Date.now() - 21 * 3600 * 1000).toISOString().split('T')[0], total_completed: 48 },
  { id: 'str-8', user_id: 'usr-8', current_streak: 0, longest_streak: 5, last_completed_date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], total_completed: 24 },
  { id: 'str-9', user_id: 'usr-9', current_streak: 3, longest_streak: 3, last_completed_date: new Date(Date.now() - 16 * 3600 * 1000).toISOString().split('T')[0], total_completed: 18 },
];

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
 * Validate a photo with OpenRouter using nvidia/nemotron-nano-12b-v2-vl:free.
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

  const prompt = `أنت نظام تحقق من صحة إثباتات مهام التحدي. مهمتك: قرر إذا كانت هذه الصورة دليلاً حقيقياً على إنجاز المهمة التالية.
المهمة: ${taskTitle}
قواعد الرفض الصارمة:

ارفض إذا كانت الصورة لقطة شاشة (screenshot) لصورة أخرى
ارفض إذا كانت الصورة واضح أنها من الإنترنت أو مخزنة مسبقاً
ارفض إذا لا تتعلق الصورة بموضوع المهمة المذكورة بأي شكل
ارفض إذا كانت الصورة فارغة، سوداء، أو لا تحتوي على محتوى واضح

أجب فقط بـ JSON بهذا الشكل الدقيق بدون أي نص إضافي:
{"approved": true/false, "reason": "سبب القرار بجملة واحدة"}`;

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
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
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
    const start = new Date(user.created_at).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - start) / (24 * 3600 * 1000)) + 1;
    return Math.min(30, Math.max(1, diffDays));
  }

  getOrCreateTodayTasks(userId: string, _timezone: string) {
    const userTasks = this.tasks.filter(t => t.user_id === userId);
    const user = this.users.find(u => u.id === userId);
    const dayNumber = user ? this.getDayNumber(user) : 1;
    const todayTasks = userTasks.filter(t => t.day_number === dayNumber);
    const newFormatTasks = todayTasks.filter(t => t.task_id);

    if (newFormatTasks.length === 6) {
      return newFormatTasks;
    }

    // Generate 6 new tasks with window-based structure
    const newTasks = DAILY_TASKS.map(def => ({
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
    // All 6 tasks must be completed to increment streak
    const allCompleted = userTasks.length === 6 && userTasks.every(t => t.completed);

    if (allCompleted) {
      const streakIndex = this.streaks.findIndex(s => s.user_id === userId);
      if (streakIndex !== -1) {
        const streak = this.streaks[streakIndex];
        const todayStr = new Date().toLocaleDateString('sv');

        if (streak.last_completed_date !== todayStr) {
          streak.current_streak += 1;
          streak.longest_streak = Math.max(streak.longest_streak, streak.current_streak);
          streak.last_completed_date = todayStr;
          streak.total_completed += 6;
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
      .filter(u => u.is_active)
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
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('whop_id', whopUser.id)
          .maybeSingle();

        if (existing) {
          await supabase.from('users').update({
            name: whopUser.name,
            email: whopUser.email,
          }).eq('id', existing.id);
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

    // Mock fallback
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

        const newFormatCount = existing?.filter((t: any) => t.task_id).length || 0;
        if (!error && existing && newFormatCount === 6) {
          return existing.filter((t: any) => t.task_id);
        }

        const newTasks = DAILY_TASKS.map((def) => ({
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

  completeTask: async (taskId: string, photoFile: File | string | null, userId: string, dayNumber: number) => {
    // First, determine if this task requires a photo
    let requiresPhoto = true;
    let taskTitle = 'المهمة';
    
    if (supabase) {
      try {
        const { data: taskRow } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (taskRow) {
          requiresPhoto = taskRow.requires_photo;
          taskTitle = taskRow.title_ar;
        }
      } catch (e) {
        // fallback to mock
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
            return { error: `رُفضت الصورة بواسطة نظام التحقق: ${aiResult.reason}` };
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

          if (allDayTasks && allDayTasks.length === 6 && allDayTasks.every((t: any) => t.completed)) {
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
                    total_completed: curStreak.total_completed + 6
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
          .eq('is_active', true);

        if (!error && data) {
          const formatted = data.map((u: any) => {
            const streakObj = u.streaks?.[0] || { current_streak: 0, longest_streak: 0, total_completed: 0 };
            
            const start = new Date(u.created_at).getTime();
            const now = new Date().getTime();
            const diffDays = Math.floor((now - start) / (24 * 3600 * 1000)) + 1;
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
        const { data: users, error: userErr } = await supabase.from('users').select('*');
        const { data: streaks } = await supabase.from('streaks').select('*');
        const { data: tasks } = await supabase.from('tasks').select('*');

        if (!userErr && users) {
          return users.map((u: any) => {
            const streak = streaks?.find((s: any) => s.user_id === u.id) || { current_streak: 0, longest_streak: 0, total_completed: 0 };
            const uTasks = tasks?.filter((t: any) => t.user_id === u.id) || [];
            
            const totalTasksCount = uTasks.length;
            const completedCount = uTasks.filter((t: any) => t.completed).length;
            const completionRate = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
            
            const start = new Date(u.created_at).getTime();
            const now = new Date().getTime();
            const diffDays = Math.floor((now - start) / (24 * 3600 * 1000)) + 1;
            const day_number = Math.min(30, Math.max(1, diffDays));

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
export const callOpenRouter = async (messages: { role: string; content: string }[], knowledgeContext: string) => {
  const lang = (typeof window !== 'undefined' ? localStorage.getItem('elbezawi_lang') : 'ar') as 'ar' | 'en';
  const isAr = lang === 'ar';

  if (OPENROUTER_API_KEY) {
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
          model: 'openrouter/owl-alpha',
          messages: [
            {
              role: 'system',
              content: `You are ElBezawy's challenge assistant. Answer only based on the knowledge provided below. Be concise. Respond in ${isAr ? 'Arabic' : 'English'}.\n\nKNOWLEDGE:\n${knowledgeContext}`
            },
            ...messages
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("OpenRouter API call failed:", e);
    }
  }

  const lastUserMsg = messages[messages.length - 1]?.content || '';
  await new Promise((resolve) => setTimeout(resolve, 800));

      const arGreetings = ['سلام', 'مرحبا', 'أهلاً', 'اهلاً', 'hello', 'hi', 'hey'];
      const arChallenge = ['تحدي', 'البزاوي', 'ما هو', 'what is', 'challenge'];
      const arTasks = ['مهام', 'المهام', 'الست', 'tasks', 'daily'];
      const arStreak = ['سلسلة', 'الترتيب', 'streak', 'ستريك'];
      const arProof = ['إثبات', 'صورة', 'رفع', 'proof', 'upload'];
      const arAdmin = ['أدمن', 'إدارة', 'مشرف', 'admin', 'moderator'];
    
      const hasAny = (keywords: string[]) => keywords.some(k => lastUserMsg.toLowerCase().includes(k.toLowerCase()));
    
      if (hasAny(arGreetings)) {
        return isAr
          ? 'أهلاً بك! أنا المساعد الذكي لتحدي البزاوي 🏆. كيف يمكنني مساعدتك اليوم بخصوص المهام أو السلسلة؟'
          : 'Welcome! I am ElBezawy\'s AI assistant 🏆. How can I help you today regarding tasks or your streak?';
      }
      if (hasAny(arChallenge)) {
        return isAr
          ? 'تحدي البزاوي هو تحدٍ يومي مكثف لـ 30 يوماً متواصلة لبناء العادات والالتزام، يحتوي على 6 مهام يومية: 3 روحانية و3 بدنية/ذهنية.'
          : 'The ElBezawy Challenge is an intense 30-day daily challenge to build habits and commitment, with 6 daily tasks: 3 spiritual and 3 physical/mental.';
      }
  if (hasAny(arTasks)) {
    return isAr
      ? 'المهام اليومية الستة هي:\n1. صلاة الفجر (05:00-07:00)\n2. أذكار الصباح (06:00-09:00)\n3. تمرين 30 دقيقة (07:00-12:00)\n4. قراءة 10 صفحات (10:00-14:00)\n5. مراجعة الأهداف (16:00-20:00)\n6. قراءة القرآن (20:00-23:59)\n\nالمهام الروحانية لا تحتاج صورة، البدنية والذهنية تحتاج صورة إثبات.'
      : 'The six daily tasks are:\n1. Fajr Prayer (05:00-07:00)\n2. Morning Adhkar (06:00-09:00)\n3. 30-min Workout (07:00-12:00)\n4. Read 10 Pages (10:00-14:00)\n5. Review Goals (16:00-20:00)\n6. Read Quran (20:00-23:59)\n\nSpiritual tasks need no photo — physical and mental tasks require photo proof.';
  }
  if (hasAny(arStreak)) {
    return isAr
      ? 'تحصل على زيادة في سلسلة الالتزام اليومية (Streak) عند إتمام المهام الستة. المهام الروحانية لا تكسر السلسلة إذا فُوِّتت — هي بينك وبين الله. أما المهام البدنية والذهنية التي تتطلب صورة، فإن فواتها يكسر السلسلة.'
      : 'Your streak increases when you complete all six tasks. Spiritual tasks don\'t break the streak if missed — they\'re between you and Allah. But missing a physical or mental task that requires photo proof will break your streak.';
  }
  if (hasAny(arProof)) {
    return isAr
      ? 'المهام الروحانية (الفجر، الأذكار، القرآن) لا تحتاج إثبات — اضغط على الزر فقط. المهام البدنية والذهنية (تمرين، قراءة، أهداف) تتطلب رفع صورة إثبات مصورة.'
      : 'Spiritual tasks (Fajr, Adhkar, Quran) need no proof — just tap the button. Physical and mental tasks (workout, reading, goals) require uploading a photo proof.';
  }
  if (hasAny(arAdmin)) {
    return isAr
      ? 'يقوم مشرفو التحدي بمراجعة الإثباتات المرفوعة وتفعيل أو تعطيل الحسابات غير الجادة لضمان نزاهة لوحة المتصدرين.'
      : 'Challenge admins review uploaded proofs and can activate or deactivate accounts to ensure leaderboard integrity.';
  }

  const match = DEFAULT_KNOWLEDGE_BASE.find(item => 
    lastUserMsg.toLowerCase().split(' ').some(word => word.length > 3 && item.content.includes(word))
  );

  if (match) {
    return `بناءً على معلومات التحدي: ${match.content}`;
  }

  return isAr
    ? 'عذراً، لم أستوعب السؤال تماماً. أنا مبرمج للإجابة فقط على الأسئلة المتعلقة بتحدي البزاوي وقواعده ومهامه الستة. هل تود الاستفسار عن المهام، السلسلة، أو رفع الإثباتات؟ 📚🏋️‍♂️🎯'
    : 'Sorry, I didn\'t quite understand. I\'m designed to answer questions about ElBezawy\'s challenge, rules, and six tasks. Would you like to ask about tasks, streaks, or uploading proof? 📚🏋️‍♂️🎯';
};