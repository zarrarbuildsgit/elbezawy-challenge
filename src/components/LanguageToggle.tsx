import { useLanguage } from '../hooks/useLanguage';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex p-0.5 bg-[#121212] border border-[#C9A84C] rounded-[20px] w-[140px] h-[32px] overflow-hidden justify-between items-center transition-all duration-500 ease-in-out">
      <button
        onClick={() => setLang('ar')}
        className={`flex-1 h-full rounded-[18px] text-[11px] font-bold transition-all duration-500 ease-in-out flex items-center justify-center ${
          lang === 'ar'
            ? 'bg-[#C9A84C] text-[#0D0D0D]'
            : 'bg-transparent text-gray-500 hover:text-gray-300'
        }`}
      >
        العربية
      </button>
      <button
        onClick={() => setLang('en')}
        className={`flex-1 h-full rounded-[18px] text-[11px] font-bold transition-all duration-500 ease-in-out flex items-center justify-center ${
          lang === 'en'
            ? 'bg-[#C9A84C] text-[#0D0D0D]'
            : 'bg-transparent text-gray-500 hover:text-gray-300'
        }`}
      >
        English
      </button>
    </div>
  );
}
