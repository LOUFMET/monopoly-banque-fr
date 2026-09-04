import React from 'react';
import { useGame } from '../../context/GameContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGame();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[92%] max-w-md pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-slate-900/95 border-slate-700 text-slate-100';
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 glow-emerald';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'money-in') {
          bg = 'bg-emerald-950/95 border-emerald-500/60 text-emerald-50 glow-emerald';
          icon = <ArrowDownLeft className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'money-out') {
          bg = 'bg-amber-950/95 border-amber-500/50 text-amber-50 glow-gold';
          icon = <ArrowUpRight className="w-5 h-5 text-amber-400 shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-950/95 border-amber-500/40 text-amber-100';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-rose-950/95 border-rose-500/50 text-rose-100 glow-rose';
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${bg}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold truncate">{toast.title}</h4>
                {toast.amount !== undefined && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/40">
                    {toast.type === 'money-in' ? '+' : toast.type === 'money-out' ? '-' : ''}
                    {toast.amount} €
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 mt-0.5 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
