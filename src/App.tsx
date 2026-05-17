import { useState, useEffect, useRef } from 'react';
import { 
  Flame, Award, Lock, Upload, User, Calendar, 
  BookOpen, Dumbbell, Target, Shield, XCircle, 
  LogOut, Search, Clock, HelpCircle, RefreshCw, Eye,
  Check, X, Image as ImageIcon, Heart, Settings
} from 'lucide-react';
import { db, mockDb, clearPlaceholderData } from './lib/supabase';
import { 
  detectTimezone, 
  formatTimeEastern,
  getTaskState,
  getMinutesUntilWindowEnd,
  fetchAndCacheAdhan,
  CORE_TASK_IDS,
  BONUS_TASK_IDS
} from './lib/tasks';
import ChatWidget from './components/ChatWidget';
import ScheduleBuilder from './components/ScheduleBuilder';
import PrayerSchedule from './components/PrayerSchedule';
import { useLanguage } from './hooks/useLanguage';
import LanguageToggle from './components/LanguageToggle';
import { startWhopLogin, getWhopUser, clearWhopUser, refreshWhopToken, isTokenExpired, adminBypassLogin } from './lib/whop';

const PRESET_PROOFS = [
  {
    name: 'تمرين ٣٠ دقيقة',
    name_en: '30-min workout',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop',
    icon: Dumbbell
  },
  {
    name: 'مراجعة الأهداف',
    name_en: 'Review goals',
    url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=600&auto=format&fit=crop',
    icon: Target
  }
];

const TASK_TITLE_EN: Record<string, string> = {
  fajr: 'Fajr Prayer',
  adhkar: 'Morning Adhkar',
  exercise: 'Workout',
  cardio: 'Cardio',
  meal: 'Healthy Meal',
  cold_shower: 'Cold Shower',
  mindful_breathing: 'Mindful Breathing',
  dhuhr: 'Dhuhr Prayer',
  asr: 'Asr Prayer',
  maghrib: 'Maghrib Prayer',
  isha: 'Isha Prayer',
  goals: 'Review Goals',
  quran: 'Read Quran',
  qiyam: 'Qiyam al-Layl ⭐',
  sunnah: 'Sunnah Prayers ⭐'
};

const TASK_NOTE_EN: Record<string, string> = {
  fajr: 'This is between you and Allah — no proof required',
  adhkar: 'This is between you and Allah — no proof required',
  exercise: 'Upload a photo as proof of completion',
  cardio: 'Upload a photo as proof of completion',
  meal: 'Photo of your healthy meal',
  cold_shower: 'This is between you and Allah — no proof required',
  mindful_breathing: 'This is between you and Allah — no proof required',
  dhuhr: 'This is between you and Allah — no proof required',
  asr: 'This is between you and Allah — no proof required',
  maghrib: 'This is between you and Allah — no proof required',
  isha: 'This is between you and Allah — no proof required',
  goals: 'Photo of your notebook or progress log',
  quran: 'This is between you and Allah — no proof required',
  qiyam: 'Bonus points — between you and Allah — last third of the night',
  sunnah: 'Bonus: 2 before Fajr · 4+2 before/after Dhuhr · 2 after Maghrib · 2 after Isha'
};

function getLocalizedTaskTitle(task: any, lang: 'ar' | 'en') {
  return lang === 'en' ? (TASK_TITLE_EN[task.task_id] || task.title_ar) : task.title_ar;
}

function getLocalizedTaskNote(task: any, lang: 'ar' | 'en') {
  return lang === 'en' ? (TASK_NOTE_EN[task.task_id] || task.note_ar) : task.note_ar;
}

function getLocalizedTaskTime(time: string, lang: 'ar' | 'en') {
  return lang === 'en' ? time : formatTimeEastern(time);
}

function TaskTypeIcon({ type }: { type: string }) {
  if (type === 'spiritual') return <Heart className="w-3.5 h-3.5 text-emerald-400" />;
  if (type === 'physical') return <Dumbbell className="w-3.5 h-3.5 text-amber-400" />;
  return <BookOpen className="w-3.5 h-3.5 text-sky-400" />;
}

function TaskTypeLabel({ type, lang }: { type: string; lang: 'ar' | 'en' }) {
  if (type === 'spiritual') return <span className="text-[9px] text-emerald-400 font-bold">{lang === 'ar' ? 'روحاني' : 'Spiritual'}</span>;
  if (type === 'physical') return <span className="text-[9px] text-amber-400 font-bold">{lang === 'ar' ? 'بدني' : 'Physical'}</span>;
  return <span className="text-[9px] text-sky-400 font-bold">{lang === 'ar' ? 'ذهني' : 'Mental'}</span>;
}

export default function App() {
  const { lang, t, n } = useLanguage();
  // Clear stale placeholder data on first load
  useEffect(() => { clearPlaceholderData(); }, []);
  const [settingsTimezone, setSettingsTimezone] = useState(detectTimezone());
  const [settingsDisplayName, setSettingsDisplayName] = useState('');
  const [scheduleTab, setScheduleTab] = useState<'prayer' | 'daily'>('prayer');
  const [taskSection, setTaskSection] = useState<'physical' | 'mindset' | 'soul'>('physical');
  const [route, setRoute] = useState<string>(window.location.hash || '#/');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminLoginEmail, setAdminLoginEmail] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  
  // App-wide loading & trigger states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  

  // Leaderboard page states
  const [leaderboardUsers, setLeaderboardUsers] = useState<any[]>([]);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  // Admin page states
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [adminTab, setAdminTab] = useState<'users' | 'photos'>('users');
  const [photoSubmissions, setPhotoSubmissions] = useState<any[]>([]);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Upload modal states
  const [activeUploadTask, setActiveUploadTask] = useState<any>(null);
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const scheduleRef = useRef<HTMLDivElement>(null);
  const activeTaskRef = useRef<HTMLDivElement>(null);

  // Router listener
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // On mount: grab user data from URL param set by callback.ts, store in localStorage, clean URL
  useEffect(() => {
    const hash = window.location.hash; // e.g. "#/?_u=base64..."
    const paramMatch = hash.match(/[?&]_u=([^&]+)/);
    if (paramMatch) {
      try {
        const userData = JSON.parse(atob(decodeURIComponent(paramMatch[1])));
        localStorage.setItem('elbezawi_whop_user', JSON.stringify(userData));
      } catch (e) {
        console.error('Failed to parse auth param:', e);
      }
      // Clean URL — remove _u param to avoid re-processing on refresh
      window.location.replace('/#/');
    }
  }, []);

  // Fetch Adhan times on mount — pass user's selected timezone for correct method + local times
  useEffect(() => {
    fetchAndCacheAdhan(settingsTimezone).then((timings) => {
      // If we got fresh timings (not cached), bump refreshTrigger so new tasks use real times
      const today = new Date().toLocaleDateString('sv');
      const wasAlreadyCached = !!localStorage.getItem(`elbezawi_adhan_${today}_prev`);
      if (!wasAlreadyCached) {
        localStorage.setItem(`elbezawi_adhan_${today}_prev`, '1');
        setRefreshTrigger(p => p + 1);
      }
    }).catch(() => { /* silent — defaults apply */ });
  }, []);

  // Fetch current user details
  useEffect(() => {
    async function loadUser() {
      setLoading(true);

      if (isTokenExpired()) {
        await refreshWhopToken();
      }

      const whopUser = getWhopUser();

      if (whopUser) {
        const user = await db.loginWithWhop(whopUser);
        setCurrentUser(user);
        setSettingsTimezone(user?.timezone || detectTimezone());
        if (user) {
          const tasks = await db.getOrCreateTodayTasks(user.id, user.timezone);
          setTodayTasks(tasks);
          setSettingsDisplayName(db.getDisplayName(user.id, user.name || user.email || ''));
        }
      } else {
        setCurrentUser(null);
        if (route !== '#/login') {
          window.location.hash = '#/login';
        }
      }

      setLoading(false);
    }
    loadUser();
  }, [refreshTrigger]);

  // Update current time every second — smooth countdown + Now marker
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check streak breaks every 30 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const dayNumber = mockDb.getDayNumber(currentUser);
      mockDb.checkExpiredTasksAndBreakStreak(currentUser.id, dayNumber);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Auto-refresh todayTasks every 30s — picks up admin changes, proof rejections, external completions
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const tasks = await db.getOrCreateTodayTasks(currentUser.id, currentUser.timezone);
        setTodayTasks(tasks);
      } catch (_) { /* silent — don't disrupt UI on background refresh error */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Auto-scroll to active task on schedule mount
  useEffect(() => {
    if (route === '#/' && todayTasks.length > 0 && activeTaskRef.current) {
      const timer = setTimeout(() => {
        activeTaskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [route, todayTasks]);

  // Load Leaderboard data
  useEffect(() => {
    if (route === '#/leaderboard') {
      async function loadLeaderboard() {
        const users = await db.getLeaderboard();
        setLeaderboardUsers(users);
      }
      loadLeaderboard();
    }
  }, [route, refreshTrigger]);

  // Load Admin data
  useEffect(() => {
    if (route === '#/admin') {
      async function loadAdminData() {
        const users = await db.adminGetUsers();
        setAdminUsers(users);
        const photos = await db.adminGetPhotoSubmissions();
        setPhotoSubmissions(photos);
        if (selectedAdminUser) {
          const updated = users.find((u: any) => u.id === selectedAdminUser.id);
          if (updated) setSelectedAdminUser(updated);
        }
      }
      loadAdminData();
    }
  }, [route, refreshTrigger, selectedAdminUser?.id]);

  // Registration handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim()) {
      alert(lang === 'ar' ? 'الرجاء إدخال اسمك وبريدك الإلكتروني للاشتراك في التحدي.' : 'Please enter your name and email to join the challenge.');
      return;
    }

    try {
      setLoading(true);
      const newUser = await db.register(registerName, registerEmail, registerTimezone);
      setCurrentUser(newUser);
      setRefreshTrigger(p => p + 1);
      window.location.hash = '#/';
    } catch (err) {
      console.error(err);
      alert(lang === 'ar' ? 'فشل التسجيل، يرجى المحاولة لاحقاً.' : 'Registration failed, please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Sign out handler
  const handleLogout = () => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج؟' : 'Are you sure you want to sign out?')) {
      clearWhopUser();
      db.logout();
      setCurrentUser(null);
      setTodayTasks([]);
      setShowSettings(false);
      window.location.hash = '#/login';
    }
  };

  // Complete any task that doesn't require photo (spiritual + cold shower + mindful breathing)
  const handleSpiritualComplete = async (task: any) => {
    if (!currentUser || task.completed) return;
    try {
      const updated = await db.completeTask(task.id, null, currentUser.id, task.day_number, false);
      if (updated && (updated as any).error) {
        console.error((updated as any).error);
      } else {
        setRefreshTrigger(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Photo upload submit handler
  const handleTaskCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUploadTask) return;
    
    if (!selectedFile && !selectedPresetUrl) {
      setUploadError(currentUser?.is_admin 
        ? (lang === 'ar' ? 'يرجى اختيار صورة من جهازك أو تحديد إحدى الصور السريعة المقترحة!' : 'Please pick a file from your device or select a preset!')
        : (lang === 'ar' ? 'يرجى اختيار صورة من جهازك لرفع الإثبات!' : 'Please select a photo from your device to upload proof!')
      );
      return;
    }

    if (selectedPresetUrl && currentUser?.is_admin) {
      try {
        setIsUploading(true);
        setUploadError('');
        setValidationMessage('');
        
        const updated = await db.completeTask(
          activeUploadTask.id, 
          selectedPresetUrl, 
          currentUser.id, 
          activeUploadTask.day_number
        );

        if (updated && (updated as any).error) {
          setUploadError((updated as any).error);
        } else {
          setActiveUploadTask(null);
          setSelectedFile(null);
          setSelectedPresetUrl('');
          setRefreshTrigger(p => p + 1);
        }
      } catch (err) {
        setUploadError(lang === 'ar' ? 'حدث خطأ أثناء حفظ الإثبات، حاول ثانية.' : 'Failed to save proof, please try again.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (selectedFile) {
      try {
        setIsUploading(true);
        setUploadError('');
        setValidationMessage(lang === 'ar' ? 'جاري التحقق من صحة الصورة بالذكاء الاصطناعي...' : 'Validating photo authenticity with AI...');
        
        const updated = await db.completeTask(
          activeUploadTask.id, 
          selectedFile, 
          currentUser.id, 
          activeUploadTask.day_number,
          true
        );

        if (updated && (updated as any).error) {
          const errMsg = lang === 'en' && (updated as any).error_en
            ? (updated as any).error_en
            : (updated as any).error;
          setUploadError(errMsg);
          setValidationMessage('');
        } else {
          setActiveUploadTask(null);
          setSelectedFile(null);
          setSelectedPresetUrl('');
          setRefreshTrigger(p => p + 1);
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        const msg = err?.message || String(err) || 'Unknown error';
        setUploadError(
          lang === 'ar'
            ? `فشل رفع الإثبات: ${msg}`
            : `Upload failed: ${msg}`
        );
      } finally {
        setIsUploading(false);
        setValidationMessage('');
      }
      return;
    }
  };

  // Admin actions
  const handleAdminToggleUser = async (userId: string) => {
    await db.adminToggleUser(userId);
    setRefreshTrigger(p => p + 1);
  };

  const handleAdminOverride = async (taskId: string, completed: boolean, fallbackUrl?: string) => {
    const url = completed ? (fallbackUrl || '') : '';
    await db.adminOverrideTask(taskId, completed, url);
    setRefreshTrigger(p => p + 1);
  };

  const handleAdminRejectPhoto = async (taskId: string) => {
    if (!rejectReason.trim()) {
      alert(lang === 'ar' ? 'الرجاء كتابة سبب الرفض' : 'Please provide a rejection reason');
      return;
    }
    await db.adminRejectPhoto(taskId, rejectReason);
    setRejectingTaskId(null);
    setRejectReason('');
    setRefreshTrigger(p => p + 1);
  };

  // Loading Screen
  if (loading && !currentUser && route !== '#/login') {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center text-center px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-4 border-[#C9A84C]/20 border-t-[#C9A84C] animate-spin"></div>
          <Flame className="w-10 h-10 text-[#C9A84C] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{t('login.title')}</h1>
        <p className="text-gray-400 text-sm">Loading Schedule...</p>
      </div>
    );
  }

  const userStreak = currentUser ? mockDb.getStreak(currentUser.id) : null;
  const currentDay = currentUser ? mockDb.getDayNumber(currentUser) : 1;
  const currentDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const scheduleTasks = todayTasks.filter(t => t.task_id);
  const coreTasks = scheduleTasks.filter(t => (CORE_TASK_IDS as readonly string[]).includes(t.task_id));
  const bonusTasks = scheduleTasks.filter(t => (BONUS_TASK_IDS as readonly string[]).includes(t.task_id));
  const completedCount = coreTasks.filter(t => t.completed).length;
  const bonusCompletedCount = bonusTasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E0E0E0] flex flex-col selection:bg-[#C9A84C] selection:text-[#0D0D0D] transition-all duration-500 ease-in-out" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#C9A84C]/15 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center justify-between">
            <a href="#/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center group-hover:scale-105 transition-all">
                <Flame className="w-6 h-6 text-[#C9A84C] animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base md:text-lg tracking-wide">{t('login.title')}</h1>
                <p className="text-[10px] text-[#C9A84C] font-semibold tracking-wider">ELBEZAWY CHALLENGE</p>
              </div>
            </a>
            
            {currentUser && (
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex items-center gap-1 bg-[#C9A84C]/10 text-[#C9A84C] px-2.5 py-1 rounded-full border border-[#C9A84C]/20 text-xs font-bold">
                  <Flame className="w-4 h-4 fill-current animate-bounce" />
                  <span>{n(userStreak?.current_streak || 0)}</span>
                </div>
                <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className="p-1.5 text-gray-400 hover:text-[#C9A84C] rounded-lg transition"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          {currentUser && (
            <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
              <a 
                href="#/" 
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  route === '#/' 
                    ? 'bg-[#C9A84C] text-[#0D0D0D]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#C9A84C]/5'
                }`}
              >
                {lang === 'ar' ? 'الجدول اليومي' : 'Daily Schedule'}
              </a>
              <a 
                href="#/schedule" 
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  route === '#/schedule' 
                    ? 'bg-[#C9A84C] text-[#0D0D0D]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#C9A84C]/5'
                }`}
              >
                {lang === 'ar' ? 'جدولي 📅' : 'My Schedule 📅'}
              </a>
              <a 
                href="#/leaderboard" 
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  route === '#/leaderboard' 
                    ? 'bg-[#C9A84C] text-[#0D0D0D]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#C9A84C]/5'
                }`}
              >
                {lang === 'ar' ? 'لوحة الصدارة 🏆' : 'Leaderboard 🏆'}
              </a>
              <a 
                href="#/admin" 
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-1 ${
                  route === '#/admin' 
                    ? 'bg-amber-600 text-white' 
                    : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/5'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t('admin.title')}</span>
              </a>
            </div>
          )}

          {/* Desktop settings & stats */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-4 bg-[#181818] px-4 py-2 rounded-2xl border border-white/5 relative">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] border border-[#C9A84C]/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{settingsDisplayName || currentUser.name}</h4>
                  <p className="text-[9px] text-gray-500">{currentUser.email}</p>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-400">{t('schedule.streak')}:</span>
                <span className="bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
                  {n(userStreak?.current_streak || 0)}
                </span>
              </div>

              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="text-gray-400 hover:text-[#C9A84C] p-1.5 rounded-lg transition"
                title={t('settings.title')}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* SETTINGS OVERLAY POPUP */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-500 ease-in-out">
          <div className="bg-[#121212] border border-[#C9A84C]/30 rounded-3xl max-w-sm w-full p-6 space-y-4 relative overflow-hidden animate-fade-in shadow-2xl transition-all duration-500 ease-in-out">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#C9A84C]" />
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="font-bold text-white text-base">{t('settings.title')}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-all duration-500 text-sm">
                ✕
              </button>
            </div>

            {/* Display Name Row */}
            <div className="flex flex-col gap-2 bg-[#181818] p-4 rounded-2xl border border-white/5 text-start">
              <span className="text-sm font-bold text-gray-300">{lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}</span>
              <input
                type="text"
                value={settingsDisplayName}
                onChange={e => setSettingsDisplayName(e.target.value)}
                maxLength={40}
                placeholder={currentUser?.name || ''}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#C9A84C] text-xs"
              />
              <p className="text-[10px]" style={{ color: '#C9A84C99' }}>
                {lang === 'ar' ? 'هذا ما سيراه الجميع في لوحة المتصدرين' : 'This is what everyone sees on the leaderboard'}
              </p>
              <button
                onClick={async () => {
                  if (!settingsDisplayName.trim()) return;
                  await db.updateDisplayName(currentUser.id, settingsDisplayName.trim());
                  setSettingsDisplayName(settingsDisplayName.trim());
                  alert(lang === 'ar' ? 'تم حفظ الاسم بنجاح!' : 'Display name saved!');
                }}
                className="mt-1 w-full bg-[#C9A84C] hover:bg-[#b0913e] text-[#0D0D0D] font-bold py-2 rounded-xl text-xs transition"
              >
                {lang === 'ar' ? 'حفظ الاسم' : 'Save name'}
              </button>
            </div>

            {/* Timezone Row */}
            <div className="flex flex-col gap-2 bg-[#181818] p-4 rounded-2xl border border-white/5 text-start">
              <span className="text-sm font-bold text-gray-300">{lang === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}</span>
              <select
                value={settingsTimezone}
                onChange={(e) => setSettingsTimezone(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-all duration-500 text-xs"
              >
                <optgroup label={lang === 'ar' ? '— الأمريكيتان —' : '— Americas —'}>
                  <option value="America/New_York">New York (EST/EDT)</option>
                  <option value="America/Chicago">Chicago (CST/CDT)</option>
                  <option value="America/Denver">Denver (MST/MDT)</option>
                  <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                  <option value="America/Toronto">Toronto (EST/EDT)</option>
                  <option value="America/Vancouver">Vancouver (PST/PDT)</option>
                  <option value="America/Mexico_City">Mexico City (CST/CDT)</option>
                  <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                  <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                  <option value="America/Bogota">Bogotá (COT)</option>
                  <option value="America/Lima">Lima (PET)</option>
                  <option value="America/Caracas">Caracas (VET)</option>
                </optgroup>
                <optgroup label={lang === 'ar' ? '— أوروبا —' : '— Europe —'}>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Paris (CET/CEST)</option>
                  <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                  <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                  <option value="Europe/Rome">Rome (CET/CEST)</option>
                  <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                  <option value="Europe/Stockholm">Stockholm (CET/CEST)</option>
                  <option value="Europe/Warsaw">Warsaw (CET/CEST)</option>
                  <option value="Europe/Istanbul">Istanbul (TRT)</option>
                  <option value="Europe/Moscow">Moscow (MSK)</option>
                </optgroup>
                <optgroup label={lang === 'ar' ? '— الشرق الأوسط وأفريقيا —' : '— Middle East & Africa —'}>
                  <option value="Asia/Riyadh">Riyadh (AST)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kuwait">Kuwait (AST)</option>
                  <option value="Asia/Qatar">Qatar (AST)</option>
                  <option value="Asia/Bahrain">Bahrain (AST)</option>
                  <option value="Asia/Muscat">Muscat (GST)</option>
                  <option value="Asia/Baghdad">Baghdad (AST)</option>
                  <option value="Asia/Beirut">Beirut (EET/EEST)</option>
                  <option value="Asia/Amman">Amman (EET/EEST)</option>
                  <option value="Asia/Jerusalem">Jerusalem (IST/IDT)</option>
                  <option value="Africa/Cairo">Cairo (EET)</option>
                  <option value="Africa/Casablanca">Casablanca (WET/WEST)</option>
                  <option value="Africa/Tunis">Tunis (CET)</option>
                  <option value="Africa/Algiers">Algiers (CET)</option>
                  <option value="Africa/Tripoli">Tripoli (EET)</option>
                  <option value="Africa/Khartoum">Khartoum (CAT)</option>
                  <option value="Africa/Lagos">Lagos (WAT)</option>
                  <option value="Africa/Nairobi">Nairobi (EAT)</option>
                  <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                </optgroup>
                <optgroup label={lang === 'ar' ? '— آسيا والمحيط الهادئ —' : '— Asia & Pacific —'}>
                  <option value="Asia/Karachi">Karachi (PKT)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Dhaka">Dhaka (BST)</option>
                  <option value="Asia/Colombo">Colombo (IST)</option>
                  <option value="Asia/Kathmandu">Kathmandu (NPT)</option>
                  <option value="Asia/Tashkent">Tashkent (UZT)</option>
                  <option value="Asia/Tehran">Tehran (IRST)</option>
                  <option value="Asia/Kabul">Kabul (AFT)</option>
                  <option value="Asia/Bangkok">Bangkok (ICT)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Asia/Kuala_Lumpur">Kuala Lumpur (MYT)</option>
                  <option value="Asia/Jakarta">Jakarta (WIB)</option>
                  <option value="Asia/Shanghai">China (CST)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Seoul">Seoul (KST)</option>
                  <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                  <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
                  <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                  <option value="Pacific/Honolulu">Honolulu (HST)</option>
                </optgroup>
              </select>
              {(() => {
                const detectedTz = detectTimezone();
                const isMatch = settingsTimezone === detectedTz;
                return (
                  <p className="text-[10px] mt-0.5" style={{ color: '#C9A84C99' }}>
                    🌍 {lang === 'ar' ? 'توقيتك المكتشف تلقائياً' : 'Your detected timezone'}: {detectedTz}
                    {isMatch ? (
                      <span style={{ color: '#5a9a5a' }}> ✓</span>
                    ) : (
                      <span
                        onClick={() => setSettingsTimezone(detectedTz)}
                        className="cursor-pointer hover:underline animate-pulse"
                        style={{ color: '#C9A84C' }}
                      >
                        {lang === 'ar' ? ' — اضغط للتطبيق' : ' — tap to apply'}
                      </span>
                    )}
                  </p>
                );
              })()}
              <button
                onClick={async () => {
                  await db.updateUserTimezone(currentUser.id, settingsTimezone);
                  setRefreshTrigger(p => p + 1);
                  alert(lang === 'ar' ? 'تم حفظ التوقيت بنجاح!' : 'Timezone saved successfully!');
                }}
                className="mt-1.5 w-full bg-[#C9A84C] hover:bg-[#b0913e] text-[#0D0D0D] font-bold py-2 rounded-xl text-xs transition"
              >
                {lang === 'ar' ? 'حفظ التوقيت' : 'Save timezone'}
              </button>
            </div>

            {/* Language row centered */}
            <div className="flex flex-col items-center justify-center gap-3 bg-[#181818] p-4 rounded-2xl border border-white/5">
              <span className="text-sm font-bold text-gray-300 text-center">{t('settings.language')}</span>
              <LanguageToggle />
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('settings.logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Containers */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* VIEW 1: LOGIN */}
        {(route === '#/login' || (!currentUser && !loading)) && (
          <div className="max-w-md mx-auto my-12 animate-fade-in">
            <div className="flex justify-center mb-6">
              <LanguageToggle />
            </div>

            <div className="bg-[#121212] border border-[#C9A84C]/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

              <div className="w-16 h-16 bg-[#C9A84C]/10 rounded-2xl border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-5">
                <Flame className="w-8 h-8 text-[#C9A84C] animate-pulse" />
              </div>

              <h2 className="text-2xl font-black text-white mb-2">{t('login.title')}</h2>
              <p className="text-sm text-gray-400 mb-8">{t('login.subtitle')}</p>

              <button
                onClick={startWhopLogin}
                className="w-full bg-[#C9A84C] hover:bg-[#b0913e] text-[#0D0D0D] font-black py-4 px-6 rounded-2xl transition shadow-xl flex items-center justify-center gap-3 text-base"
              >
                <img
                  src="https://whop.com/favicon.ico"
                  alt="Whop"
                  className="w-5 h-5 rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {lang === 'ar' ? 'تسجيل الدخول بـ Whop' : 'Sign in with Whop'}
              </button>

              <p className="text-[11px] text-gray-500 mt-4">
                {lang === 'ar'
                  ? 'يجب أن يكون لديك اشتراك نشط في Whop للمشاركة في التحدي'
                  : 'You must have an active Whop membership to join the challenge'}
              </p>

              {route.includes('error') && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
                  {lang === 'ar' ? 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.' : 'Login failed. Please try again.'}
                </div>
              )}

              {/* Hidden admin bypass — only visible when showAdminLogin is true */}
              {!showAdminLogin ? (
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="mt-6 text-[10px] text-gray-700 hover:text-gray-500 transition"
                >
                  ·
                </button>
              ) : (
                <div className="mt-6 border-t border-white/5 pt-4 space-y-2 text-left">
                  <p className="text-[10px] text-gray-500 text-center mb-2">Admin Access</p>
                  <input
                    type="email"
                    value={adminLoginEmail}
                    onChange={e => { setAdminLoginEmail(e.target.value); setAdminLoginError(''); }}
                    placeholder="admin email"
                    className="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  />
                  <input
                    type="password"
                    value={adminLoginPassword}
                    onChange={e => { setAdminLoginPassword(e.target.value); setAdminLoginError(''); }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const ok = await adminBypassLogin(adminLoginEmail, adminLoginPassword);
                        if (ok) {
                          setRefreshTrigger(p => p + 1);
                          window.location.hash = '#/';
                        } else {
                          setAdminLoginError('Invalid credentials');
                          setAdminLoginPassword('');
                        }
                      }
                    }}
                    placeholder="password"
                    className="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  />
                  {adminLoginError && (
                    <p className="text-[10px] text-red-400 text-center">{adminLoginError}</p>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!adminLoginEmail || !adminLoginPassword) return;
                      setAdminLoginError('');
                      const ok = await adminBypassLogin(adminLoginEmail, adminLoginPassword);
                      if (ok) {
                        setRefreshTrigger(p => p + 1);
                        window.location.hash = '#/';
                      } else {
                        setAdminLoginError('Invalid credentials');
                        setAdminLoginPassword('');
                      }
                    }}
                    className="w-full bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30 text-[#C9A84C] border border-[#C9A84C]/30 py-2 rounded-lg text-xs font-bold transition"
                  >
                    Enter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

                {/* VIEW 2: SCHEDULE / DASHBOARD */}
        {route === '#/' && currentUser && (
          <div className="space-y-4 animate-fade-in" ref={scheduleRef}>
            
            {/* Compact Header Bar */}
            <div className="bg-[#121212] border border-[#C9A84C]/20 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block">{t('schedule.today')} {n(currentDay)} {lang === 'ar' ? 'من ٣٠' : 'of 30'}</span>
                  <span className="text-xs text-[#C9A84C] font-bold">{currentDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-[#C9A84C] fill-current animate-bounce" />
                <span className="text-sm font-black text-[#C9A84C]">{n(userStreak?.current_streak || 0)}</span>
                <span className="text-[10px] text-[#C9A84C]">{t('schedule.streak')}</span>
              </div>
            </div>

            {/* Progress mini-bar */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400">{lang === 'ar' ? 'إنجاز اليوم:' : 'Daily Progress:'}</span>
              <div className="flex-1 bg-[#222] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#C9A84C] h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / CORE_TASK_IDS.length) * 100}%` }}
                />
              </div>
              <span className="text-[#C9A84C] font-bold">{n(completedCount)} / {n(CORE_TASK_IDS.length)}{bonusCompletedCount > 0 ? <span style={{color:'#C9A84C99', fontSize:'10px'}}> +{bonusCompletedCount}⭐</span> : null}</span>
            </div>

            {/* Section Tab Nav */}
            {(() => {
              const TASK_SECTION: Record<string, 'physical' | 'mindset' | 'soul'> = {
                exercise: 'physical', cardio: 'physical', meal: 'physical',
                cold_shower: 'mindset', mindful_breathing: 'mindset', goals: 'mindset',
                fajr: 'soul', adhkar: 'soul', dhuhr: 'soul', asr: 'soul',
                maghrib: 'soul', isha: 'soul', quran: 'soul', qiyam: 'soul', sunnah: 'soul'
              };

              // Soul tasks are always available all day — no time locking
              const SOUL_IDS = new Set(['fajr','adhkar','dhuhr','asr','maghrib','isha','quran','qiyam','sunnah']);
              const NO_PHOTO_IDS = new Set(['fajr','adhkar','dhuhr','asr','maghrib','isha','quran','qiyam','sunnah','cold_shower','mindful_breathing']);

              const physicalTasks  = scheduleTasks.filter(t => TASK_SECTION[t.task_id] === 'physical');
              const mindsetTasks   = scheduleTasks.filter(t => TASK_SECTION[t.task_id] === 'mindset');
              const soulCoreTasks  = scheduleTasks.filter(t => TASK_SECTION[t.task_id] === 'soul' && !(BONUS_TASK_IDS as readonly string[]).includes(t.task_id));
              const soulBonusTasks = scheduleTasks.filter(t => TASK_SECTION[t.task_id] === 'soul' && (BONUS_TASK_IDS as readonly string[]).includes(t.task_id));

              const physDone = physicalTasks.filter(t => t.completed).length;
              const mindDone = mindsetTasks.filter(t => t.completed).length;
              const soulDone = [...soulCoreTasks, ...soulBonusTasks].filter(t => t.completed).length;

              const renderCard = (task: any) => {
                const isBonus   = (BONUS_TASK_IDS as readonly string[]).includes(task.task_id);
                const isSoul    = SOUL_IDS.has(task.task_id);
                const noPhoto   = NO_PHOTO_IDS.has(task.task_id);
                // Soul tasks: always active unless done (no time window locking)
                const rawState  = getTaskState(task, currentTime);
                const isDone    = rawState === 'done' || task.completed === true;
                const isActive  = isSoul ? !isDone : rawState === 'active';
                const isExpired = !isSoul && rawState === 'expired';
                const minutesLeft = isActive && !isSoul ? getMinutesUntilWindowEnd(task, currentTime) : 0;

                return (
                  <div
                    key={task.id}
                    className={`relative rounded-xl border p-3 transition-all duration-200 ${
                      isDone
                        ? (noPhoto ? 'bg-[#0a1a0a] border-emerald-500/25' : 'bg-green-950/20 border-green-500/20')
                        : isExpired
                          ? 'bg-[#121212] border-red-500/15 opacity-55'
                          : isActive
                            ? 'bg-[#161616] border-[#C9A84C]/30'
                            : 'bg-[#121212] border-white/5 opacity-45'
                    }`}
                  >
                    {/* top accent */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${
                      isDone ? 'bg-emerald-500' : isExpired ? 'bg-red-500/40' : isActive ? 'bg-[#C9A84C]' : 'bg-gray-700/30'
                    }`} />

                    {/* title row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className={`text-[12px] font-bold text-white leading-snug flex-1 ${isDone ? 'line-through opacity-60' : ''}`}>
                        {isBonus && <span className="text-[#C9A84C] mr-0.5">⭐</span>}
                        {getLocalizedTaskTitle(task, lang)}
                      </p>

                      {/* ACTION — FIX: explicit noPhoto check, no operator precedence bug */}
                      {noPhoto ? (
                        // Checkbox for no-proof tasks (soul + cold_shower + mindful_breathing)
                        <button
                          disabled={isDone}
                          onClick={(e) => { e.stopPropagation(); if (!isDone) handleSpiritualComplete(task); }}
                          className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                            isDone
                              ? 'bg-emerald-500/20 border-emerald-500 cursor-default'
                              : 'border-[#C9A84C] hover:bg-[#C9A84C]/10 cursor-pointer'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      ) : isDone ? (
                        // Done with photo
                        task.photo_url
                          ? <img src={task.photo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-green-400" />
                            </div>
                      ) : isActive ? (
                        // Upload proof button
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveUploadTask(task); }}
                          className="bg-[#C9A84C] hover:bg-[#b0913e] text-[#0D0D0D] text-[9px] font-black px-2 py-1.5 rounded-lg transition flex items-center gap-0.5 shrink-0"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          {lang === 'ar' ? 'إثبات' : 'proof'}
                        </button>
                      ) : isExpired ? (
                        <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                          <X className="w-3 h-3 text-red-400" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Lock className="w-3 h-3 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* status label */}
                    <span className={`text-[9px] font-semibold ${
                      isDone ? 'text-emerald-400' : isExpired ? 'text-red-400' : isActive ? 'text-[#C9A84C]/70' : 'text-gray-600'
                    }`}>
                      {isDone
                        ? (lang === 'ar' ? '✓ مكتمل' : '✓ done')
                        : isExpired
                          ? (lang === 'ar' ? 'انتهى' : 'expired')
                          : isActive && !isSoul
                            ? `${n(minutesLeft)}${lang === 'ar' ? 'د متبقية' : 'm left'}`
                            : isSoul && !isDone
                              ? (lang === 'ar' ? 'متاح طوال اليوم' : 'available all day')
                              : getLocalizedTaskTime(task.window_start, lang)}
                    </span>
                  </div>
                );
              };

              const tabs = [
                { key: 'physical', label: lang === 'ar' ? 'جسدي' : 'Physical', icon: <Dumbbell className="w-4 h-4" />, color: '#F59E0B', done: physDone, total: physicalTasks.length },
                { key: 'mindset',  label: lang === 'ar' ? 'ذهني' : 'Mindset',  icon: <BookOpen className="w-4 h-4" />, color: '#38BDF8', done: mindDone, total: mindsetTasks.length },
                { key: 'soul',     label: lang === 'ar' ? 'روحاني' : 'Soul',    icon: <Heart className="w-4 h-4" />,    color: '#34D399', done: soulDone, total: soulCoreTasks.length + soulBonusTasks.length },
              ] as const;

              const activeSection = taskSection;

              return (
                <div>
                  {/* Tab nav */}
                  <div className="grid grid-cols-3 gap-1.5 mb-4 bg-[#0e0e0e] p-1 rounded-2xl border border-white/5">
                    {tabs.map(tab => {
                      const isSelected = activeSection === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setTaskSection(tab.key as any)}
                          className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all duration-150 ${
                            isSelected ? 'bg-[#1a1a1a] shadow-sm' : 'hover:bg-[#141414]'
                          }`}
                          style={{ borderBottom: isSelected ? `2px solid ${tab.color}` : '2px solid transparent' }}
                        >
                          <span style={{ color: isSelected ? tab.color : '#555' }}>{tab.icon}</span>
                          <span className="text-[10px] font-black tracking-wide" style={{ color: isSelected ? tab.color : '#555' }}>
                            {tab.label}
                          </span>
                          <span className="text-[9px]" style={{ color: isSelected ? tab.color : '#444' }}>
                            {tab.done}/{tab.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Task cards for selected tab */}
                  <div className="space-y-2">
                    {activeSection === 'physical' && (
                      physicalTasks.length > 0
                        ? physicalTasks.map(renderCard)
                        : <p className="text-[11px] text-gray-600 text-center py-6">{lang === 'ar' ? 'لا توجد مهام' : 'No tasks'}</p>
                    )}
                    {activeSection === 'mindset' && (
                      mindsetTasks.length > 0
                        ? mindsetTasks.map(renderCard)
                        : <p className="text-[11px] text-gray-600 text-center py-6">{lang === 'ar' ? 'لا توجد مهام' : 'No tasks'}</p>
                    )}
                    {activeSection === 'soul' && (
                      <>
                        {soulCoreTasks.map(renderCard)}
                        {soulBonusTasks.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex-1 h-px bg-[#C9A84C]/15" />
                              <span className="text-[8px] text-[#C9A84C]/50 font-bold">⭐ BONUS</span>
                              <div className="flex-1 h-px bg-[#C9A84C]/15" />
                            </div>
                            {soulBonusTasks.map(renderCard)}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="bg-[#121212]/50 border border-white/5 rounded-2xl p-4 text-center">
              <p className="text-[11px] text-gray-500">
                {completedCount === CORE_TASK_IDS.length
                  ? (lang === 'ar' ? `🎉 مبارك! أكملت جميع المهام الأساسية اليوم${bonusCompletedCount > 0 ? ` + ${bonusCompletedCount} نقاط إضافية ⭐` : ''}. سلسلتك محفوظة!` : `🎉 All ${CORE_TASK_IDS.length} core tasks done today${bonusCompletedCount > 0 ? ` + ${bonusCompletedCount} bonus ⭐` : ''}! Streak saved.`)
                  : (lang === 'ar' ? `أكملت ${n(completedCount)} من ${n(CORE_TASK_IDS.length)} مهام اليوم. ${n(CORE_TASK_IDS.length - completedCount)} متبقية.` : `Completed ${n(completedCount)} of ${CORE_TASK_IDS.length} tasks today. ${CORE_TASK_IDS.length - completedCount} remaining.`)}
              </p>
            </div>

          </div>
        )}

        {/* VIEW 3: MY SCHEDULE — Prayer + Daily tabs */}
        {route === '#/schedule' && currentUser && (
          <div className="animate-fade-in max-w-2xl mx-auto px-4 pt-4">
            {/* Tab switcher */}
            <div className="flex gap-2 mb-6 bg-[#121212] p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => setScheduleTab('prayer')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  scheduleTab === 'prayer'
                    ? 'bg-[#C9A84C] text-[#0D0D0D]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🕌 {lang === 'ar' ? 'أوقات الصلاة' : 'Prayer Times'}
              </button>
              <button
                onClick={() => setScheduleTab('daily')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  scheduleTab === 'daily'
                    ? 'bg-[#C9A84C] text-[#0D0D0D]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📅 {lang === 'ar' ? 'جدولي اليومي' : 'Daily Schedule'}
              </button>
            </div>

            {scheduleTab === 'prayer' && <PrayerSchedule lang={lang} timezone={settingsTimezone} />}
            {scheduleTab === 'daily' && <ScheduleBuilder userId={currentUser.id} lang={lang} />}
          </div>
        )}

        {/* VIEW 4: LEADERBOARD PAGE */}
        {route === '#/leaderboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <div className="w-12 h-12 bg-[#C9A84C]/10 rounded-2xl border border-[#C9A84C]/30 flex items-center justify-center mx-auto text-[#C9A84C]">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">{lang === 'ar' ? 'لوحة الصدارة والالتزام العامة' : 'Leaderboard and Streaks'}</h2>
              <p className="text-xs md:text-sm text-gray-400">
                {lang === 'ar' ? 'لوحة شرف عامة تضم كافة الفرسان النشطين في تحدي البزاوي الـ 30' : 'Honoring the committed champions of the ElBazawi 30-Day challenge.'}
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-gray-500 absolute top-1/2 right-4 -translate-y-1/2" />
                  <input
                    type="text"
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                    placeholder={lang === 'ar' ? 'ابحث عن اسم أحد المشتركين...' : 'Search participants...'}
                    className="w-full bg-[#121212] border border-white/5 rounded-2xl pr-12 pl-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                  />
                </div>
                
                <button 
                  onClick={() => setRefreshTrigger(p => p + 1)}
                  className="bg-[#121212] border border-white/10 hover:bg-white/5 text-white text-xs px-4 py-3 rounded-2xl font-bold transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تحديث البيانات' : 'Refresh data'}</span>
                </button>
              </div>

              {leaderboardUsers.filter(u => !u.email?.includes("@elbezawy.com")).length === 0 && leaderboardUsers.length >= 3 ? null : leaderboardUsers.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 items-end">
                  <div className="bg-[#151515] border border-gray-400/20 rounded-3xl p-6 text-center shadow-xl md:order-1 relative overflow-hidden order-2">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400" />
                    <span className="text-3xl block mb-2">🥈</span>
                    <h4 className="font-extrabold text-white text-base truncate">{leaderboardUsers[1]?.name}</h4>
                    <div className="mt-4 bg-[#222] rounded-2xl py-3 px-4">
                      <div className="text-2xl font-bold text-gray-300">{n(leaderboardUsers[1]?.current_streak || 0)} {t('schedule.streak')}</div>
                    </div>
                    <div className="mt-3 text-[11px] text-[#C9A84C] font-semibold">
                      {t('schedule.today')} {n(leaderboardUsers[1]?.day_number)} {lang === 'ar' ? 'من ٣٠' : 'of 30'}
                    </div>
                  </div>

                  <div className="bg-[#181818] border-2 border-[#C9A84C] rounded-3xl p-8 text-center shadow-2xl md:order-2 order-1 relative overflow-hidden -translate-y-2 md:-translate-y-4">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#C9A84C]" />
                    <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/40 text-[#C9A84C] px-3 py-1 rounded-full text-[10px] font-black inline-block mb-3 tracking-widest uppercase">
                      {lang === 'ar' ? 'متصدر التحدي 👑' : 'Top Spot 👑'}
                    </div>
                    <span className="text-4xl block mb-2">🥇</span>
                    <h4 className="font-black text-white text-lg truncate">{leaderboardUsers[0]?.name}</h4>
                    <div className="mt-4 bg-[#C9A84C]/10 rounded-2xl py-4 px-4 border border-[#C9A84C]/25">
                      <div className="text-3xl font-extrabold text-[#C9A84C]">{n(leaderboardUsers[0]?.current_streak || 0)} {t('schedule.streak')}</div>
                    </div>
                    <div className="mt-3 text-xs text-[#C9A84C] font-black">
                      {t('schedule.today')} {n(leaderboardUsers[0]?.day_number)} {lang === 'ar' ? 'من ٣٠' : 'of 30'}
                    </div>
                  </div>

                  <div className="bg-[#151515] border border-amber-800/30 rounded-3xl p-6 text-center shadow-xl md:order-3 relative overflow-hidden order-3">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-800" />
                    <span className="text-3xl block mb-2">🥉</span>
                    <h4 className="font-extrabold text-white text-base truncate">{leaderboardUsers[2]?.name}</h4>
                    <div className="mt-4 bg-[#222] rounded-2xl py-3 px-4">
                      <div className="text-2xl font-bold text-amber-600">{n(leaderboardUsers[2]?.current_streak || 0)} {t('schedule.streak')}</div>
                    </div>
                    <div className="mt-3 text-[11px] text-[#C9A84C] font-semibold">
                      {t('schedule.today')} {n(leaderboardUsers[2]?.day_number)} {lang === 'ar' ? 'من ٣٠' : 'of 30'}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/5">
                  <h4 className="font-bold text-white text-sm">{lang === 'ar' ? 'ترتيب المشتركين الكلي' : 'All Participants Rankings'}</h4>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-[#181818] border-b border-white/5 text-gray-400 font-bold text-xs uppercase text-start">
                        <th className="py-4 px-6 text-center">{lang === 'ar' ? 'الترتيب' : 'Rank'}</th>
                        <th className="py-4 px-6">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</th>
                        <th className="py-4 px-6 text-center">{lang === 'ar' ? 'اليوم بالتحدي' : 'Active Day'}</th>
                        <th className="py-4 px-6 text-center">{lang === 'ar' ? 'السلسلة الحالية' : 'Current Streak'}</th>
                        <th className="py-4 px-6 text-center">{lang === 'ar' ? 'أطول سلسلة قياسية' : 'Longest Streak'}</th>
                        <th className="py-4 px-6 text-center">{lang === 'ar' ? 'إجمالي المهام المنجزة' : 'Total Completed'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-start">
                      {leaderboardUsers
                        .filter(u => u.name.toLowerCase().includes(leaderboardSearch.toLowerCase()))
                        .map((user, index) => {
                          const isTop3 = index < 3;
                          const bgStyle = isTop3 
                            ? index === 0 
                              ? 'bg-[#C9A84C]/5 text-[#C9A84C]' 
                              : index === 1 
                                ? 'bg-gray-400/5 text-gray-300' 
                                : 'bg-amber-900/5 text-amber-600'
                            : 'hover:bg-white/5';

                          return (
                            <tr key={user.id} className={`transition ${bgStyle}`}>
                              <td className="py-4 px-6 text-center font-bold">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : n(index + 1)}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#222] border border-white/5 flex items-center justify-center font-bold text-xs text-white">
                                    {user.name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-white block">{user.name}</span>
                                    <span className="text-[10px] text-gray-500 block">{lang === 'ar' ? 'منطقة' : 'TZ'}: {user.timezone}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center font-semibold text-gray-300">
                                {t('schedule.today')} {n(user.day_number)}
                              </td>
                              <td className="py-4 px-6 text-center font-black">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                                  user.current_streak > 0 
                                    ? 'bg-[#C9A84C]/15 text-[#C9A84C]' 
                                    : 'bg-red-500/10 text-red-400'
                                }`}>
                                  <Flame className="w-3.5 h-3.5 fill-current" />
                                  {n(user.current_streak)} {lang === 'ar' ? 'أيام' : 'days'}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center text-gray-400">
                                {n(user.longest_streak)} {lang === 'ar' ? 'يوم' : 'day'}
                              </td>
                              <td className="py-4 px-6 text-center font-bold text-[#C9A84C]">
                                {n(user.total_completed)}
                              </td>
                            </tr>
                          );
                        })}

                      {leaderboardUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-3xl">🏆</span>
                              <span className="font-bold text-gray-400">
                                {lang === 'ar' ? 'لا يوجد مشتركون بعد' : 'No participants yet'}
                              </span>
                              <span className="text-xs text-gray-600">
                                {lang === 'ar' ? 'سيظهر المشتركون هنا بعد تسجيل دخولهم' : 'Participants will appear here after they sign in'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ADMIN PANEL PAGE */}
        {route === '#/admin' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-[#121212] border border-amber-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest">
                    <Shield className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'لوحة التحكم الإدارية' : 'Admin Control Panel'}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">{lang === 'ar' ? 'إدارة المشتركين والإثباتات المصورة' : 'Manage Participants and Proofs'}</h2>
                  <p className="text-xs text-gray-400">{lang === 'ar' ? 'تتيح لك كمسؤول تفعيل/تعطيل الحسابات، رفض صور إثبات المهام، أو تأكيدها لضبط سلاسل المتسابقين.' : 'Review photo proofs, manage users and lock statuses.'}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      localStorage.clear();
                      alert(lang === 'ar' ? 'تمت تهيئة وتصفير قواعد البيانات كلياً للبدء من جديد.' : 'Local database has been reset.');
                      window.location.reload();
                    }}
                    className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-xs px-3 py-2 rounded-xl transition font-bold"
                  >
                    {lang === 'ar' ? 'تفريغ الذاكرة' : 'Clear Database'}
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-2">
              <button
                onClick={() => setAdminTab('users')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  adminTab === 'users' 
                    ? 'bg-[#C9A84C] text-[#0D0D0D]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {lang === 'ar' ? 'المشتركين' : 'Participants'}
              </button>
              <button
                onClick={() => setAdminTab('photos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  adminTab === 'photos' 
                    ? 'bg-[#C9A84C] text-[#0D0D0D]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('admin.review')} 📸
              </button>
            </div>

            {/* TAB: Users */}
            {adminTab === 'users' && (
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#161616]">
                    <h4 className="font-bold text-white text-sm">{lang === 'ar' ? 'كافة المشتركين المسجلين' : 'All Registered Users'}</h4>
                    <div className="relative w-48">
                      <Search className="w-4 h-4 text-gray-500 absolute top-1/2 right-3 -translate-y-1/2" />
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        placeholder={lang === 'ar' ? 'تصفية بالاسم...' : 'Filter by name...'}
                        className="w-full bg-[#222] border border-white/5 rounded-lg pr-9 pl-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-[#181818] border-b border-white/5 text-gray-400 font-bold uppercase text-start">
                          <th className="py-3 px-4">{lang === 'ar' ? 'المشترك' : 'User'}</th>
                          <th className="py-3 px-4 text-center">{lang === 'ar' ? 'اليوم' : 'Day'}</th>
                          <th className="py-3 px-4 text-center">{lang === 'ar' ? 'السلسلة' : 'Streak'}</th>
                          <th className="py-3 px-4 text-center">{lang === 'ar' ? 'نسبة الإنجاز' : 'Completion'}</th>
                          <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                          <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الإجراء' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-start">
                        {adminUsers
                          .filter(u => u.name.toLowerCase().includes(adminSearch.toLowerCase()))
                          .map(user => (
                            <tr 
                              key={user.id} 
                              onClick={() => setSelectedAdminUser(user)}
                              className={`cursor-pointer transition ${
                                selectedAdminUser?.id === user.id ? 'bg-[#C9A84C]/10 text-white font-bold' : 'hover:bg-white/5'
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div>
                                  <span className="font-bold text-white block text-xs">{user.name}</span>
                                  <span className="text-[10px] text-gray-500 block truncate max-w-[200px]">{user.email}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">{n(user.day_number)} / {n(30)}</td>
                              <td className="py-3 px-4 text-center font-bold text-[#C9A84C]">{n(user.current_streak)} {lang === 'ar' ? 'يوم' : 'days'}</td>
                              <td className="py-3 px-4 text-center">{user.completion_rate}%</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                                  user.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {user.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleAdminToggleUser(user.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                      user.is_active 
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' 
                                        : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                                    }`}
                                  >
                                    {user.is_active ? (lang === 'ar' ? 'تعطيل' : 'Disable') : (lang === 'ar' ? 'تنشيط' : 'Enable')}
                                  </button>
                                  <button
                                    onClick={() => setSelectedAdminUser(user)}
                                    className="bg-white/5 hover:bg-white/10 text-gray-300 p-1 rounded transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6 text-start">
                  {selectedAdminUser ? (
                    <div className="bg-[#121212] border border-[#C9A84C]/30 rounded-3xl p-6 space-y-5 shadow-xl">
                      <div className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/25 px-2 py-0.5 rounded-full font-bold">
                            {lang === 'ar' ? 'المشترك المحدد للتعديل' : 'Selected Participant'}
                          </span>
                          <button onClick={() => setSelectedAdminUser(null)} className="text-xs text-gray-400 hover:text-white transition">
                            ✕
                          </button>
                        </div>
                        <h3 className="font-bold text-white text-base mt-2">{selectedAdminUser.name}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-[#181818] p-3 rounded-2xl border border-white/5">
                        <div>
                          <span className="text-[10px] text-gray-500 block">{t('schedule.streak')}</span>
                          <span className="text-sm font-bold text-[#C9A84C]">{n(selectedAdminUser.current_streak)} {lang === 'ar' ? 'يوم' : 'days'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">{lang === 'ar' ? 'المهام الكلية' : 'Total Progress'}</span>
                          <span className="text-sm font-bold text-white">{t('schedule.today')} {n(selectedAdminUser.day_number)} • {selectedAdminUser.completion_rate}%</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-white text-xs">{lang === 'ar' ? `مهام اليوم ${n(selectedAdminUser.day_number)} للمشترك` : `Day ${n(selectedAdminUser.day_number)} tasks`}</h4>
                        
                        {selectedAdminUser.tasks && selectedAdminUser.tasks.map((task: any, index: number) => (
                          <div key={task.id} className="bg-[#1a1a1a] border border-white/5 p-3 rounded-xl space-y-3 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[9px] text-[#C9A84C] block">{lang === 'ar' ? `المهمة ${n(index + 1)}` : `Task ${n(index + 1)}`}</span>
                                <span className="font-bold text-white block mt-0.5">{getLocalizedTaskTitle(task, lang)}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                task.completed ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {task.completed ? (lang === 'ar' ? 'مكتملة' : 'Completed') : (lang === 'ar' ? 'قيد الانتظار' : 'Pending')}
                              </span>
                            </div>

                            {task.completed && task.photo_url ? (
                              <div className="space-y-2">
                                <div className="aspect-[16/9] rounded-lg overflow-hidden bg-black/40 relative border border-white/5">
                                  <img src={task.photo_url} alt="" className="w-full h-full object-cover" />
                                </div>
                                <button
                                  onClick={() => handleAdminOverride(task.id, false)}
                                  className="w-full bg-red-500/15 hover:bg-red-500/25 text-red-400 py-1.5 px-3 rounded-lg font-bold text-[10px] transition text-center"
                                >
                                  {lang === 'ar' ? 'رفض / إلغاء الإثبات' : 'Reject Proof'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAdminOverride(task.id, true)}
                                className="w-full bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 text-[#C9A84C] py-1.5 px-3 rounded-lg font-bold text-[10px] transition text-center border border-[#C9A84C]/20"
                              >
                                {lang === 'ar' ? 'تجاوز المسؤول: وضع كمكتملة تلقائياً' : 'Admin: Mark Complete'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#121212]/50 border border-white/5 rounded-3xl p-6 text-center space-y-3 py-12">
                      <HelpCircle className="w-10 h-10 text-gray-600 mx-auto" />
                      <h4 className="text-sm font-bold text-gray-400">{lang === 'ar' ? 'لم يتم تحديد مشترك لعرض تفاصيله' : 'No participant selected'}</h4>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Photo Review */}
            {adminTab === 'photos' && (
              <div className="space-y-4 text-start">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{t('admin.review')}</h3>
                  <span className="text-[10px] text-gray-500">{n(photoSubmissions.length)} {lang === 'ar' ? 'إثبات مرفوع' : 'proofs uploaded'}</span>
                </div>

                {photoSubmissions.length === 0 ? (
                  <div className="bg-[#121212] border border-white/5 rounded-3xl p-12 text-center">
                    <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-gray-400">{lang === 'ar' ? 'لا توجد إثباتات مصورة مرفوعة بعد' : 'No photo proofs yet'}</h4>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {photoSubmissions.map((submission) => (
                      <div key={submission.id} className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="aspect-square bg-black/40 relative">
                          <img src={submission.photo_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{submission.user_name}</span>
                            <span className="text-[9px] text-gray-500">{t('schedule.today')} {n(submission.day_number)}</span>
                          </div>
                          <span className="text-[10px] text-[#C9A84C] block">{getLocalizedTaskTitle(submission, lang)}</span>

                          {rejectingTaskId === submission.id ? (
                            <div className="space-y-2 pt-1">
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder={lang === 'ar' ? 'سبب الرفض...' : 'Reason...'}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleAdminRejectPhoto(submission.id)} className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 py-1.5 px-2 rounded-lg text-[10px] font-bold transition">
                                  {lang === 'ar' ? 'تأكيد الرفض' : 'Confirm'}
                                </button>
                                <button onClick={() => { setRejectingTaskId(null); setRejectReason(''); }} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-1.5 px-2 rounded-lg text-[10px] font-bold transition">
                                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => alert(lang === 'ar' ? 'تم قبول الإثبات ✅' : 'Proof accepted ✅')} className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" />
                                {t('admin.accept')}
                              </button>
                              <button onClick={() => { setRejectingTaskId(submission.id); setRejectReason(''); }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1">
                                <X className="w-3 h-3" />
                                {t('admin.reject')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-[#0b0b0b] border-t border-white/5 py-8 mt-12 text-center text-xs text-gray-600">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-bold text-gray-500">{lang === 'ar' ? 'تحدي البزاوي الـ 30 © ٢٠٢٦ • تصميم فاخر باللون الذهبي الإسلامي والداكن' : 'ElBezawy 30-Day Challenge © 2026 • Premium Islamic Gold & Dark theme'}</p>
        </div>
      </footer>

      {/* MODAL: PROOF UPLOAD */}
      {activeUploadTask && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-[#161616] border border-[#C9A84C]/35 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#C9A84C]" />
            
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-white text-base">{lang === 'ar' ? 'رفع إثبات إنجاز المهمة' : 'Upload Task Proof'}</h3>
                <button 
                  onClick={() => {
                    setActiveUploadTask(null);
                    setSelectedFile(null);
                    setSelectedPresetUrl('');
                    setUploadError('');
                  }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#1e1e1e] p-3 rounded-2xl border border-white/5 text-start">
                <span className="text-[10px] text-[#C9A84C] font-bold block uppercase">{lang === 'ar' ? 'المهمة المحددة' : 'Selected Task'}</span>
                <span className="text-sm font-bold text-white block mt-0.5">{getLocalizedTaskTitle(activeUploadTask, lang)}</span>
              </div>

              <form onSubmit={handleTaskCompleteSubmit} className="space-y-4 text-start">
                
                {currentUser?.is_admin && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400">
                        {lang === 'ar' ? 'صورة سريعة جاهزة للاختبار الفوري' : 'Quick Preset For Admin Testing'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_PROOFS.map((p, i) => {
                          const IconComponent = p.icon;
                          const isSelected = selectedPresetUrl === p.url;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSelectedPresetUrl(p.url);
                                setSelectedFile(null);
                                setUploadError('');
                              }}
                              className={`p-2 bg-[#222] border rounded-xl flex flex-col items-center justify-center text-center transition gap-1.5 ${
                                isSelected 
                                  ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' 
                                  : 'border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                              }`}
                            >
                              <IconComponent className="w-4 h-4 shrink-0" />
                              <span className="text-[9px] font-bold truncate w-full">{lang === 'ar' ? p.name : p.name_en}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink mx-4 text-gray-500 text-[10px] uppercase font-bold">{lang === 'ar' ? 'أو' : 'OR'}</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>
                  </>
                )}

                {/* Native File selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400">
                    {lang === 'ar' ? 'رفع صورة إثبات من جهازك' : 'Upload photo from your device'}
                  </label>
                  <div className="bg-[#1a1a1a] border border-dashed border-white/10 hover:border-[#C9A84C]/40 rounded-2xl p-4 text-center cursor-pointer relative transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setSelectedPresetUrl('');
                          setUploadError('');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1.5" />
                    <span className="text-xs text-gray-400 font-semibold block">
                      {selectedFile ? selectedFile.name : (lang === 'ar' ? 'اختر ملف صورة (PNG, JPG)' : 'Choose image file (PNG, JPG)')}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-0.5 block">{lang === 'ar' ? 'الحد الأقصى للملف: ٥ ميجابايت' : 'Max file size: 5MB'}</span>
                  </div>
                </div>

                {/* Validation message */}
                {validationMessage && (
                  <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] p-2.5 rounded-xl text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0 animate-spin" />
                    <span>{validationMessage}</span>
                  </div>
                )}

                {/* Error message */}
                {uploadError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-xs flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Submit & Cancel */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveUploadTask(null);
                      setSelectedFile(null);
                      setSelectedPresetUrl('');
                      setUploadError('');
                      setValidationMessage('');
                    }}
                    className="flex-1 bg-[#222] hover:bg-[#333] text-xs text-white py-2.5 rounded-xl font-bold transition"
                  >
                    {lang === 'ar' ? 'تراجع' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 bg-[#C9A84C] hover:bg-[#b0913e] disabled:opacity-50 text-[#0D0D0D] py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    {isUploading ? (lang === 'ar' ? 'جاري الحفظ والرفع...' : 'Uploading...') : (lang === 'ar' ? 'حفظ وإكمال المهمة ✅' : 'Submit Proof ✅')}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Widget */}
      <ChatWidget />

    </div>
  );
}