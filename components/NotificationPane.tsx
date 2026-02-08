import React from 'react';
import { Notification } from '../types';
import { X, Sparkles, Activity, Clock, Trash2, CheckCircle2, Info, AlertTriangle, XCircle, Bell, BellOff } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface NotificationPaneProps {
  notifications: Notification[];
  onClose: () => void;
  onClear: () => void;
  isPage?: boolean;
}

const NotificationPane: React.FC<NotificationPaneProps> = ({ notifications, onClose, onClear, isPage }) => {
  const getIcon = (type: Notification['type'], severity?: Notification['severity']) => {
    if (type === 'AI') return <Sparkles size={16} className="text-brand-primary" />;
    switch (severity) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error': return <XCircle size={16} className="text-rose-500" />;
      default: return <Activity size={16} className="text-indigo-400" />;
    }
  };

  const getBackground = (severity?: Notification['severity']) => {
    switch (severity) {
      case 'success': return 'bg-emerald-500/5 border-emerald-500/10';
      case 'warning': return 'bg-amber-500/5 border-amber-500/10';
      case 'error': return 'bg-rose-500/5 border-rose-500/10';
      default: return 'bg-brand-surface border-brand-border';
    }
  };

  const content = (
    <div className="pb-32 pt-0 animate-slide-up flex flex-col gap-3 min-h-full">
      {/* Updated Header with themed gradient */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center justify-between shrink-0 border border-white/5">
        <div className="flex flex-col px-1">
          <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">Alerts</h1>
          <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Smart Feed • 7 Day Archival</p>
        </div>
        <div className="flex gap-1.5">
           <button onClick={() => { triggerHaptic(); onClear(); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-brand-headerText transition-all active:scale-90">
             <Trash2 size={16} strokeWidth={2.5} />
           </button>
           {!isPage && (
             <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-brand-headerText transition-all active:scale-90">
               <X size={16} strokeWidth={2.5} />
             </button>
           )}
        </div>
      </div>

      <div className="px-0.5 space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-center space-y-4 opacity-20">
            <div className="p-6 bg-black/40 rounded-[32px] border border-white/5">
              <BellOff size={40} strokeWidth={1} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocol Quiet</p>
            </div>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-[24px] border shadow-sm transition-all flex gap-3 group active:scale-[0.98] ${getBackground(notif.severity)}`}>
              <div className="flex-none mt-1">
                <div className="p-2 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                  {getIcon(notif.type, notif.severity)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-[12px] font-black text-brand-text uppercase tracking-tight truncate pr-2">{notif.title}</h4>
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded">
                    <Clock size={8} /> {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 leading-snug">{notif.message}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${notif.type === 'AI' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-black/20 text-slate-500 border-transparent'}`}>{notif.type} Module</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isPage) return content;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-brand-bg rounded-t-[40px] shadow-2xl overflow-hidden p-2">
        {content}
      </div>
    </div>
  );
};

export default NotificationPane;