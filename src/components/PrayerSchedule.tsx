import { useState, useEffect, useMemo } from 'react'
import { getAdhanTimings, fetchAndCacheAdhan, DEFAULT_ADHAN_TIMINGS, AdhanTimings } from '../lib/tasks'

interface PrayerScheduleProps {
  lang: 'ar' | 'en'
  timezone?: string
}

const GOLD = '#C9A84C'

interface Prayer {
  id: string
  nameEn: string
  nameAr: string
  emoji: string
  timeKey: keyof AdhanTimings
  endKey?: keyof AdhanTimings
  startOffsetMin?: number
  endOffsetMin?: number
  isBonus?: boolean
}

const PRAYERS: Prayer[] = [
  { id: 'fajr',    nameEn: 'Fajr',            nameAr: 'الفجر',          emoji: '🌙', timeKey: 'Fajr',      endKey: 'Sunrise', endOffsetMin: -30 },
  { id: 'adhkar',  nameEn: 'Morning Adhkar',   nameAr: 'أذكار الصباح',  emoji: '🤲', timeKey: 'Sunrise',   startOffsetMin: -30, endOffsetMin: 30 },
  { id: 'dhuhr',   nameEn: 'Dhuhr',            nameAr: 'الظهر',          emoji: '☀️', timeKey: 'Dhuhr',     endOffsetMin: 30 },
  { id: 'asr',     nameEn: 'Asr',              nameAr: 'العصر',          emoji: '🌤️', timeKey: 'Asr',       endKey: 'Maghrib' },
  { id: 'maghrib', nameEn: 'Maghrib',           nameAr: 'المغرب',         emoji: '🌅', timeKey: 'Maghrib',   endOffsetMin: 20 },
  { id: 'isha',    nameEn: 'Isha',              nameAr: 'العشاء',         emoji: '🌃', timeKey: 'Isha',      endOffsetMin: 30 },
  { id: 'quran',   nameEn: 'Quran',             nameAr: 'القرآن الكريم',  emoji: '📖', timeKey: 'Isha',      startOffsetMin: 30, endOffsetMin: 90 },
  { id: 'qiyam',   nameEn: 'Qiyam al-Layl ⭐', nameAr: 'قيام الليل ⭐', emoji: '🌙', timeKey: 'Lastthird', endKey: 'Fajr', isBonus: true },
]

function toMin(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + m
}

function toTimeStr(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function getPrayerWindow(prayer: Prayer, t: AdhanTimings): { start: string; end: string } {
  const startMin = toMin(t[prayer.timeKey] || '00:00') + (prayer.startOffsetMin || 0)
  let endMin: number
  if (prayer.endKey) {
    endMin = toMin(t[prayer.endKey] || '23:59') + (prayer.endOffsetMin || 0)
  } else {
    endMin = toMin(t[prayer.timeKey] || '00:00') + (prayer.startOffsetMin || 0) + (prayer.endOffsetMin || 30)
  }
  return { start: toTimeStr(Math.max(0, startMin)), end: toTimeStr(Math.min(endMin, 23 * 60 + 59)) }
}

type PrayerStatus = 'done' | 'active' | 'upcoming' | 'bonus'

function getPrayerStatus(prayer: Prayer, t: AdhanTimings, nowMin: number): PrayerStatus {
  if (prayer.isBonus) return 'bonus'
  const { start, end } = getPrayerWindow(prayer, t)
  const s = toMin(start), e = toMin(end)
  if (nowMin > e) return 'done'
  if (nowMin >= s && nowMin <= e) return 'active'
  return 'upcoming'
}

function formatCountdown(targetMin: number, nowMin: number): string {
  const diff = (targetMin - nowMin + 24 * 60) % (24 * 60)
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export default function PrayerSchedule({ lang, timezone }: PrayerScheduleProps) {
  const isRtl = lang === 'ar'
  const [timings, setTimings] = useState<AdhanTimings>(() => getAdhanTimings())
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(false)

  // Refresh adhan every time component mounts & tick every minute
  useEffect(() => {
    setLoading(true)
    fetchAndCacheAdhan(timezone).then(t => {
      setTimings(t)
      setLoading(false)
    }).catch(() => setLoading(false))

    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(tick)
  }, [])

  const nowMin = now.getHours() * 60 + now.getMinutes()

  const prayers = useMemo(() =>
    PRAYERS.map(p => {
      const window = getPrayerWindow(p, timings)
      const status = getPrayerStatus(p, timings, nowMin)
      return { ...p, window, status }
    }),
  [timings, nowMin])

  // Find next prayer
  const nextPrayer = prayers.find(p => p.status === 'upcoming')

  const labels = {
    title:    lang === 'ar' ? 'أوقات الصلاة' : 'Prayer Times',
    subtitle: lang === 'ar' ? 'مزامنة تلقائية مع الأوقات الفعلية' : 'Auto-synced with actual adhan times',
    loading:  lang === 'ar' ? 'جاري المزامنة...' : 'Syncing...',
    next:     lang === 'ar' ? 'الصلاة القادمة' : 'Next prayer',
    in:       lang === 'ar' ? 'بعد' : 'in',
    done:     lang === 'ar' ? 'انتهى' : 'Done',
    active:   lang === 'ar' ? 'الآن' : 'Now',
    bonus:    lang === 'ar' ? 'نقاط إضافية' : 'Bonus',
    location: lang === 'ar' ? 'مزامنة بموقعك' : 'Synced to your location',
  }

  const statusColor = (status: PrayerStatus) => {
    if (status === 'active') return GOLD
    if (status === 'done') return '#555'
    if (status === 'bonus') return '#8B6FD4'
    return '#E8E8E8'
  }

  const statusBg = (status: PrayerStatus) => {
    if (status === 'active') return `rgba(201,168,76,0.12)`
    if (status === 'done') return `rgba(255,255,255,0.03)`
    if (status === 'bonus') return `rgba(139,111,212,0.08)`
    return `rgba(255,255,255,0.05)`
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-lg mx-auto pb-8" style={{ color: '#E8E8E8' }}>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl"
          style={{ background: `rgba(201,168,76,0.1)`, border: `1px solid rgba(201,168,76,0.3)` }}>
          🕌
        </div>
        <h2 className="text-xl font-black mb-1" style={{ color: GOLD }}>{labels.title}</h2>
        <p className="text-xs" style={{ color: '#888' }}>
          {loading ? labels.loading : `📍 ${labels.location}`}
        </p>
      </div>

      {/* Next prayer banner */}
      {nextPrayer && (
        <div className="rounded-2xl p-4 mb-5 flex items-center justify-between"
          style={{ background: `rgba(201,168,76,0.08)`, border: `1px solid rgba(201,168,76,0.3)` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: `${GOLD}99` }}>
              {labels.next}
            </p>
            <p className="text-base font-black" style={{ color: GOLD }}>
              {lang === 'ar' ? nextPrayer.nameAr : nextPrayer.nameEn} {nextPrayer.emoji}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>{nextPrayer.window.start}</p>
          </div>
          <div className="text-end">
            <p className="text-2xl font-black tabular-nums" style={{ color: GOLD }}>
              {formatCountdown(toMin(nextPrayer.window.start), nowMin)}
            </p>
            <p className="text-[10px]" style={{ color: '#888' }}>{labels.in}</p>
          </div>
        </div>
      )}

      {/* Prayer cards */}
      <div className="space-y-2">
        {prayers.map(prayer => (
          <div
            key={prayer.id}
            className="rounded-xl px-4 py-3 flex items-center justify-between transition-all"
            style={{
              background: statusBg(prayer.status),
              border: `1px solid ${prayer.status === 'active' ? `rgba(201,168,76,0.4)` : prayer.status === 'bonus' ? 'rgba(139,111,212,0.25)' : 'rgba(255,255,255,0.06)'}`,
              opacity: prayer.status === 'done' ? 0.5 : 1,
            }}
          >
            {/* Left: emoji + name */}
            <div className="flex items-center gap-3">
              <span className="text-xl w-7 text-center">{prayer.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: statusColor(prayer.status) }}>
                    {lang === 'ar' ? prayer.nameAr : prayer.nameEn}
                  </span>
                  {prayer.status === 'active' && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md animate-pulse"
                      style={{ background: `rgba(201,168,76,0.2)`, color: GOLD }}>
                      {labels.active}
                    </span>
                  )}
                  {prayer.isBonus && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(139,111,212,0.15)', color: '#8B6FD4' }}>
                      ⭐ {labels.bonus}
                    </span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: '#666' }}>
                  {prayer.window.start} → {prayer.window.end}
                </span>
              </div>
            </div>

            {/* Right: status / countdown */}
            <div className="text-end shrink-0">
              {prayer.status === 'done' ? (
                <span className="text-[11px]" style={{ color: '#555' }}>✓ {labels.done}</span>
              ) : prayer.status === 'active' ? (
                <span className="text-[11px] font-bold tabular-nums" style={{ color: GOLD }}>
                  -{formatCountdown(toMin(prayer.window.end), nowMin)}
                </span>
              ) : prayer.status === 'upcoming' ? (
                <span className="text-[11px] tabular-nums" style={{ color: '#888' }}>
                  {formatCountdown(toMin(prayer.window.start), nowMin)}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] mt-5" style={{ color: '#444' }}>
        {lang === 'ar'
          ? 'الأوقات محسوبة حسب طريقة أم القرى وتتجدد تلقائياً كل يوم'
          : 'Times calculated via Umm al-Qura method · Auto-refresh daily'}
      </p>
    </div>
  )
}
