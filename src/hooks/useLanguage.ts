// Shared language state so all useLanguage() callers stay in perfect sync
// without fighting over document.documentElement.dir or causing double updates.
let _sharedLang: 'ar' | 'en' = 'ar';
let _listeners: Set<(lang: 'ar' | 'en') => void> = new Set();

// Read from localStorage once at module load
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('elbezawi_lang');
  if (saved === 'ar' || saved === 'en') {
    _sharedLang = saved;
  }
  // Apply initial dir
  document.documentElement.dir = _sharedLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = _sharedLang;
}

function setSharedLang(lang: 'ar' | 'en') {
  if (lang === _sharedLang) return;
  _sharedLang = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('elbezawi_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
  _listeners.forEach(fn => fn(lang));
}

export type Language = 'ar' | 'en';

import { useState, useEffect, useCallback } from 'react';
import { translations } from '../lib/translations';

export function useLanguage() {
  const [lang, setLangState] = useState<Language>(() => _sharedLang);

  useEffect(() => {
    const listener = (nextLang: 'ar' | 'en') => {
      setLangState(nextLang);
    };
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setSharedLang(newLang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translation = translations[key];
      if (!translation) return key;
      return translation[lang] || key;
    },
    [lang]
  );

  const n = useCallback(
    (num: number | string): string => {
      if (lang === 'ar') {
        const map: Record<string, string> = {
          '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
          '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
        };
        return String(num).split('').map(c => map[c] ?? c).join('');
      }
      return String(num);
    },
    [lang]
  );

  return { lang, setLang, t, n };
}
