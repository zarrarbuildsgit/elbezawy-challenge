import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getAdhanTimings, fetchAndCacheAdhan, type AdhanTimings } from '../lib/tasks'

// ─── Types ───────────────────────────────────────────────────────────
interface ScheduleBuilderProps {
  userId: string
  lang: 'ar' | 'en'
}

type CategoryKey =
  | 'workout'
  | 'study'
  | 'work'
  | 'eat'
  | 'sleep'
  | 'commute'
  | 'family'
  | 'rest'
  | 'goals_review'
  | 'custom'

type FixedBlockKey =
  | 'fajr'
  | 'adhkar'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha'
  | 'quran'

type BlockValue = FixedBlockKey | CategoryKey | null

// ─── Template Schedules ──────────────────────────────────────────────
type TemplateKey = 'balanced' | 'student' | 'professional' | 'ramadan'

const TEMPLATES: Record<TemplateKey, {
  labelEn: string; labelAr: string; emoji: string; descEn: string; descAr: string
  schedule: Record<number, CategoryKey>
}> = {
  balanced: {
    labelEn: 'Balanced Day', labelAr: 'يوم متوازن', emoji: '⚖️',
    descEn: 'Work, rest, and worship in harmony', descAr: 'عمل وراحة وعبادة بتوازن',
    schedule: { 420: 'eat', 435: 'eat', 450: 'commute', 465: 'commute', 540: 'work', 555: 'work', 570: 'work', 585: 'work', 600: 'work', 615: 'work', 630: 'work', 645: 'work', 660: 'work', 675: 'work', 690: 'work', 705: 'work', 720: 'work', 735: 'work', 750: 'eat', 765: 'eat', 810: 'work', 825: 'work', 840: 'work', 855: 'work', 870: 'work', 885: 'work', 900: 'work', 915: 'work', 930: 'work', 945: 'work', 990: 'study', 1005: 'study', 1020: 'study', 1035: 'study', 1050: 'family', 1065: 'family', 1080: 'family', 1095: 'family', 1140: 'eat', 1155: 'eat', 1170: 'family', 1185: 'family', 1260: 'sleep', 1275: 'sleep', 1290: 'sleep', 1305: 'sleep', 1320: 'sleep', 1335: 'sleep', 1350: 'sleep', 1365: 'sleep' },
  },
  student: {
    labelEn: 'Student Day', labelAr: 'يوم الطالب', emoji: '🎓',
    descEn: 'Study-focused with breaks', descAr: 'تركيز على الدراسة مع استراحات',
    schedule: { 420: 'eat', 435: 'eat', 450: 'commute', 465: 'commute', 540: 'study', 555: 'study', 570: 'study', 585: 'study', 600: 'study', 615: 'study', 630: 'study', 645: 'study', 660: 'study', 675: 'rest', 690: 'study', 705: 'study', 720: 'study', 735: 'study', 750: 'eat', 765: 'eat', 810: 'study', 825: 'study', 840: 'study', 855: 'study', 870: 'study', 885: 'study', 900: 'study', 915: 'study', 930: 'study', 945: 'workout', 960: 'study', 975: 'study', 990: 'rest', 1005: 'rest', 1020: 'study', 1035: 'study', 1050: 'family', 1065: 'family', 1080: 'family', 1095: 'family', 1140: 'eat', 1155: 'eat', 1170: 'study', 1185: 'study', 1260: 'sleep', 1275: 'sleep', 1290: 'sleep', 1305: 'sleep', 1320: 'sleep', 1335: 'sleep', 1350: 'sleep', 1365: 'sleep' },
  },
  professional: {
    labelEn: 'Professional', labelAr: 'يوم المحترف', emoji: '💼',
    descEn: 'Career-focused with structured blocks', descAr: 'تركيز مهني مع فترات منظمة',
    schedule: { 420: 'eat', 435: 'eat', 450: 'commute', 465: 'commute', 540: 'work', 555: 'work', 570: 'work', 585: 'work', 600: 'work', 615: 'work', 630: 'work', 645: 'work', 660: 'work', 675: 'work', 690: 'work', 705: 'work', 720: 'work', 735: 'work', 750: 'eat', 765: 'eat', 770: 'work', 810: 'work', 825: 'work', 840: 'work', 855: 'work', 870: 'work', 885: 'work', 900: 'work', 915: 'work', 930: 'work', 945: 'work', 990: 'work', 1005: 'work', 1020: 'workout', 1035: 'workout', 1050: 'workout', 1065: 'workout', 1080: 'family', 1095: 'family', 1140: 'eat', 1155: 'eat', 1170: 'family', 1185: 'family', 1260: 'sleep', 1275: 'sleep', 1290: 'sleep', 1305: 'sleep', 1320: 'sleep', 1335: 'sleep', 1350: 'sleep', 1365: 'sleep' },
  },
  ramadan: {
    labelEn: 'Ramadan Mode', labelAr: 'نمط رمضان', emoji: '🌙',
    descEn: 'Suhoor, Ibadah, and rest schedule', descAr: 'جدول السحور والعبادة والراحة',
    schedule: { 300: 'eat', 315: 'eat', 420: 'sleep', 435: 'sleep', 450: 'sleep', 465: 'sleep', 480: 'sleep', 495: 'sleep', 510: 'sleep', 525: 'sleep', 540: 'sleep', 555: 'sleep', 570: 'sleep', 585: 'sleep', 600: 'sleep', 615: 'sleep', 630: 'sleep', 645: 'sleep', 660: 'sleep', 675: 'sleep', 690: 'sleep', 705: 'sleep', 720: 'sleep', 735: 'sleep', 750: 'sleep', 765: 'sleep', 810: 'work', 825: 'work', 840: 'work', 855: 'work', 870: 'work', 885: 'work', 900: 'work', 915: 'work', 930: 'work', 945: 'rest', 990: 'rest', 1005: 'rest', 1020: 'study', 1035: 'study', 1050: 'study', 1065: 'rest', 1080: 'rest', 1095: 'rest', 1140: 'eat', 1155: 'eat', 1170: 'family', 1185: 'family', 1260: 'sleep', 1275: 'sleep', 1290: 'sleep', 1305: 'sleep', 1320: 'sleep', 1335: 'sleep', 1350: 'sleep', 1365: 'sleep' },
  },
}

// ─── Constants ───────────────────────────────────────────────────────
const START_HOUR = 3
const END_HOUR = 23
const BLOCK_MINUTES = 15
const BLOCK_HEIGHT_PX = 36

const CATEGORIES: Record<CategoryKey, {
  emoji: string; labelEn: string; labelAr: string; color: string; bg: string; bgStrong: string
}> = {
  workout:      { emoji: '🏋️', labelEn: 'Workout',       labelAr: 'تمرين',          color: '#E87461', bg: 'rgba(232,116,97,0.12)',  bgStrong: 'rgba(232,116,97,0.25)' },
  study:        { emoji: '📚', labelEn: 'Study',          labelAr: 'دراسة',          color: '#6EC1A7', bg: 'rgba(110,193,167,0.12)', bgStrong: 'rgba(110,193,167,0.25)' },
  work:         { emoji: '💼', labelEn: 'Work',            labelAr: 'عمل',            color: '#7BA7CC', bg: 'rgba(123,167,204,0.12)', bgStrong: 'rgba(123,167,204,0.25)' },
  eat:          { emoji: '🍽️', labelEn: 'Eat',             labelAr: 'أكل',            color: '#D4A76A', bg: 'rgba(212,167,106,0.12)', bgStrong: 'rgba(212,167,106,0.25)' },
  sleep:        { emoji: '😴', labelEn: 'Sleep',           labelAr: 'نوم',            color: '#9B8EC4', bg: 'rgba(155,142,196,0.12)', bgStrong: 'rgba(155,142,196,0.25)' },
  commute:      { emoji: '🚗', labelEn: 'Commute',         labelAr: 'تنقل',           color: '#7CC4A8', bg: 'rgba(124,196,168,0.12)', bgStrong: 'rgba(124,196,168,0.25)' },
  family:       { emoji: '👨‍👩‍👧', labelEn: 'Family',          labelAr: 'عائلة',          color: '#D98FB3', bg: 'rgba(217,143,179,0.12)', bgStrong: 'rgba(217,143,179,0.25)' },
  rest:         { emoji: '📵', labelEn: 'Rest',            labelAr: 'راحة',           color: '#8DB4C9', bg: 'rgba(141,180,201,0.12)', bgStrong: 'rgba(141,180,201,0.25)' },
  goals_review: { emoji: '🎯', labelEn: 'Goals Review',    labelAr: 'مراجعة الأهداف', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  bgStrong: 'rgba(201,168,76,0.25)' },
  custom:       { emoji: '➕', labelEn: 'Custom',          labelAr: 'مخصص',           color: '#A0A0A0', bg: 'rgba(160,160,160,0.12)', bgStrong: 'rgba(160,160,160,0.25)' },
}

const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

// Default static fallback (used before Adhan loads)
const FIXED_BLOCKS_DEFAULT = {
  fajr:    { startMin: 300,  endMin: 375,  labelEn: 'Fajr Prayer',    labelAr: 'صلاة الفجر',     emoji: '🕌' },
  adhkar:  { startMin: 375,  endMin: 405,  labelEn: 'Morning Adhkar', labelAr: 'أذكار الصباح',   emoji: '🤲' },
  dhuhr:   { startMin: 780,  endMin: 810,  labelEn: 'Dhuhr Prayer',   labelAr: 'صلاة الظهر',     emoji: '🕌' },
  asr:     { startMin: 960,  endMin: 990,  labelEn: 'Asr Prayer',     labelAr: 'صلاة العصر',     emoji: '🕌' },
  maghrib: { startMin: 1110, endMin: 1140, labelEn: 'Maghrib Prayer', labelAr: 'صلاة المغرب',    emoji: '🕌' },
  isha:    { startMin: 1200, endMin: 1230, labelEn: 'Isha Prayer',    labelAr: 'صلاة العشاء',    emoji: '🕌' },
  quran:   { startMin: 1230, endMin: 1290, labelEn: 'Quran',          labelAr: 'القرآن الكريم',  emoji: '📖' },
}

const buildFixedBlocks = (adhan: AdhanTimings) => {
  const fajrMin    = timeToMin(adhan.Fajr)
  const sunriseMin = timeToMin(adhan.Sunrise)
  const dhuhrMin   = timeToMin(adhan.Dhuhr)
  const asrMin     = timeToMin(adhan.Asr)
  const maghribMin = timeToMin(adhan.Maghrib)
  const ishaMin    = timeToMin(adhan.Isha)
  return {
    fajr:    { startMin: fajrMin,          endMin: sunriseMin,       labelEn: 'Fajr Prayer',    labelAr: 'صلاة الفجر',     emoji: '🕌' },
    adhkar:  { startMin: sunriseMin,       endMin: sunriseMin + 30,  labelEn: 'Morning Adhkar', labelAr: 'أذكار الصباح',   emoji: '🤲' },
    dhuhr:   { startMin: dhuhrMin,         endMin: dhuhrMin + 30,    labelEn: 'Dhuhr Prayer',   labelAr: 'صلاة الظهر',     emoji: '🕌' },
    asr:     { startMin: asrMin,           endMin: asrMin + 30,      labelEn: 'Asr Prayer',     labelAr: 'صلاة العصر',     emoji: '🕌' },
    maghrib: { startMin: maghribMin,       endMin: maghribMin + 30,  labelEn: 'Maghrib Prayer', labelAr: 'صلاة المغرب',    emoji: '🕌' },
    isha:    { startMin: ishaMin,          endMin: ishaMin + 30,     labelEn: 'Isha Prayer',    labelAr: 'صلاة العشاء',    emoji: '🕌' },
    quran:   { startMin: ishaMin + 30,     endMin: ishaMin + 90,     labelEn: 'Quran',          labelAr: 'القرآن الكريم',  emoji: '📖' },
  }
}

const FIXED_BLOCKS: Record<FixedBlockKey, {
  startMin: number; endMin: number; labelEn: string; labelAr: string; emoji: string
}> = FIXED_BLOCKS_DEFAULT

const GOLD = '#C9A84C'
const GOLD_BG = 'rgba(201,168,76,0.06)'
const GOLD_BORDER = 'rgba(201,168,76,0.4)'

const DAILY_QUOTES = [
  { ar: 'بسم الله الذي لا يضر مع اسمه شيء', en: 'In the name of Allah, with Whose name nothing can cause harm' },
  { ar: 'اللهم إني أسألك علماً نافعاً', en: 'O Allah, I ask You for beneficial knowledge' },
  { ar: 'إن مع العسر يسراً', en: 'Indeed, with hardship comes ease' },
  { ar: 'حسبنا الله ونعم الوكيل', en: 'Allah is sufficient for us, and He is the best Disposer of affairs' },
  { ar: 'لا حول ولا قوة إلا بالله', en: 'There is no power except with Allah' },
  { ar: 'اللهم اجعلني مقيم الصلاة ومن ذريتي', en: 'O Allah, make me establish prayer and from my descendants' },
  { ar: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة', en: 'Our Lord, give us good in this world and good in the Hereafter' },
  { ar: 'واعبد ربك حتى يأتيك اليقين', en: 'And worship your Lord until there comes to you the certainty' },
  { ar: 'فاذكروني أذكركم', en: 'Remember Me, and I will remember you' },
  { ar: 'إن الله مع الصابرين', en: 'Indeed, Allah is with the patient' },
  { ar: 'وقل رب زدني علماً', en: 'And say: My Lord, increase me in knowledge' },
  { ar: 'من توكل على الله فهو حسبه', en: 'Whoever relies upon Allah, He is sufficient for him' },
  { ar: 'الطهور شطر الإيمان', en: 'Cleanliness is half of faith' },
  { ar: 'لا تأسوا على ما فاتكم', en: 'Do not grieve over what has passed you by' },
]

// ─── Helpers ─────────────────────────────────────────────────────────
function toArDigits(n: number | string): string {
  return n.toString().split('').map(d => {
    const i = parseInt(d)
    return isNaN(i) ? d : '٠١٢٣٤٥٦٧٨٩'[i]
  }).join('')
}

function minuteToTimeStr(m: number, lang: 'ar' | 'en'): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  const hh = h.toString().padStart(2, '0')
  const mm = min.toString().padStart(2, '0')
  return lang === 'ar' ? `${toArDigits(hh)}:${toArDigits(mm)}` : `${hh}:${mm}`
}

function formatDuration(mins: number, lang: 'ar' | 'en'): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (lang === 'ar') {
    if (h > 0 && m > 0) return `${toArDigits(h)} س ${toArDigits(m)} د`
    if (h > 0) return `${toArDigits(h)} ساعة`
    return `${toArDigits(m)} دقيقة`
  }
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getAllBlockKeys(): number[] {
  const keys: number[] = []
  for (let m = START_HOUR * 60; m <= END_HOUR * 60 + 45; m += BLOCK_MINUTES) keys.push(m)
  return keys
}
const ALL_BLOCK_KEYS = getAllBlockKeys() // stable module-level const

function isFixedBlock(minute: number, blocks = FIXED_BLOCKS_DEFAULT): FixedBlockKey | null {
  for (const [key, fb] of Object.entries(blocks)) {
    const snappedStart = Math.floor(fb.startMin / BLOCK_MINUTES) * BLOCK_MINUTES
    const snappedEnd   = Math.ceil(fb.endMin / BLOCK_MINUTES) * BLOCK_MINUTES
    if (minute >= snappedStart && minute < snappedEnd) return key as FixedBlockKey
  }
  return null
}

function getFixedBlockSpan(key: FixedBlockKey, blocks = FIXED_BLOCKS_DEFAULT): { start: number; count: number } {
  const fb = (blocks as any)[key]
  // Snap start to nearest 15-min slot, ceil end to cover full window
  const snappedStart = Math.floor(fb.startMin / BLOCK_MINUTES) * BLOCK_MINUTES
  const snappedEnd   = Math.ceil(fb.endMin / BLOCK_MINUTES) * BLOCK_MINUTES
  return { start: snappedStart, count: Math.max(1, (snappedEnd - snappedStart) / BLOCK_MINUTES) }
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDayHeader(date: Date, lang: 'ar' | 'en'): string {
  const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (lang === 'ar') return `${daysAr[date.getDay()]} ${toArDigits(date.getDate())} ${monthsAr[date.getMonth()]}`
  return `${daysEn[date.getDay()]}, ${monthsEn[date.getMonth()]} ${date.getDate()}`
}

// ─── Undo Stack ──────────────────────────────────────────────────────
interface UndoEntry {
  schedule: Record<number, string>
  customLabels: Record<number, string>
}

// ─── Component ───────────────────────────────────────────────────────
export default function ScheduleBuilder({ userId, lang }: ScheduleBuilderProps) {
  const isRtl = lang === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [schedule, setSchedule] = useState<Record<number, string>>({})
  const [customLabels, setCustomLabels] = useState<Record<number, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [adhanBlocks, setAdhanBlocks] = useState(() => buildFixedBlocks(getAdhanTimings()))
  const [adhanVersion, setAdhanVersion] = useState(0)

  // Fetch live Adhan times on mount
  useEffect(() => {
    fetchAndCacheAdhan().then(timings => {
      setAdhanBlocks(buildFixedBlocks(timings))
      setAdhanVersion(v => v + 1) // force all memos to recompute
    }).catch(() => {/* silent — keep default */})
  }, [])

  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([])
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [clearTarget, setClearTarget] = useState<number | null>(null)
  const [showClearAll, setShowClearAll] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [fixedTapFeedback, setFixedTapFeedback] = useState<number | null>(null)

  // Undo stack
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // ── New state variables ──
  const [completedBlocks, setCompletedBlocks] = useState<Record<number, boolean>>({})
  const [showCompletionMode, setShowCompletionMode] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)
  const [applyToWeek, setApplyToWeek] = useState(false)
  const [lastAssignedMin, setLastAssignedMin] = useState<number | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const dragRef = useRef<{ active: boolean; startMin: number; currentMins: Set<number> }>({ active: false, startMin: -1, currentMins: new Set() })
  const touchRef = useRef<{ startY: number; startMin: number; didScroll: boolean }>({ startY: 0, startMin: -1, didScroll: false })
  const selectedBlocksRef = useRef<number[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const scheduleImageRef = useRef<HTMLDivElement>(null)
  // Refs for stale-closure-safe pushUndo
  const scheduleRef = useRef<Record<number, string>>({})
  const customLabelsRef = useRef<Record<number, string>>({})

  const storageKey = `elbezawi_schedule_${userId}_${getDateKey(currentDate)}`

  // ── Toast helper ──
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  // ── Keep refs in sync for stale-closure-safe pushUndo ──
  useEffect(() => { scheduleRef.current = schedule }, [schedule])
  useEffect(() => { customLabelsRef.current = customLabels }, [customLabels])

  // ── Push to undo stack before change ──
  const pushUndo = useCallback(() => {
    setUndoStack(prev => {
      const next = [...prev, { schedule: { ...scheduleRef.current }, customLabels: { ...customLabelsRef.current } }]
      return next.slice(-20) // keep last 20
    })
  }, [])

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const entry = prev[prev.length - 1]
      setSchedule(entry.schedule)
      setCustomLabels(entry.customLabels)
      return prev.slice(0, -1)
    })
    showToast(isRtl ? 'تم التراجع' : 'Undone')
  }, [isRtl, showToast])

  // ── Persistence ──
  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        setSchedule(data.schedule || {})
        setCustomLabels(data.customLabels || {})
        setCompletedBlocks(data.completed || {})
      } catch { /* ignore */ }
    } else {
      setSchedule({})
      setCustomLabels({})
      setCompletedBlocks({})
    }
    setLoaded(true)
    setUndoStack([])
  }, [storageKey])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(storageKey, JSON.stringify({ schedule, customLabels, completed: completedBlocks }))
  }, [schedule, customLabels, completedBlocks, storageKey, loaded])

  // ── Current time ticker ──
  useEffect(() => {
    setNow(Date.now())
    const i = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(i)
  }, [])

  // ── Scroll detection ──
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const onScroll = () => {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
      const nowBlockTop = ((nowMin - START_HOUR * 60) / BLOCK_MINUTES) * BLOCK_HEIGHT_PX
      setShowScrollBtn(Math.abs(el.scrollTop - nowBlockTop + 100) > 200)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (undoStack.length > 0) undo()
      }
      if (e.key === 'Escape') {
        setSheetOpen(false); setSelectedBlocks([]); setClearTarget(null)
        setShowClearAll(false); setShowStats(false); setShowTemplates(false)
        setShowLegend(false); setShowExport(false); setShowDuplicate(false)
        setShowShortcuts(false); setShowCustomInput(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, undoStack])

  const allBlocks = ALL_BLOCK_KEYS

  type MergedBlock = { startMin: number; count: number; value: BlockValue; customLabel?: string }

  const renderBlocks: MergedBlock[] = useMemo(() => {
    const result: MergedBlock[] = []
    let i = 0
    while (i < allBlocks.length) {
      const minKey = allBlocks[i]
      const fixed = isFixedBlock(minKey, adhanBlocks)
      if (fixed) {
        const span = getFixedBlockSpan(fixed, adhanBlocks)
        if (minKey === span.start) result.push({ startMin: span.start, count: span.count, value: fixed })
        i += span.count
        continue
      }
      const cat = schedule[minKey] || null
      if (cat) {
        let count = 1
        while (i + count < allBlocks.length) {
          const nextMin = allBlocks[i + count]
          if (isFixedBlock(nextMin, adhanBlocks)) break
          if (schedule[nextMin] !== cat) break
          count++
        }
        result.push({ startMin: minKey, count, value: cat as CategoryKey, customLabel: cat === 'custom' ? customLabels[minKey] : undefined })
        i += count
      } else {
        result.push({ startMin: minKey, count: 1, value: null })
        i++
      }
    }
    return result
  }, [allBlocks, schedule, customLabels, adhanBlocks, adhanVersion])

  const stats = useMemo(() => {
    let scheduledMins = 0, fixedMins = 0
    const categoryMins: Record<string, number> = {}
    for (const block of renderBlocks) {
      const dur = block.count * BLOCK_MINUTES
      if (block.value) {
        scheduledMins += dur
        if (block.value in adhanBlocks) fixedMins += dur
        else categoryMins[block.value] = (categoryMins[block.value] || 0) + dur
      }
    }
    const totalAvailable = (END_HOUR - START_HOUR + 1) * 60
    const editableMins = totalAvailable - fixedMins
    const userScheduledMins = scheduledMins - fixedMins
    const freeMins = totalAvailable - scheduledMins
    const progressPercent = editableMins > 0 ? Math.round((userScheduledMins / editableMins) * 100) : 0

    // Completion tracking
    const userBlockMinutes = allBlocks.filter(m => schedule[m] && !isFixedBlock(m, adhanBlocks))
    const completedCount = userBlockMinutes.filter(m => completedBlocks[m]).length
    const totalUserBlocks = userBlockMinutes.length
    const completionPercent = totalUserBlocks > 0 ? Math.round((completedCount / totalUserBlocks) * 100) : 0

    return { scheduledMins, fixedMins, categoryMins, totalAvailable, editableMins, userScheduledMins, freeMins, progressPercent, completedCount, totalUserBlocks, completionPercent }
  }, [renderBlocks, allBlocks, schedule, completedBlocks, adhanBlocks, adhanVersion])

  const hasUserBlocks = useMemo(() => {
    return Object.keys(schedule).length > 0
  }, [schedule])

  const findMergedBlock = useCallback((minute: number): MergedBlock | undefined => {
    return renderBlocks.find(b => minute >= b.startMin && minute < b.startMin + b.count * BLOCK_MINUTES)
  }, [renderBlocks])

  const getBlockMinuteFromEvent = useCallback((e: React.PointerEvent | React.MouseEvent): number | null => {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top + (gridRef.current.scrollTop || 0)
    const idx = Math.floor(y / BLOCK_HEIGHT_PX)
    if (idx < 0 || idx >= allBlocks.length) return null
    return allBlocks[idx]
  }, [allBlocks])

  const getBlockMinuteFromMouseEvent = useCallback((e: React.MouseEvent): number | null => {
    if (!gridRef.current) return null
    const rect = gridRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top + (gridRef.current.scrollTop || 0)
    const idx = Math.floor(y / BLOCK_HEIGHT_PX)
    if (idx < 0 || idx >= allBlocks.length) return null
    return allBlocks[idx]
  }, [allBlocks])

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    // Only handle if not already processed by pointer events
    if (dragRef.current.active) return
    const minute = getBlockMinuteFromMouseEvent(e)
    if (minute === null) return
    const fixed = isFixedBlock(minute, adhanBlocks)
    if (fixed) {
      setFixedTapFeedback(minute)
      setTimeout(() => setFixedTapFeedback(null), 600)
      return
    }
    if (showCompletionMode && schedule[minute]) {
      const merged = findMergedBlock(minute)
      if (merged && merged.value && !(merged.value in adhanBlocks)) {
        setCompletedBlocks(prev => {
          const next = { ...prev }
          const isCompleted = next[merged.startMin]
          for (let i = 0; i < merged.count; i++) {
            const m = merged.startMin + i * BLOCK_MINUTES
            if (isCompleted) delete next[m]
            else next[m] = true
          }
          return next
        })
        navigator.vibrate?.(10)
        return
      }
    }
    if (schedule[minute]) {
      setClearTarget(minute)
      return
    }
    setSelectedBlocks([minute])
    selectedBlocksRef.current = [minute]
    setSheetOpen(true)
  }, [schedule, showCompletionMode, findMergedBlock, getBlockMinuteFromMouseEvent, adhanBlocks])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const minute = getBlockMinuteFromEvent(e)
    if (minute === null) return
    const fixed = isFixedBlock(minute, adhanBlocks)
    if (fixed) {
      setFixedTapFeedback(minute)
      setTimeout(() => setFixedTapFeedback(null), 600)
      return
    }
    // Completion mode: toggle completion instead of opening clear dialog
    if (showCompletionMode && schedule[minute]) {
      const merged = findMergedBlock(minute)
      if (merged && merged.value && !(merged.value in adhanBlocks)) {
        setCompletedBlocks(prev => {
          const next = { ...prev }
          const isCompleted = next[merged.startMin]
          for (let i = 0; i < merged.count; i++) {
            const m = merged.startMin + i * BLOCK_MINUTES
            if (isCompleted) delete next[m]
            else next[m] = true
          }
          return next
        })
        navigator.vibrate?.(10)
        return
      }
    }
    if (schedule[minute]) {
      setClearTarget(minute)
      return
    }
    const isTouch = e.pointerType === 'touch'
    if (isTouch) {
      // On touch: record position and pending block — DON'T open sheet yet
      // Wait for pointerUp to confirm it was a tap, not a scroll
      touchRef.current = { startY: e.clientY, startMin: minute, didScroll: false }
      setSheetOpen(false)
      return
    }
    dragRef.current = { active: true, startMin: minute, currentMins: new Set([minute]) }
    const newSel = [minute]
    setSelectedBlocks(newSel)
    selectedBlocksRef.current = newSel
    setSheetOpen(false)
  }, [getBlockMinuteFromEvent, schedule, showCompletionMode, findMergedBlock, adhanBlocks])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Touch scroll detection: if finger moved > 8px vertically, mark as scroll
    if (e.pointerType === 'touch') {
      if (Math.abs(e.clientY - touchRef.current.startY) > 8) {
        touchRef.current.didScroll = true
      }
      return // Don't drag-select on touch
    }
    if (!dragRef.current.active) return
    const minute = getBlockMinuteFromEvent(e)
    if (minute === null || isFixedBlock(minute, adhanBlocks)) return
    const minVal = Math.min(dragRef.current.startMin, minute)
    const maxVal = Math.max(dragRef.current.startMin, minute)
    const sel: number[] = allBlocks.filter(m => m >= minVal && m <= maxVal && !isFixedBlock(m, adhanBlocks))
    dragRef.current.currentMins = new Set(sel)
    setSelectedBlocks(sel)
    selectedBlocksRef.current = sel
  }, [getBlockMinuteFromEvent, allBlocks, adhanBlocks])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Touch tap: only open sheet if user didn't scroll
    if (e.pointerType === 'touch') {
      if (!touchRef.current.didScroll && touchRef.current.startMin !== -1) {
        const minute = touchRef.current.startMin
        setSelectedBlocks([minute])
        selectedBlocksRef.current = [minute]
        setSheetOpen(true)
      }
      touchRef.current = { startY: 0, startMin: -1, didScroll: false }
      return
    }
    if (dragRef.current.active) {
      dragRef.current.active = false
      const cur = selectedBlocksRef.current
      if (cur.length > 0) { setSelectedBlocks(cur); setSheetOpen(true) }
    }
  }, [])

  const assignCategory = useCallback((catKey: CategoryKey) => {
    if (catKey === 'custom') { setShowCustomInput(true); return }
    pushUndo()
    setSchedule(prev => { const next = { ...prev }; for (const m of selectedBlocks) next[m] = catKey; return next })
    setSheetOpen(false)
    setLastAssignedMin(selectedBlocks[0] ?? null)
    setTimeout(() => setLastAssignedMin(null), 300)
    setSelectedBlocks([])
    selectedBlocksRef.current = []
    navigator.vibrate?.(10)
    // Mark onboarding as seen after first block is assigned
    if (typeof window !== 'undefined' && !localStorage.getItem('elbezawi_onboarding_seen')) {
      localStorage.setItem('elbezawi_onboarding_seen', '1')
    }
  }, [selectedBlocks, pushUndo])

  const submitCustom = useCallback(() => {
    const label = customInput.trim().slice(0, 20)
    pushUndo()
    setSchedule(prev => { const next = { ...prev }; for (const m of selectedBlocks) next[m] = 'custom'; return next })
    if (label) setCustomLabels(prev => { const next = { ...prev }; for (const m of selectedBlocks) next[m] = label; return next })
    setSheetOpen(false); setSelectedBlocks([]); selectedBlocksRef.current = []
    setShowCustomInput(false); setCustomInput('')
    setLastAssignedMin(selectedBlocks[0] ?? null)
    setTimeout(() => setLastAssignedMin(null), 300)
    navigator.vibrate?.(10)
    if (typeof window !== 'undefined' && !localStorage.getItem('elbezawi_onboarding_seen')) {
      localStorage.setItem('elbezawi_onboarding_seen', '1')
    }
  }, [customInput, selectedBlocks, pushUndo])

  const clearBlock = useCallback((minute: number) => {
    const merged = findMergedBlock(minute)
    if (!merged || !merged.value) return
    pushUndo()
    setSchedule(prev => { const next = { ...prev }; for (let i = 0; i < merged.count; i++) delete next[merged.startMin + i * BLOCK_MINUTES]; return next })
    setCustomLabels(prev => { const next = { ...prev }; for (let i = 0; i < merged.count; i++) delete next[merged.startMin + i * BLOCK_MINUTES]; return next })
    // Also clear completion state for the removed block
    setCompletedBlocks(prev => { const next = { ...prev }; for (let i = 0; i < merged.count; i++) delete next[merged.startMin + i * BLOCK_MINUTES]; return next })
    setClearTarget(null)
    navigator.vibrate?.(10)
  }, [findMergedBlock, pushUndo])

  const clearAll = useCallback(() => {
    pushUndo()
    setSchedule({}); setCustomLabels({}); setCompletedBlocks({}); setShowClearAll(false)
    showToast(isRtl ? 'تم مسح الكل' : 'All cleared')
  }, [pushUndo, isRtl, showToast])

  const applyTemplate = useCallback((key: TemplateKey) => {
    pushUndo()
    const tpl = TEMPLATES[key]
    // Merge template with existing (template overwrites user blocks, fixed blocks stay)
    setSchedule(prev => {
      const next: Record<number, string> = {}
      // Only keep blocks not in template range and not overwritten
      for (const [k, v] of Object.entries(prev)) {
        const m = Number(k)
        if (!(m in tpl.schedule) && !isFixedBlock(m, adhanBlocks)) next[m] = v
      }
      // Apply template
      for (const [k, v] of Object.entries(tpl.schedule)) {
        if (!isFixedBlock(Number(k), adhanBlocks)) next[Number(k)] = v
      }
      return next
    })
    if (applyToWeek) {
      // Apply to all 7 days of the current week
      for (let i = 0; i < 7; i++) {
        const d = new Date(currentDate)
        d.setDate(d.getDate() - d.getDay() + i) // Sunday to Saturday
        const key = getDateKey(d)
        if (key === getDateKey(currentDate)) continue // already applied above
        const targetKey = `elbezawi_schedule_${userId}_${key}`
        const userSchedule: Record<number, string> = {}
        for (const [k, v] of Object.entries(tpl.schedule)) {
          if (!isFixedBlock(Number(k), adhanBlocks)) userSchedule[Number(k)] = v
        }
        localStorage.setItem(targetKey, JSON.stringify({ schedule: userSchedule, customLabels: {}, completed: {} }))
      }
      showToast(isRtl ? `تم تطبيق ${tpl.labelAr} على الأسبوع` : `Applied ${tpl.labelEn} to week`)
    } else {
      showToast(isRtl ? `تم تطبيق ${tpl.labelAr}` : `Applied ${tpl.labelEn}`)
    }
    setShowTemplates(false)
    setShowStats(false)
  }, [pushUndo, isRtl, showToast, applyToWeek, currentDate, userId])

  const duplicateDay = useCallback((targetDate: Date) => {
    const targetKey = `elbezawi_schedule_${userId}_${getDateKey(targetDate)}`
    // Copy only user-assigned blocks (not fixed blocks)
    const userSchedule: Record<number, string> = {}
    const userCustomLabels: Record<number, string> = {}
    for (const [k, v] of Object.entries(schedule)) {
      const m = Number(k)
      if (!isFixedBlock(m, adhanBlocks)) userSchedule[m] = v
    }
    for (const [k, v] of Object.entries(customLabels)) {
      const m = Number(k)
      if (!isFixedBlock(m, adhanBlocks) && schedule[m]) userCustomLabels[k] = v
    }
    // Merge with existing target date data
    const existing = localStorage.getItem(targetKey)
    let existingData = { schedule: {}, customLabels: {}, completed: {} }
    if (existing) {
      try { existingData = JSON.parse(existing) } catch { /* ignore */ }
    }
    const merged = {
      schedule: { ...existingData.schedule, ...userSchedule },
      customLabels: { ...existingData.customLabels, ...userCustomLabels },
      completed: existingData.completed || {},
    }
    localStorage.setItem(targetKey, JSON.stringify(merged))
    setShowDuplicate(false)
    showToast(`${isRtl ? 'تم النسخ إلى' : 'Copied to'} ${formatDayHeader(targetDate, lang)}`)
  }, [schedule, customLabels, userId, isRtl, lang, showToast])

  const scrollToNow = useCallback(() => {
    if (!gridRef.current) return
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    gridRef.current.scrollTo({ top: Math.max(0, ((nowMin - START_HOUR * 60) / BLOCK_MINUTES) * BLOCK_HEIGHT_PX - 100), behavior: 'smooth' })
  }, [])

  const goDate = useCallback((delta: number) => {
    setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + delta); return d })
  }, [])

  const goToday = useCallback(() => setCurrentDate(new Date()), [])

  const dailyQuote = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length]

  const exportAsImage = useCallback(() => {
    const canvas = document.createElement('canvas')
    const width = 600
    const blockH = 20
    const labelW = 60
    const headerH = 80
    const totalHeight = headerH + allBlocks.length * blockH + 40
    canvas.width = width
    canvas.height = totalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0D0D0D'
    ctx.fillRect(0, 0, width, totalHeight)

    // Header
    ctx.fillStyle = '#C9A84C'
    ctx.font = 'bold 18px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(`\u262A ${isRtl ? 'الجدول اليومي' : 'Daily Schedule'}`, width / 2, 30)
    ctx.font = '12px system-ui'
    ctx.fillStyle = '#aaa'
    ctx.fillText(formatDayHeader(currentDate, lang), width / 2, 50)
    ctx.fillStyle = '#666'
    ctx.font = '10px system-ui'
    ctx.fillText(`${stats.progressPercent}% ${isRtl ? 'م\u064Fجدول' : 'scheduled'}`, width / 2, 68)

    // Blocks
    for (const block of renderBlocks) {
      const y = headerH + ((block.startMin - START_HOUR * 60) / BLOCK_MINUTES) * blockH
      const h = block.count * blockH - 1
      const isFixed = block.value !== null && block.value in adhanBlocks
      const isCat = block.value !== null && !isFixed
      const x = isRtl ? 20 : labelW + 10
      const w = width - labelW - 30

      // Time label
      if (block.startMin % 60 === 0) {
        ctx.fillStyle = '#888'
        ctx.font = '9px monospace'
        ctx.textAlign = isRtl ? 'right' : 'left'
        const tx = isRtl ? width - 10 : 10
        ctx.fillText(minuteToTimeStr(block.startMin, lang), tx, y + blockH / 2 + 3)
      }

      if (isFixed) {
        const fb = adhanBlocks[block.value as FixedBlockKey]
        ctx.fillStyle = 'rgba(201,168,76,0.12)'
        ctx.fillRect(x, y, w, h)
        ctx.strokeStyle = 'rgba(201,168,76,0.4)'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, w, h)
        ctx.fillStyle = '#C9A84C'
        ctx.font = '10px system-ui'
        ctx.textAlign = isRtl ? 'right' : 'left'
        const label = `${fb.emoji} ${isRtl ? fb.labelAr : fb.labelEn}`
        ctx.fillText(label, isRtl ? x + w - 8 : x + 8, y + h / 2 + 3)
      } else if (isCat) {
        const cat = CATEGORIES[block.value as CategoryKey]
        ctx.fillStyle = cat.bgStrong
        ctx.fillRect(x, y, w, h)
        ctx.strokeStyle = cat.color + '50'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, w, h)
        ctx.fillStyle = cat.color
        ctx.font = '10px system-ui'
        ctx.textAlign = isRtl ? 'right' : 'left'
        const name = block.value === 'custom' && block.customLabel ? block.customLabel : (isRtl ? cat.labelAr : cat.labelEn)
        const completedMark = completedBlocks[block.startMin] ? '\u2713 ' : ''
        ctx.fillText(`${completedMark}${cat.emoji} ${name}`, isRtl ? x + w - 8 : x + 8, y + h / 2 + 3)
      }
    }

    // Footer
    ctx.fillStyle = '#444'
    ctx.font = '9px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('\u262A Elbezawi Schedule Builder', width / 2, totalHeight - 15)

    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schedule-${getDateKey(currentDate)}.png`
      a.click()
      URL.revokeObjectURL(url)
      showToast(isRtl ? 'تم حفظ الصورة!' : 'Image saved!')
    }, 'image/png')
  }, [renderBlocks, allBlocks, currentDate, isRtl, lang, stats, completedBlocks, showToast])

  const isToday = getDateKey(currentDate) === getDateKey(new Date())

  const nowDate = new Date(now)
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes()
  const nowVisible = isToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= (END_HOUR * 60 + 60)
  const nowTopPx = nowVisible ? (Math.floor((nowMinutes - START_HOUR * 60) / BLOCK_MINUTES) * BLOCK_HEIGHT_PX + (nowMinutes % BLOCK_MINUTES) / BLOCK_MINUTES * BLOCK_HEIGHT_PX) : -1

  const labels = {
    title: isRtl ? 'الجدول اليومي' : 'Daily Schedule',
    selectCategory: isRtl ? 'اختر الفئة' : 'Select Category',
    clear: isRtl ? 'مسح' : 'Clear',
    clearAll: isRtl ? 'مسح الكل' : 'Clear All',
    cancel: isRtl ? 'إلغاء' : 'Cancel',
    customPlaceholder: isRtl ? 'اكتب اسم النشاط...' : 'Enter activity name...',
    save: isRtl ? 'حفظ' : 'Save',
    scheduled: isRtl ? 'مُجدول' : 'Scheduled',
    free: isRtl ? 'حر' : 'Free',
    stats: isRtl ? 'الإحصائيات' : 'Stats',
    clearAllConfirm: isRtl ? 'هل تريد مسح جميع الفترات المخصصة؟' : 'Clear all custom time blocks?',
    fixedBlocks: isRtl ? 'الفترات الثابتة' : 'Fixed blocks',
    yourSchedule: isRtl ? 'جدولك' : 'Your schedule',
    timeBreakdown: isRtl ? 'توزيع الوقت' : 'Time Breakdown',
    todayLabel: isRtl ? 'اليوم' : 'Today',
    scrollToNow: isRtl ? 'الآن' : 'Now',
    templates: isRtl ? 'قوالب' : 'Templates',
    undo: isRtl ? 'تراجع' : 'Undo',
    dragHint: isRtl ? 'اسحب لتحديد عدة فترات' : 'Drag to select multiple slots',
    fixedBlockTap: isRtl ? 'هذه الفترة ثابتة' : 'This is a fixed block',
    lang: isRtl ? 'EN' : 'عربي',
    legend: isRtl ? 'دليل الألوان' : 'Legend',
    export: isRtl ? 'تصدير' : 'Export',
    exportCopied: isRtl ? 'تم النسخ!' : 'Copied!',
    streak: isRtl ? 'أيام متتالية' : 'day streak',
    weekDays: isRtl ? ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    // New labels
    completionMode: isRtl ? 'وضع الإنجاز' : 'Completion Mode',
    completed: isRtl ? 'مكتمل' : 'Completed',
    blocksDone: isRtl ? 'كتل مكتملة' : 'blocks done',
    duplicateDay: isRtl ? 'نسخ اليوم' : 'Duplicate Day',
    copyTo: isRtl ? 'نسخ إلى' : 'Copy to',
    copied: isRtl ? 'تم النسخ!' : 'Copied!',
    morning: isRtl ? 'صباح' : 'Morning',
    afternoon: isRtl ? 'ظهر' : 'Afternoon',
    evening: isRtl ? 'مساء' : 'Evening',
    welcomeTitle: isRtl ? 'مرحباً! 👋' : 'Welcome! 👋',
    welcomeSubtitle: isRtl ? 'اضغط على أي فترة فارغة لبدء التخطيط' : 'Tap any empty slot to start planning',
    saveImage: isRtl ? 'حفظ كصورة' : 'Save Image',
    applyToWeek: isRtl ? 'تطبيق على الأسبوع' : 'Apply to week',
    reassign: isRtl ? 'إعادة تعيين' : 'Reassign',
    shortcuts: isRtl ? 'اختصارات' : 'Shortcuts',
    shortcutUndo: isRtl ? 'تراجع' : 'Undo (Ctrl+Z)',
    shortcutEscape: isRtl ? 'إغلاق' : 'Close (Esc)',
    onboardingHint: isRtl ? 'اضغط هنا للبدء!' : 'Tap here to start!',
    clearBlockConfirm: isRtl ? 'هل تريد مسح هذه الفترة؟' : 'Clear this time block?',
  }

  const categoryKeys = Object.keys(CATEGORIES) as CategoryKey[]
  const charsLeft = 20 - customInput.length

  // ── Section dividers config ──
  const sectionDividers = [
    { minute: START_HOUR * 60, emoji: '🌅', label: labels.morning },
    { minute: 720, emoji: '☀️', label: labels.afternoon },
    { minute: 1020, emoji: '🌆', label: labels.evening },
  ]

  // ── Duplicate day targets (next 7 days) ──
  const duplicateTargets = useMemo(() => {
    const targets: { date: Date; key: string; label: string }[] = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + i)
      targets.push({ date: d, key: getDateKey(d), label: formatDayHeader(d, lang) })
    }
    return targets
  }, [currentDate, lang])

  return (
    <div dir={dir} className="relative w-full max-w-lg mx-auto select-none" style={{ color: '#E8E8E8', fontFamily: isRtl ? 'system-ui, -apple-system, sans-serif' : 'inherit' }}>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-semibold animate-toast-in"
          style={{ background: `${GOLD}dd`, color: '#0D0D0D', boxShadow: `0 4px 16px ${GOLD}44` }}>
          {toastMsg}
        </div>
      )}

      {/* ── Fixed block tap tooltip ── */}
      {fixedTapFeedback !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(201,168,76,0.9)', color: '#0D0D0D' }}>
          🔒 {labels.fixedBlockTap}
        </div>
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(180deg, #0D0D0D 0%, #0D0D0D 85%, rgba(13,13,13,0) 100%)' }}>
        <div className="px-4 pt-3 pb-2">
          {/* Top row */}
          <div className="flex items-center justify-between mb-2">
            {/* Left: Stats + Templates + Undo */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowStats(!showStats)} aria-label={labels.stats} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{ background: showStats ? `${GOLD}22` : 'rgba(255,255,255,0.05)', color: showStats ? GOLD : '#777', border: `1px solid ${showStats ? GOLD + '33' : 'rgba(255,255,255,0.08)'}` }}>
                📊
              </button>
              <button onClick={() => setShowTemplates(!showTemplates)} aria-label={labels.templates} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{ background: showTemplates ? `${GOLD}22` : 'rgba(255,255,255,0.05)', color: showTemplates ? GOLD : '#777', border: `1px solid ${showTemplates ? GOLD + '33' : 'rgba(255,255,255,0.08)'}` }}>
                📋
              </button>
              <button onClick={() => setShowLegend(!showLegend)} aria-label={labels.legend} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{ background: showLegend ? `${GOLD}22` : 'rgba(255,255,255,0.05)', color: showLegend ? GOLD : '#777', border: `1px solid ${showLegend ? GOLD + '33' : 'rgba(255,255,255,0.08)'}` }}>
                🎨
              </button>
              <button onClick={() => setShowExport(true)} aria-label={labels.export} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#777', border: '1px solid rgba(255,255,255,0.08)' }}>
                📤
              </button>
              {undoStack.length > 0 && (
                <button onClick={undo} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                  style={{ background: 'rgba(110,193,167,0.12)', color: '#6EC1A7', border: '1px solid rgba(110,193,167,0.2)' }}>
                  ↩ {labels.undo}
                </button>
              )}
              <button onClick={() => setShowShortcuts(!showShortcuts)} aria-label={labels.shortcuts} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{ background: showShortcuts ? `${GOLD}22` : 'rgba(255,255,255,0.05)', color: showShortcuts ? GOLD : '#777', border: `1px solid ${showShortcuts ? GOLD + '33' : 'rgba(255,255,255,0.08)'}` }}>
                ⌨️
              </button>
            </div>

            {/* Center: Title */}
            <h1 className="text-base font-bold flex items-center gap-1.5" style={{ color: GOLD }}>
              <span style={{ fontSize: '13px' }}>☪</span>
              {labels.title}
            </h1>

            {/* Right: Clear All */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowClearAll(true)} aria-label={labels.clearAll} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                🗑️
              </button>
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-between mb-1.5">
            <button onClick={() => goDate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 text-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#999' }}>
              {isRtl ? '›' : '‹'}
            </button>
            <div className="text-center cursor-pointer" onClick={!isToday ? goToday : undefined}>
              <div className="text-sm font-semibold" style={{ color: '#ddd' }}>
                {formatDayHeader(currentDate, lang)}
              </div>
              {!isToday && (
                <div className="text-[9px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                  {isRtl ? 'العودة لليوم' : 'Back to Today'}
                </div>
              )}
              {isToday && (
                <div className="text-[9px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5"
                  style={{ background: `${GOLD}18`, color: GOLD }}>
                  {labels.todayLabel}
                </div>
              )}
            </div>
            <button onClick={() => goDate(1)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 text-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#999' }}>
              {isRtl ? '‹' : '›'}
            </button>
          </div>

          {/* Weekly Streak Row */}
          <div className="flex items-center justify-center gap-1.5 mb-2" suppressHydrationWarning>
            {(() => {
              const today = new Date()
              const days: { date: Date; key: string }[] = []
              for (let i = 6; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                days.push({ date: d, key: getDateKey(d) })
              }
              const streak = days.reduce((count, day) => {
                const raw = typeof window !== 'undefined' ? localStorage.getItem(`elbezawi_schedule_${userId}_${day.key}`) : null
                if (raw) { try { const data = JSON.parse(raw); if (data.schedule && Object.keys(data.schedule).length > 0) return count + 1 } catch {} }
                return count
              }, 0)
              return <>
                {days.map((day, idx) => {
                  const raw = typeof window !== 'undefined' ? localStorage.getItem(`elbezawi_schedule_${userId}_${day.key}`) : null
                  let hasData = false
                  let pct = 0
                  let completionPct = 0
                  if (raw) {
                    try {
                      const data = JSON.parse(raw)
                      if (data.schedule && Object.keys(data.schedule).length > 0) {
                        hasData = true
                        pct = Math.min(100, Math.round(Object.keys(data.schedule).length * BLOCK_MINUTES / 840 * 100))
                        // Calculate completion percentage
                        const completed = data.completed || {}
                        const userBlocks = Object.keys(data.schedule).filter(k => !isFixedBlock(Number(k), adhanBlocks))
                        const completedCount = userBlocks.filter(k => completed[k]).length
                        completionPct = userBlocks.length > 0 ? Math.round((completedCount / userBlocks.length) * 100) : 0
                      }
                    } catch {}
                  }
                  const isCurrentDay = day.key === getDateKey(currentDate)
                  const dayLabel = labels.weekDays[day.date.getDay()]
                  return (
                    <div key={day.key} className="flex flex-col items-center gap-0.5 cursor-pointer" onClick={() => setCurrentDate(new Date(day.date))}>
                      <span className={`text-[7px] ${isCurrentDay ? 'font-bold' : ''}`} style={{ color: isCurrentDay ? GOLD : '#555' }}>{dayLabel}</span>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all relative overflow-hidden"
                        style={{
                          background: hasData ? (isCurrentDay ? `linear-gradient(135deg, ${GOLD}, #B8943F)` : 'rgba(201,168,76,0.2)') : 'rgba(255,255,255,0.04)',
                          color: hasData ? (isCurrentDay ? '#0D0D0D' : GOLD) : '#555',
                          border: isCurrentDay ? `1.5px solid ${GOLD}` : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: isCurrentDay && hasData ? `0 0 8px ${GOLD}44` : 'none',
                        }}>
                        {/* Mini completion progress indicator for days with data */}
                        {hasData && !isCurrentDay && completionPct > 0 && (
                          <div className="absolute bottom-0 left-0 right-0" style={{ height: `${completionPct}%`, background: `${GOLD}44`, borderRadius: '0 0 9999px 9999px' }} />
                        )}
                        <span className="relative z-10">
                          {isRtl ? toArDigits(day.date.getDate()) : day.date.getDate()}
                        </span>
                        {/* Completion checkmark overlay for 100% days */}
                        {hasData && completionPct >= 100 && (
                          <span className="absolute inset-0 flex items-center justify-center z-20">
                            <span className="text-[7px] font-bold" style={{ color: isCurrentDay ? '#0D0D0D' : GOLD }}>✓</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {streak > 1 && (
                  <div className="ml-2 px-2 py-0.5 rounded-full" style={{ background: 'rgba(232,116,97,0.12)', border: '1px solid rgba(232,116,97,0.2)' }}>
                    <span className="text-[9px] font-semibold" style={{ color: '#E87461' }}>🔥 {isRtl ? toArDigits(streak) : streak} {labels.streak}</span>
                  </div>
                )}
              </>
            })()}
          </div>

          {/* Toolbar: Completion Mode + Duplicate Day */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <button onClick={() => setShowCompletionMode(!showCompletionMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
              style={{
                background: showCompletionMode ? `${GOLD}22` : 'rgba(255,255,255,0.04)',
                color: showCompletionMode ? GOLD : '#666',
                border: `1px solid ${showCompletionMode ? GOLD + '44' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: showCompletionMode ? `0 0 8px ${GOLD}22` : 'none',
              }}>
              <span>{showCompletionMode ? '✅' : '☑️'}</span>
              {labels.completionMode}
            </button>
            <button onClick={() => setShowDuplicate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#666',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              📋 {labels.duplicateDay}
            </button>
          </div>

          {/* Drag hint + Progress */}
          <p className="text-[9px] text-center mb-1" style={{ color: '#555' }}>{labels.dragHint}</p>
          <div className="mx-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] flex items-center gap-1.5" style={{ color: '#777' }}>
                {labels.yourSchedule}: {isRtl ? toArDigits(stats.progressPercent) : stats.progressPercent}%
                {stats.totalUserBlocks > 0 && (
                  <span className="text-[8px]" style={{ color: '#6EC1A7' }}>✓ {isRtl ? toArDigits(stats.completedCount) : stats.completedCount}/{isRtl ? toArDigits(stats.totalUserBlocks) : stats.totalUserBlocks}</span>
                )}
              </span>
              <span className="text-[9px]" style={{ color: '#666' }}>
                {formatDuration(stats.userScheduledMins, lang)} / {formatDuration(stats.editableMins, lang)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${stats.progressPercent}%`, background: `linear-gradient(90deg, ${GOLD}88, ${GOLD})`, boxShadow: stats.progressPercent > 0 ? `0 0 10px ${GOLD}44` : 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Shortcuts Panel ── */}
      {showShortcuts && (
        <div className="mx-3 mb-2 rounded-xl p-4 animate-fade-in" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold mb-3" style={{ color: GOLD }}>⌨️ {labels.shortcuts}</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: '#999' }}>{labels.shortcutUndo}</span>
              <kbd className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: '#bbb', border: '1px solid rgba(255,255,255,0.1)' }}>Ctrl+Z</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: '#999' }}>{labels.shortcutEscape}</span>
              <kbd className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: '#bbb', border: '1px solid rgba(255,255,255,0.1)' }}>Esc</kbd>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Panel ── */}
      {showStats && (
        <div className="mx-3 mb-2 rounded-xl p-4 animate-fade-in" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold mb-3" style={{ color: GOLD }}>{labels.timeBreakdown}</h3>

          {/* Progress Ring */}
          <div className="flex justify-center mb-4">
            <div className="relative" style={{ width: 80, height: 80 }}>
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                {/* Progress circle */}
                <circle cx="40" cy="40" r="32" fill="none" stroke={GOLD} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - stats.progressPercent / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.7s ease-out', filter: `drop-shadow(0 0 6px ${GOLD}44)` }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold" style={{ color: GOLD }}>
                  {isRtl ? toArDigits(stats.progressPercent) : stats.progressPercent}%
                </span>
                <span className="text-[7px]" style={{ color: '#777' }}>{labels.scheduled}</span>
              </div>
            </div>
          </div>

          {/* Completion mini-ring + count */}
          {stats.totalUserBlocks > 0 && (
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="relative" style={{ width: 32, height: 32 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle cx="16" cy="16" r="12" fill="none" stroke="#6EC1A7" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 12}`}
                    strokeDashoffset={`${2 * Math.PI * 12 * (1 - stats.completionPercent / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.7s ease-out' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[7px] font-bold" style={{ color: '#6EC1A7' }}>{isRtl ? toArDigits(stats.completionPercent) : stats.completionPercent}%</span>
                </div>
              </div>
              <span className="text-[10px]" style={{ color: '#888' }}>
                {isRtl ? toArDigits(stats.completedCount) : stats.completedCount}/{isRtl ? toArDigits(stats.totalUserBlocks) : stats.totalUserBlocks} {labels.blocksDone}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(201,168,76,0.06)' }}>
              <div className="text-xs font-bold" style={{ color: GOLD }}>{formatDuration(stats.fixedMins, lang)}</div>
              <div className="text-[9px] mt-0.5" style={{ color: '#888' }}>{labels.fixedBlocks}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(110,193,167,0.08)' }}>
              <div className="text-xs font-bold" style={{ color: '#6EC1A7' }}>{formatDuration(stats.userScheduledMins, lang)}</div>
              <div className="text-[9px] mt-0.5" style={{ color: '#888' }}>{labels.scheduled}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-xs font-bold" style={{ color: '#999' }}>{formatDuration(stats.freeMins, lang)}</div>
              <div className="text-[9px] mt-0.5" style={{ color: '#888' }}>{labels.free}</div>
            </div>
          </div>
          {Object.keys(stats.categoryMins).length > 0 && (
            <div className="space-y-2">
              {Object.entries(stats.categoryMins).sort(([, a], [, b]) => b - a).map(([key, mins]) => {
                const cat = CATEGORIES[key as CategoryKey]
                if (!cat) return null
                const pct = Math.round((mins / stats.totalAvailable) * 100)
                const displayName = key === 'custom' && customLabels ? Object.values(customLabels).find(() => true) || (isRtl ? cat.labelAr : cat.labelEn) : (isRtl ? cat.labelAr : cat.labelEn)
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm w-6 text-center">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] truncate" style={{ color: cat.color }}>{displayName}</span>
                        <span className="text-[9px]" style={{ color: '#777' }}>{formatDuration(mins, lang)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Color Legend Panel ── */}
      {showLegend && (
        <div className="mx-3 mb-2 rounded-xl p-4 animate-fade-in" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold mb-3" style={{ color: GOLD }}>🎨 {labels.legend}</h3>
          <div className="space-y-1.5">
            {/* Fixed block legend */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD_BG}, rgba(201,168,76,0.15))`, border: `1px solid ${GOLD_BORDER}` }}>
                <span className="text-[8px]">🕌</span>
              </div>
              <span className="text-[10px]" style={{ color: GOLD }}>{isRtl ? 'فترات الصلاة والأذكار (ثابتة)' : 'Prayer & Adhkar (Fixed)'}</span>
            </div>
            {/* Category legends */}
            {categoryKeys.filter(k => k !== 'custom').map(key => {
              const cat = CATEGORIES[key]
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cat.bgStrong, border: `1px solid ${cat.color}30` }}>
                    <span className="text-[9px]">{cat.emoji}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: cat.color }}>{isRtl ? cat.labelAr : cat.labelEn}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: CATEGORIES.custom.bgStrong, border: `1px solid ${CATEGORIES.custom.color}30` }}>
                <span className="text-[9px]">{CATEGORIES.custom.emoji}</span>
              </div>
              <span className="text-[10px]" style={{ color: CATEGORIES.custom.color }}>{isRtl ? 'مخصص (اسم حر)' : 'Custom (free text)'}</span>
            </div>
            {/* Completion mode legend */}
            <div className="flex items-center gap-2 mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(110,193,167,0.15)', border: '1px solid rgba(110,193,167,0.3)' }}>
                <span className="text-[8px]">✓</span>
              </div>
              <span className="text-[10px]" style={{ color: '#6EC1A7' }}>{labels.completed} ({labels.completionMode})</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Dialog ── */}
      {showExport && (() => {
        const lines: string[] = []
        const dayStr = formatDayHeader(currentDate, lang)
        lines.push(`☪ ${isRtl ? 'الجدول اليومي' : 'Daily Schedule'} - ${dayStr}`)
        lines.push('─'.repeat(36))
        for (const block of renderBlocks) {
          if (!block.value) continue
          const startStr = minuteToTimeStr(block.startMin, lang)
          const endStr = minuteToTimeStr(block.startMin + block.count * BLOCK_MINUTES, lang)
          const isFixed = block.value in adhanBlocks
          const fb = isFixed ? adhanBlocks[block.value as FixedBlockKey] : null
          const cat = !isFixed && block.value ? CATEGORIES[block.value as CategoryKey] : null
          const name = fb ? (isRtl ? fb.labelAr : fb.labelEn) : cat ? (block.value === 'custom' && block.customLabel ? block.customLabel : (isRtl ? cat.labelAr : cat.labelEn)) : ''
          const emoji = fb?.emoji || cat?.emoji || ''
          const dur = formatDuration(block.count * BLOCK_MINUTES, lang)
          const isCompleted = !isFixed && completedBlocks[block.startMin]
          lines.push(`${startStr}–${endStr}  ${emoji} ${name} (${dur})${isFixed ? ' 🔒' : ''}${isCompleted ? ' ✓' : ''}`)
        }
        lines.push('─'.repeat(36))
        lines.push(`${isRtl ? toArDigits(stats.progressPercent) : stats.progressPercent}% ${isRtl ? 'مُجدول' : 'scheduled'} | ${formatDuration(stats.userScheduledMins, lang)} ${isRtl ? 'مخطط' : 'planned'}`)
        if (stats.totalUserBlocks > 0) {
          lines.push(`${isRtl ? toArDigits(stats.completedCount) : stats.completedCount}/${isRtl ? toArDigits(stats.totalUserBlocks) : stats.totalUserBlocks} ${isRtl ? 'كتل مكتملة' : 'blocks completed'} (${isRtl ? toArDigits(stats.completionPercent) : stats.completionPercent}%)`)
        }
        const exportText = lines.join('\n')
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="rounded-2xl p-5 mx-4 w-full max-w-sm" style={{ background: 'rgba(26,26,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
              <div className="flex items-center justify-center mb-3"><span className="text-2xl">📤</span></div>
              <h3 className="text-sm font-semibold text-center mb-2" style={{ color: GOLD }}>{labels.export}</h3>
              <pre className="text-[9px] p-3 rounded-xl overflow-auto max-h-48" style={{ background: 'rgba(255,255,255,0.04)', color: '#aaa', border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap', direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left' }}>{exportText}</pre>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowExport(false)} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', color: '#999' }}>{labels.cancel}</button>
                <button onClick={() => { navigator.clipboard.writeText(exportText); showToast(labels.exportCopied); setShowExport(false) }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}33)`, color: GOLD, border: `1px solid ${GOLD}44` }}>📋 {isRtl ? 'نسخ' : 'Copy'}</button>
              </div>
              <div className="mt-2">
                <button onClick={() => { exportAsImage(); setShowExport(false) }} className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: 'rgba(201,168,76,0.08)', color: GOLD, border: `1px solid rgba(201,168,76,0.2)` }}>📷 {labels.saveImage}</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Templates Panel ── */}
      {showTemplates && (
        <div className="mx-3 mb-2 rounded-xl p-4 animate-fade-in" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold mb-3" style={{ color: GOLD }}>📋 {labels.templates}</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tpl]) => (
              <button key={key} onClick={() => applyTemplate(key)}
                className="rounded-xl p-3 text-center transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-2xl mb-1">{tpl.emoji}</div>
                <div className="text-[11px] font-semibold mb-0.5" style={{ color: '#ddd' }}>
                  {isRtl ? tpl.labelAr : tpl.labelEn}
                </div>
                <div className="text-[8px]" style={{ color: '#888' }}>
                  {isRtl ? tpl.descAr : tpl.descEn}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => setApplyToWeek(!applyToWeek)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
              style={{
                background: applyToWeek ? `${GOLD}22` : 'rgba(255,255,255,0.04)',
                color: applyToWeek ? GOLD : '#666',
                border: `1px solid ${applyToWeek ? GOLD + '44' : 'rgba(255,255,255,0.06)'}`,
              }}>
              {applyToWeek ? '✅' : '☐'} {labels.applyToWeek}
            </button>
          </div>
        </div>
      )}

      {/* ── Duplicate Day Dialog ── */}
      {showDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-5 mx-4 w-full max-w-sm" style={{ background: 'rgba(26,26,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center justify-center mb-3"><span className="text-2xl">📋</span></div>
            <h3 className="text-sm font-semibold text-center mb-1" style={{ color: GOLD }}>{labels.duplicateDay}</h3>
            <p className="text-[10px] text-center mb-3" style={{ color: '#888' }}>{labels.copyTo}</p>
            <div className="max-h-64 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: `${GOLD}44 transparent` }}>
              {duplicateTargets.map(target => (
                <button key={target.key} onClick={() => duplicateDay(target.date)}
                  className="w-full py-3 px-4 rounded-xl text-left transition-all active:scale-95 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[11px] font-medium" style={{ color: '#ddd' }}>{target.label}</span>
                  <span className="text-[9px]" style={{ color: '#666' }}>
                    {(() => {
                      const raw = typeof window !== 'undefined' ? localStorage.getItem(`elbezawi_schedule_${userId}_${target.key}`) : null
                      if (raw) { try { const data = JSON.parse(raw); if (data.schedule && Object.keys(data.schedule).length > 0) return isRtl ? 'يوجد جدول' : 'Has schedule' } catch {} }
                      return isRtl ? 'فارغ' : 'Empty'
                    })()}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <button onClick={() => setShowDuplicate(false)} className="w-full py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', color: '#999' }}>{labels.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid area ── */}
      <div className="relative px-2">
        <div ref={gridRef} className="relative overflow-y-auto overflow-x-hidden" style={{ maxHeight: '75vh', touchAction: 'pan-y', scrollBehavior: 'smooth' }}
          onWheel={e => { e.stopPropagation(); if (gridRef.current) { gridRef.current.scrollTop += e.deltaY; } }}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
          onClick={handleGridClick}>
          <div className="relative" style={{ height: allBlocks.length * BLOCK_HEIGHT_PX }}>
            {/* Grid lines */}
            {allBlocks.filter(m => m % 30 === 0).map(m => {
              const topIdx = (m - START_HOUR * 60) / BLOCK_MINUTES
              const isHour = m % 60 === 0
              return <div key={`gl-${m}`} className="absolute pointer-events-none" style={{ top: topIdx * BLOCK_HEIGHT_PX, [isRtl ? 'right' : 'left']: '46px', width: 'calc(100% - 54px)', height: '1px', background: isHour ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)' }} />
            })}

            {/* Time labels */}
            {allBlocks.filter(m => m % 30 === 0).map(m => {
              const topIdx = (m - START_HOUR * 60) / BLOCK_MINUTES
              const isHour = m % 60 === 0
              return (
                <div key={`tl-${m}`} className="absolute leading-none" style={{ top: topIdx * BLOCK_HEIGHT_PX - (isHour ? 6 : 3), [isRtl ? 'right' : 'left']: 0, color: isHour ? '#888' : '#4a4a4a', width: '42px', textAlign: isRtl ? 'left' : 'right', fontFamily: isRtl ? 'inherit' : 'monospace', fontSize: isHour ? '10px' : '8px', fontWeight: isHour ? 600 : 400 }}>
                  {minuteToTimeStr(m, lang)}
                </div>
              )
            })}

            {/* Section dividers (Morning / Afternoon / Evening) */}
            {sectionDividers.map(sd => {
              const topIdx = (sd.minute - START_HOUR * 60) / BLOCK_MINUTES
              return (
                <div key={`sd-${sd.minute}`} className="absolute pointer-events-none flex items-center gap-1.5" style={{ top: topIdx * BLOCK_HEIGHT_PX - 8, [isRtl ? 'right' : 'left']: '46px', width: 'calc(100% - 54px)' }}>
                  <span style={{ fontSize: '10px', color: '#666', whiteSpace: 'nowrap', fontWeight: 500 }}>{sd.emoji} {sd.label}</span>
                  <div className="flex-1" style={{ height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15), rgba(255,255,255,0.04))' }} />
                </div>
              )
            })}

            {/* Empty State Welcome Message */}
            {!hasUserBlocks && (
              <div className="absolute z-10 flex flex-col items-center justify-center text-center pointer-events-none" style={{ top: '30%', [isRtl ? 'right' : 'left']: '48px', width: 'calc(100% - 56px)' }}>
                <div className="animate-pulse-slow">
                  <div className="text-3xl mb-2">👋</div>
                  <div className="text-base font-bold mb-1" style={{ color: '#888' }}>{labels.welcomeTitle}</div>
                  <div className="text-[11px]" style={{ color: '#555' }}>{labels.welcomeSubtitle}</div>
                  <div className="mt-3 px-4 py-2 rounded-lg" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)' }}>
                    <p className="text-[9px] italic" style={{ color: GOLD, lineHeight: '1.5' }}>
                      {isRtl ? dailyQuote.ar : `"${dailyQuote.en}"`}
                    </p>
                  </div>
                  <div className="mt-3 text-lg animate-bounce-subtle" style={{ color: GOLD, opacity: 0.4 }}>↓</div>
                </div>
              </div>
            )}

            {/* ── Onboarding tooltip for first-time users ── */}
            {(() => {
              const onboardingSeen = typeof window !== 'undefined' && localStorage.getItem('elbezawi_onboarding_seen')
              const firstFreeBlock = renderBlocks.find(b => b.value === null)
              if (!onboardingSeen && !hasUserBlocks && firstFreeBlock) {
                const topIdx = (firstFreeBlock.startMin - START_HOUR * 60) / BLOCK_MINUTES
                return (
                  <div className="absolute z-30 pointer-events-none animate-pulse-slow" style={{ top: topIdx * BLOCK_HEIGHT_PX - 28, [isRtl ? 'right' : 'left']: '52px' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap" style={{ background: `${GOLD}dd`, color: '#0D0D0D' }}>{labels.onboardingHint}</span>
                      <span style={{ color: GOLD, fontSize: '10px' }}>▼</span>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {/* Blocks */}
            {renderBlocks.map(block => {
              const topPx = ((block.startMin - START_HOUR * 60) / BLOCK_MINUTES) * BLOCK_HEIGHT_PX
              const heightPx = block.count * BLOCK_HEIGHT_PX - 2
              const isFixed = block.value !== null && block.value in adhanBlocks
              const isCategory = block.value !== null && !isFixed
              const isFree = block.value === null
              const isSelected = selectedBlocks.some(s => s >= block.startMin && s < block.startMin + block.count * BLOCK_MINUTES)
              const catData = isCategory && block.value ? CATEGORIES[block.value as CategoryKey] : null
              const fixedData = isFixed ? adhanBlocks[block.value as FixedBlockKey] : null
              const durationMins = block.count * BLOCK_MINUTES
              const isShaking = fixedTapFeedback !== null && isFixed && block.startMin === fixedTapFeedback
              const isCompleted = isCategory && completedBlocks[block.startMin]
              const isHovered = hoveredBlock !== null && block.startMin <= hoveredBlock && hoveredBlock < block.startMin + block.count * BLOCK_MINUTES

              const isAssignAnim = lastAssignedMin !== null && isCategory && block.startMin <= lastAssignedMin && lastAssignedMin < block.startMin + block.count * BLOCK_MINUTES
              return (
                <div key={`b-${block.startMin}-${block.count}`}
                  className={`absolute transition-all duration-150 cursor-pointer ${isShaking ? 'animate-shake' : ''} ${isAssignAnim ? 'animate-assign-pop' : ''}`}
                  onMouseEnter={() => { if (isCategory || isFree) setHoveredBlock(block.startMin) }}
                  onMouseLeave={() => setHoveredBlock(null)}
                  style={{
                    top: topPx, height: heightPx,
                    [isRtl ? 'right' : 'left']: '48px', width: 'calc(100% - 56px)',
                    opacity: isCompleted ? 0.6 : 1,
                    ...(isFixed ? {
                      background: `linear-gradient(135deg, ${GOLD_BG}, rgba(201,168,76,0.12))`,
                      border: `1px solid ${GOLD_BORDER}`, borderRadius: '8px',
                      boxShadow: '0 0 12px rgba(201,168,76,0.08), inset 0 1px 0 rgba(201,168,76,0.15), inset 0 -1px 0 rgba(201,168,76,0.05)',
                    } : isCategory && catData ? {
                      background: `linear-gradient(135deg, ${catData.bg}, ${catData.bgStrong})`,
                      border: `1px solid ${isHovered ? catData.color + '60' : catData.color + '30'}`,
                      borderRadius: '8px',
                      boxShadow: isHovered
                        ? `0 2px 12px ${catData.color}44, 0 0 20px ${catData.color}22, inset 0 1px 0 ${catData.color}25`
                        : `0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 ${catData.color}20`,
                    } : isSelected ? {
                      background: `linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.20))`,
                      border: `1.5px dashed ${GOLD}55`, borderRadius: '6px',
                      boxShadow: `0 0 12px rgba(201,168,76,0.18)`,
                    } : {
                      background: isHovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                      border: isHovered ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                    }),
                  }}>
                  {/* Gold overlay for selected blocks during drag */}
                  {isSelected && isFree && (
                    <div className="absolute inset-0 rounded-md pointer-events-none" style={{ background: 'rgba(201,168,76,0.08)' }} />
                  )}
                  {/* Completion checkmark overlay */}
                  {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(110,193,167,0.25)', border: '1.5px solid #6EC1A7', boxShadow: '0 0 8px rgba(110,193,167,0.3)' }}>
                        <span className="text-[11px] font-bold" style={{ color: '#6EC1A7' }}>✓</span>
                      </div>
                    </div>
                  )}
                  {isFixed && fixedData && (
                    <div className="flex items-center h-full px-2.5 gap-2">
                      <div className="flex flex-col items-center" style={{ minWidth: '22px' }}>
                        <span className="text-xs">{fixedData.emoji}</span>
                        <span className="text-[7px] opacity-50">🔒</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: GOLD }}>{isRtl ? fixedData.labelAr : fixedData.labelEn}</div>
                        <div className="text-[8px] opacity-50" style={{ color: GOLD }}>{minuteToTimeStr(fixedData.startMin, lang)} – {minuteToTimeStr(fixedData.endMin, lang)}</div>
                      </div>
                      {durationMins >= 30 && <span className="text-[8px] opacity-50" style={{ color: GOLD, paddingInlineStart: '4px' }}>{formatDuration(durationMins, lang)}</span>}
                    </div>
                  )}
                  {isCategory && catData && (
                    <div className="flex items-center h-full px-2.5 gap-2">
                      <span className="text-sm">{catData.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium truncate" style={{ color: catData.color }}>
                          {block.value === 'custom' && block.customLabel ? block.customLabel : isRtl ? catData.labelAr : catData.labelEn}
                        </span>
                        {durationMins >= 60 && <div className="text-[8px] opacity-40" style={{ color: catData.color }}>{minuteToTimeStr(block.startMin, lang)} – {minuteToTimeStr(block.startMin + durationMins, lang)}</div>}
                      </div>
                      {durationMins >= 30 && <span className="text-[8px] opacity-50 ml-1" style={{ color: catData.color, paddingInlineStart: '4px' }}>{formatDuration(durationMins, lang)}</span>}
                    </div>
                  )}
                  {isFree && !isSelected && (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[10px] opacity-25 animate-pulse-plus" style={{ color: '#888' }}>+</span>
                    </div>
                  )}
                  {isSelected && isFree && (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[9px] font-medium" style={{ color: GOLD }}>{selectedBlocks.length > 1 ? (isRtl ? `${selectedBlocks.length} فترات` : `${selectedBlocks.length} slots`) : '+'}</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Current time line */}
            {nowVisible && nowTopPx >= 0 && (
              <div className="absolute z-20 pointer-events-none" style={{ top: nowTopPx, [isRtl ? 'right' : 'left']: '42px', width: 'calc(100% - 50px)', height: '2px', background: '#EF4444', borderRadius: '1px', boxShadow: '0 0 8px rgba(239,68,68,0.5), 0 0 16px rgba(239,68,68,0.2)' }}>
                <div className="absolute w-2 h-2 rounded-full animate-pulse-dot" style={{ background: '#EF4444', top: '-3px', [isRtl ? 'right' : 'left']: '-4px', boxShadow: '0 0 10px rgba(239,68,68,0.7)' }} />
                <div className="absolute text-[8px] font-bold px-1 rounded" style={{ top: '-12px', [isRtl ? 'left' : 'right']: 0, background: '#EF4444', color: '#fff' }}>{minuteToTimeStr(nowMinutes, lang)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll to Now */}
      {showScrollBtn && isToday && (
        <button onClick={scrollToNow} className="fixed z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90"
          style={{ bottom: '100px', [isRtl ? 'left' : 'right']: '16px', background: `linear-gradient(135deg, ${GOLD}, #B8943F)`, color: '#0D0D0D', boxShadow: `0 4px 12px ${GOLD}44` }}>
          <span className="text-[10px] font-bold">{labels.scrollToNow}</span>
        </button>
      )}

      {/* ── Clear confirmation dialog ── */}
      {clearTarget !== null && (() => {
        const merged = findMergedBlock(clearTarget)
        const catKey = merged?.value as CategoryKey | null
        const catData = catKey && catKey in CATEGORIES ? CATEGORIES[catKey as CategoryKey] : null
        const catName = catData ? (isRtl ? catData.labelAr : catData.labelEn) : ''
        const timeRange = merged ? `${minuteToTimeStr(merged.startMin, lang)}–${minuteToTimeStr(merged.startMin + merged.count * BLOCK_MINUTES, lang)}` : ''
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="rounded-2xl p-5 mx-4 w-full max-w-xs animate-fade-in" style={{ background: 'rgba(26,26,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
              <div className="flex items-center justify-center gap-2 mb-3"><span className="text-xl">{catData?.emoji || '🔒'}</span></div>
              <p className="text-sm font-semibold text-center mb-1" style={{ color: '#ddd' }}>
                {catKey && !(catKey in adhanBlocks) ? `${catData?.emoji || ''} ${catName} (${timeRange})` : catName}
              </p>
              <p className="text-xs text-center mb-3" style={{ color: '#888' }}>{labels.clearBlockConfirm}</p>
              <div className="flex gap-2">
                <button onClick={() => setClearTarget(null)} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', color: '#999' }}>{labels.cancel}</button>
                {catKey && !(catKey in adhanBlocks) && (
                  <button onClick={() => {
                    if (merged) {
                      const mins: number[] = []
                      for (let i = 0; i < merged.count; i++) mins.push(merged.startMin + i * BLOCK_MINUTES)
                      setSelectedBlocks(mins)
                      selectedBlocksRef.current = mins
                      setClearTarget(null)
                      setSheetOpen(true)
                    }
                  }} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(201,168,76,0.12)', color: GOLD, border: `1px solid ${GOLD}33` }}>🔄 {labels.reassign}</button>
                )}
                {catKey && !(catKey in adhanBlocks) && (
                  <button onClick={() => clearBlock(clearTarget)} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>🗑️ {labels.clear}</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Clear All dialog ── */}
      {showClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-5 mx-4 w-full max-w-xs" style={{ background: 'rgba(26,26,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center justify-center mb-3"><span className="text-2xl">⚠️</span></div>
            <p className="text-sm font-semibold text-center mb-1" style={{ color: '#ddd' }}>{labels.clearAll}</p>
            <p className="text-xs text-center mb-4" style={{ color: '#888' }}>{labels.clearAllConfirm}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearAll(false)} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', color: '#999' }}>{labels.cancel}</button>
              <button onClick={clearAll} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>🗑️ {labels.clear}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Sheet - Category Picker ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => { setSheetOpen(false); setSelectedBlocks([]); setShowCustomInput(false); setCustomInput('') }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up"
            style={{ background: 'linear-gradient(180deg, #1E1E1E 0%, #151515 100%)', border: '1px solid rgba(255,255,255,0.06)', borderTopColor: `${GOLD}33`, boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-0"><div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} /></div>
            <div className="flex justify-center pt-1 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} /></div>
            <div className="px-4 pb-2">
              <h3 className="text-sm font-bold text-center mb-1" style={{ color: GOLD }}>{labels.selectCategory}</h3>
              {selectedBlocks.length > 1 && (
                <p className="text-[9px] text-center mb-2" style={{ color: '#666' }}>
                  {isRtl ? `${selectedBlocks.length} فترات محددة` : `${selectedBlocks.length} slots selected`} ({formatDuration(selectedBlocks.length * BLOCK_MINUTES, lang)})
                </p>
              )}
            </div>
            {!showCustomInput ? (
              <div className="grid grid-cols-3 gap-2.5 px-4 pb-6">
                {categoryKeys.map(key => {
                  const cat = CATEGORIES[key]
                  return (
                    <button key={key} onClick={() => assignCategory(key)} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-150 active:scale-95"
                      style={{ background: `linear-gradient(135deg, ${cat.bg}, ${cat.bgStrong})`, border: `1px solid ${cat.color}20`, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-[10px] font-semibold" style={{ color: cat.color }}>{isRtl ? cat.labelAr : cat.labelEn}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 pb-6">
                <div className="relative">
                  <input type="text" maxLength={20} value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder={labels.customPlaceholder}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${GOLD}33`, color: '#E8E8E8' }}
                    autoFocus onKeyDown={e => { if (e.key === 'Enter') submitCustom() }} />
                  <span className="absolute top-3 text-[9px]" style={{ [isRtl ? 'left' : 'right']: '12px', color: charsLeft <= 5 ? '#EF4444' : '#555' }}>{charsLeft}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setShowCustomInput(false); setCustomInput('') }} className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.05)', color: '#888' }}>{labels.cancel}</button>
                  <button onClick={submitCustom} className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}33)`, color: GOLD, border: `1px solid ${GOLD}44` }}>✅ {labels.save}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="sticky bottom-0 z-20 px-4 py-3" style={{ background: 'linear-gradient(180deg, rgba(13,13,13,0) 0%, rgba(13,13,13,0.8) 30%, #0D0D0D 60%)', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
        <div className="flex items-center justify-center gap-3 text-[9px]" style={{ color: '#666' }}>
          <span>☪ {isRtl ? 'الجدول اليومي' : 'Daily Schedule'}</span>
          <span style={{ color: '#444' }}>•</span>
          <span style={{ color: '#6EC1A7' }}>{formatDuration(stats.userScheduledMins, lang)} {labels.scheduled}</span>
          <span style={{ color: '#444' }}>•</span>
          <span>{formatDuration(stats.freeMins, lang)} {labels.free}</span>
          {stats.totalUserBlocks > 0 && (
            <>
              <span style={{ color: '#444' }}>•</span>
              <span style={{ color: GOLD }}>{isRtl ? toArDigits(stats.completedCount) : stats.completedCount}/{isRtl ? toArDigits(stats.totalUserBlocks) : stats.totalUserBlocks} {labels.blocksDone}</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-center mt-1">
          <p className="text-[8px] italic" style={{ color: 'rgba(201,168,76,0.4)', lineHeight: '1.4' }}>
            {isRtl ? dailyQuote.ar : dailyQuote.en}
          </p>
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        /* ── Themed scrollbars ── */
        /* Webkit (Chrome, Edge, Safari) */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0D0D0D; border-radius: 99px; }
        ::-webkit-scrollbar-thumb { background: #C9A84C40; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #C9A84C99; }
        ::-webkit-scrollbar-corner { background: #0D0D0D; }
        /* Firefox */
        * { scrollbar-width: thin; scrollbar-color: #C9A84C40 #0D0D0D; }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-toast-in { animation: toastIn 0.3s ease-out; }
        @keyframes pulseSlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow { animation: pulseSlow 2.5s ease-in-out infinite; }
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
        .animate-bounce-subtle { animation: bounceSubtle 1.5s ease-in-out infinite; }
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 10px rgba(239,68,68,0.7); }
          50% { box-shadow: 0 0 18px rgba(239,68,68,0.9); }
        }
        .animate-pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
        @keyframes assignPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-assign-pop { animation: assignPop 0.3s ease-out; }
        @keyframes pulsePlus {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.45; }
        }
        .animate-pulse-plus { animation: pulsePlus 2s ease-in-out infinite; }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(-12px); }
        }
      `}</style>
    </div>
  )
}
