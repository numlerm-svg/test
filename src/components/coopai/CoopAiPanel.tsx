import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { AI_ASSISTANT_NAME } from '../../config/policy';
import { sendCoopAiMessage } from '../../lib/coopAiClient';
import { formatThaiDateTime } from '../../lib/format';
import type { ChatMessage } from '../../types';

const QUICK_PROMPTS = ['สรุปสถานะการเงินโดยรวม', 'อัตราดอกเบี้ยเงินฝากเท่าไหร่', 'เงื่อนไขเงินกู้มีอะไรบ้าง', 'อัตราปันผลปีนี้เท่าไหร่'];

function welcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `สวัสดีครับ/ค่ะ ผม/ดิฉันคือ ${AI_ASSISTANT_NAME} ผู้ช่วยด้านการเงินของสหกรณ์ ถามข้อมูลเงินฝาก เงินกู้ หุ้น หรือเงินปันผลได้เลยครับ/ค่ะ`,
    timestamp: new Date().toISOString(),
  };
}

export function CoopAiPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setError(null);
    setInput('');
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    try {
      const reply = await sendCoopAiMessage({ message: content, user });
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`${AI_ASSISTANT_NAME} ผู้ช่วย AI`} className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Sparkles size={16} />
            </span>
            <p className="font-medium text-slate-900">{AI_ASSISTANT_NAME}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด COOP-ai" className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.content}
                <p className={`mt-1 text-[10px] ${m.role === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}>{formatThaiDateTime(m.timestamp)}</p>
              </div>
            </div>
          ))}
          {sending && <p className="text-xs text-slate-400">{AI_ASSISTANT_NAME} กำลังพิมพ์...</p>}
          {error && <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
          <div ref={listEndRef} />
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(p)}
                disabled={sending}
                className="rounded-full border border-indigo-100 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำถามที่นี่..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="ส่งข้อความ"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
