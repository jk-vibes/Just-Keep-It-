import React from 'react';
import { X, Milestone, CheckCircle2, Star } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface VersionLogProps {
  onClose: () => void;
}

interface LogEntry {
  version: string;
  date: string;
  changes: string[];
}

const VERSION_HISTORY: LogEntry[] = [
  {
    version: '1.2.5',
    date: 'FEB 8, 2026',
    changes: [
      '⭐ High-Density Overhaul: Reduced all form padding and minimized font sizes for maximum mobile keyboard visibility.',
      '⭐ Specific Modal Routing: Removed the universal AddRecord popup in favor of specialized, lightweight Add/Edit modals for Expenses, Incomes, Bills, and Accounts.',
      '⭐ Trinity Row Selector: Merged Bucket, Category, and Sub-Category into a single horizontal selection row for lightning-fast entry.',
      '⭐ Custom Selection UI: Replaced standard system dropdowns with compact, styled menu buttons that look and feel premium.',
      'Refined Keyboard Experience: Optimized form scroll areas so action buttons remain reachable during high-density input.'
    ]
  },
  {
    version: '1.2.4',
    date: 'FEB 7, 2026',
    changes: [
      '⭐ Calibrated Moon theme contrast: The version badge now features high-visibility black text on white backgrounds.',
      '⭐ Ledger Stability: Refactored arithmetic logic to enforce strict type safety and eliminate rounding errors.',
      'Refined Header Interface: Streamlined the header by removing redundant load triggers.',
      'Navbar Logic: Enhanced the Dashboard briefcase fill to correctly utilize theme-aware accent colors.',
      'System Handshake: Stabilized application boot-up by resolving default export syntax inconsistencies.'
    ]
  }
];

const VersionLog: React.FC<VersionLogProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute inset-0 bg-black/40" onClick={() => { triggerHaptic(); onClose(); }} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[75dvh] animate-slide-up border border-white/10">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 text-white rounded-xl">
              <Milestone size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Build History</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Deployment Log</p>
            </div>
          </div>
          <button onClick={() => { triggerHaptic(); onClose(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 transition-all active:scale-90">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {VERSION_HISTORY.map((entry, idx) => (
            <div key={entry.version} className="relative pl-6">
              {idx !== VERSION_HISTORY.length - 1 && (
                <div className="absolute left-[7px] top-4 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800" />
              )}
              
              <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-4 ${idx === 0 ? 'bg-brand-primary border-blue-100 dark:border-blue-900/30' : 'bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900'}`} />

              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">v{entry.version}</h4>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{entry.date}</span>
                </div>
                
                <div className="space-y-2.5">
                  {entry.changes.map((change, cIdx) => {
                    const isMajor = change.startsWith('⭐');
                    const cleanText = isMajor ? change.substring(2).trim() : change;
                    
                    return (
                      <div key={cIdx} className="flex gap-2">
                        {isMajor ? (
                          <Star size={10} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 size={10} className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <p className={`text-[11px] leading-relaxed tracking-tight ${isMajor ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                          {cleanText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
           <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">Just Keep It • Personal Finance</p>
        </div>
      </div>
    </div>
  );
};

export default VersionLog;