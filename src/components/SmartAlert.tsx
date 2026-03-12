import React from 'react';
import { X, Sparkles, AlertCircle, Clock, CheckCircle2, ArrowRight, Zap, Target } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { getCurrencySymbol } from '../constants';

interface SmartAlertProps {
  type: 'Bill' | 'Strategy';
  title: string;
  message: string;
  data?: any;
  currency: string;
  onClose: () => void;
  onAction?: () => void;
}

const SmartAlert: React.FC<SmartAlertProps> = ({ type, title, message, data, currency, onClose, onAction }) => {
  const symbol = getCurrencySymbol(currency);
  const severity = data?.status === 'Critical' || type === 'Bill' ? 'Rose' : data?.status === 'Caution' ? 'Amber' : 'Emerald';

  const colors = {
    Rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-500',
    Amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-500',
    Emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-500',
  }[severity];

  return (
    <div className="fixed inset-x-4 top-20 z-[150] animate-slide-up">
      <div className={`relative overflow-hidden bg-gradient-to-br backdrop-blur-xl border ${colors} rounded-[32px] shadow-2xl p-6`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-white/10`}>
              {type === 'Bill' ? <Clock size={20} /> : <Sparkles size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight leading-none">{title}</h3>
              <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mt-1">
                {type === 'Bill' ? 'Proactive Reminder' : 'Tactical Protocol'}
              </p>
            </div>
          </div>
          <button onClick={() => { triggerHaptic(); onClose(); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs font-bold leading-relaxed mb-6 dark:text-white/90">
          {message}
        </p>

        {data && type === 'Strategy' && (
          <div className="space-y-3 mb-6 bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black uppercase opacity-60">Status Assessment</span>
              <span className={`text-[10px] font-black uppercase ${severity === 'Rose' ? 'text-rose-500' : severity === 'Amber' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {data.status}
              </span>
            </div>
            <div className="space-y-2">
              {data.drillDown?.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                  <span className="text-[10px] font-bold dark:text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
               <span className="text-[8px] font-black uppercase opacity-60">Tactical Headroom</span>
               <span className="text-xs font-black dark:text-white">{symbol}{data.headroom?.toLocaleString()}</span>
            </div>
          </div>
        )}

        <button 
          onClick={() => { triggerHaptic(); onAction?.(); }}
          className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {type === 'Bill' ? 'Authorize Payment' : 'Activate Plan'} <ArrowRight size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default SmartAlert;