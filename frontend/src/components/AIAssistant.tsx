import React, { useMemo, useState } from 'react';
import api from '../services/api';
import { MessageCircle, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ChatMessage = {
  id: string;
  from: 'user' | 'assistant';
  text: string;
};

const AIAssistant = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      from: 'user',
      text: input.trim()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: userMsg.text });
      const assistantText = response.data?.reply || 'Sorry, I could not respond right now.';
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        from: 'assistant',
        text: assistantText
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        from: 'assistant',
        text: 'Unable to reach AI assistant at this time.'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const buttonLabel = useMemo(() => {
    return isOpen ? 'Close' : t('assistant.openChat');
  }, [isOpen, t]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="w-80 md:w-96 max-h-[60vh] bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <button onClick={toggleOpen} className="p-1 rounded-full hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-500">{t('assistant.askQuestion')}</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl px-3 py-2 max-w-[85%] ${
                    msg.from === 'user' ? 'bg-primary-600 text-white self-end' : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {msg.text}
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('assistant.askQuestion')}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={toggleOpen}
        className="flex items-center space-x-2 px-4 py-3 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:block font-medium">{buttonLabel}</span>
      </button>
    </div>
  );
};

export default AIAssistant;
