import { CheckCircle2, XCircle, X } from 'lucide-react';
import { create } from 'zustand';

interface ToastItem { id: number; message: string; tone: 'success' | 'error' }
interface ToastStore {
  toasts: ToastItem[];
  push: (message: string, tone?: 'success' | 'error') => void;
  dismiss: (id: number) => void;
}

let counter = 0;
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in pointer-events-auto flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg"
        >
          {t.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          <p className="text-sm text-slate-700">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
