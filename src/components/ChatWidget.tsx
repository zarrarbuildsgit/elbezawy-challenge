import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { callGemini } from '../lib/gemini';
import { useLanguage } from '../hooks/useLanguage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatWidget() {
  const { lang, t } = useLanguage();
  const isRTL = lang === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('chat.greeting'),
      timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-generate greeting when language changes (only if no user messages yet)
  useEffect(() => {
    setMessages(prev => {
      // If there is exactly 1 message and it's the assistant greeting, update it
      if (prev.length === 1 && prev[0].role === 'assistant' && prev[0].content !== t('chat.greeting')) {
        return [{
          role: 'assistant',
          content: t('chat.greeting'),
          timestamp: prev[0].timestamp
        }];
      }
      return prev;
    });
  }, [lang]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Append user message
    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    const trimmedMessages = updatedMessages.slice(-10);
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const apiMessages = trimmedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const reply = await callGemini(apiMessages);

      const botMsg: Message = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error('Chat error:', e);
      const errorMsg: Message = {
        role: 'assistant',
        content: t('chat.error'),
        timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const quickReplyKeys = ['chat.q1', 'chat.q2', 'chat.q3', 'chat.q4'];

  // Chat bubble alignment: user = inline-start (left in LTR, right in RTL), assistant = inline-end
  const userBubbleAlign = isRTL ? 'items-end' : 'items-start';
  const assistantBubbleAlign = isRTL ? 'items-start' : 'items-end';
  const userBubbleRadius = isRTL ? 'rounded-tr-none' : 'rounded-tl-none';
  const assistantBubbleRadius = isRTL ? 'rounded-tl-none' : 'rounded-tr-none';
  const loadingBubbleAlign = isRTL ? 'items-start' : 'items-end';
  const loadingBubbleRadius = isRTL ? 'rounded-tl-none' : 'rounded-tr-none';

  return (
    <>
      {/* Floating Action Button - ALWAYS BOTTOM RIGHT */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-[#C9A84C] hover:bg-[#b0913e] text-[#0D0D0D] p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 ease-in-out focus:outline-none flex items-center justify-center"
        aria-label={lang === 'ar' ? 'مساعد البزاوي' : 'ElBezawy Assistant'}
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-500" />
        ) : (
          <div className="relative">
            <span className="absolute flex h-3 w-3 -top-1 -right-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D0D0D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0D0D0D]"></span>
            </span>
            <MessageSquare className="w-6 h-6" />
          </div>
        )}
      </button>

      {/* Floating Chat Drawer - ALWAYS BOTTOM RIGHT, RESPONSIVE WIDTH, CAPPED HEIGHT */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 left-4 md:left-auto md:right-6 z-50 bg-[#161616] border border-[#C9A84C]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in transition-all duration-500 ease-in-out"
          style={{ maxWidth: 'calc(100vw - 32px)', width: '384px', maxHeight: 'calc(100vh - 180px)' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="bg-[#1f1f1f] border-b border-[#C9A84C]/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#C9A84C]/10 rounded-lg text-[#C9A84C]">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-[#C9A84C] text-sm">
                  {lang === 'ar' ? 'مساعد البزاوي الذكي' : 'ElBezawy AI Assistant'}
                </h3>
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse"></span>
                  {t('chat.online')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] ${isUser ? userBubbleAlign : assistantBubbleAlign}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#C9A84C] text-[#0D0D0D] font-semibold'
                        : 'bg-[#222] text-[#E0E0E0] border border-[#C9A84C]/10'
                    } ${isUser ? userBubbleRadius : assistantBubbleRadius}`}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {msg.content}
                  </div>
                  <span className={`text-[10px] text-gray-500 mt-1 px-1 ${isRTL ? 'text-start' : 'text-end'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}
            {isLoading && (
              <div className={`flex flex-col max-w-[80%] ${loadingBubbleAlign}`}>
                <div className={`bg-[#222] border border-[#C9A84C]/10 p-3 rounded-2xl text-sm text-gray-400 flex items-center gap-2 ${loadingBubbleRadius}`}>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" />
                  <span>{t('chat.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Suggestions */}
          <div className="px-4 py-2 bg-[#1b1b1b] border-t border-[#C9A84C]/5 overflow-x-auto whitespace-nowrap flex gap-2">
            {quickReplyKeys.map((key) => (
              <button
                key={key}
                onClick={() => handleSendMessage(t(key))}
                className="bg-[#222] hover:bg-[#C9A84C]/10 text-xs text-[#C9A84C] px-3 py-1.5 rounded-full border border-[#C9A84C]/20 transition shrink-0"
              >
                {t(key)}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#111] border-t border-[#C9A84C]/10 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('chat.placeholder')}
              className="flex-1 bg-[#1a1a1a] text-sm text-white placeholder-gray-500 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#C9A84C] border border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="bg-[#C9A84C] hover:bg-[#b0913e] disabled:opacity-50 text-[#0D0D0D] p-2.5 rounded-xl transition flex items-center justify-center shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
