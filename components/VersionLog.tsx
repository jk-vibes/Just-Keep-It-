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
    version: '1.2.4',
    date: 'FEB 7, 2026',
    changes: [
      '⭐ Calibrated Moon theme contrast: The version badge now features high-visibility black text on white backgrounds for optimal legibility.',
      '⭐ Ledger Stability: Refactored arithmetic logic to enforce strict type safety and numeric conversion, eliminating runtime computation errors.',
      'Refined Header Interface: Removed the redundant Demo Load trigger from the main header to streamline the UX.',
      'Navbar Logic: Enhanced the Dashboard briefcase fill to correctly utilize theme-aware accent colors in monochromatic modes.',
      'System Handshake: Stabilized application boot-up by resolving default export syntax inconsistencies.'
    ]
  },
  {
    version: '1.2.3',
    date: 'FEB 6, 2026',
    changes: [
      '⭐ Re-engineered Dark Mode aesthetics with "Light Black" (#0a0a0a) to eliminate blue tints for OLED displays.',
      '⭐ Fixed Account Registry editing protocol: Existing account entries now correctly populate with stored values on selection.',
      '⭐ Restored Budget Planner bill management: "Edit Bill" and "Pay Bill" settlement logic is now fully functional.',
      'Optimized the Tailwind palette for neutral gray tones across all pages.',
      'Stabilized modal routing for high-density entry forms and cross-component editing.'
    ]
  },
  {
    version: '1.2.2',
    date: 'JAN 17, 2026',
    changes: [
      '⭐ Redesigned the Settings interface to provide a high-fidelity, organized dashboard for all administrative tasks.',
      '⭐ Introduced a three-tier data management architecture separating archival tools, ingestion feeds, and destructive maintenance.',
      'Optimized the "Purge Ext." protocol to strictly target imported signals while ensuring your manual history remains untouched.',
      'Repositioned the system "Sign Off" control to a prominent, dedicated action zone at the base of the registry.',
      '⭐ Calibrated toast notification coordinates to the lower-left viewport to minimize interface obstruction.'
    ]
  },
  {
    version: '1.2.1',
    date: 'JAN 16, 2026',
    changes: [
      '⭐ Introduced dedicated "Capital Transfer" module for seamless inter-account rebalancing.',
      'Refactored Account Registry into a standardized, premium compact modal interface.',
      'Unified modal architecture across all entry systems (Expense, Account, Transfer).',
      '⭐ Enhanced "JK Briefcase" icon with dynamic budget-utilization fill logic in headers.',
      'Optimized information density and tactile feedback across core management units.'
    ]
  },
  {
    version: '1.2.0',
    date: 'JAN 15, 2026',
    changes: [
      '⭐ Integrated Structural Duplicate Validation into the Neural Audit engine.',
      'Added high-fidelity Chibi Naruto theme icon based on custom character art.',
      'Redesigned Theme selection with a floating aesthetic and horizontal distribution.',
      'Introduced "Collision Detection" (Amount + Source) to identify redundant entries.',
      'New "Registry Scrub" protocol for bulk removal of duplicate records.'
    ]
  },
  {
    version: '1.1.9',
    date: 'JAN 14, 2025',
    changes: [
      'Removed Audit Ingestion step for accelerated financial ledger updates.',
      'Refined CSV ingestion for direct mapping of Accounts, Transfers, and Income.',
      'Improved account binding heuristics for imported transactions.',
      'Renamed Data Management trigger to "Import CSV" for clarity.',
      'Aesthetic layout refinements and stability patches.'
    ]
  }
];

const VersionLog: React.FC<VersionLogProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute inset-0 bg-black/40" onClick={() => { triggerHaptic(); onClose(); }} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[75dvh] animate-slide-up border border-white/10">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 text-white rounded-xl">
              <Milestone size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Build History</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Deployment Registry</p>
            </div>
          </div>
          <button onClick={() => { triggerHaptic(); onClose(); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 transition-all active:scale-90">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {VERSION_HISTORY.map((entry, idx) => (
            <div key={entry.version} className="relative pl-6">
              {/* Timeline Line */}
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
           <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">just keep it tracking protocols</p>
        </div>
      </div>
    </div>
  );
};

export default VersionLog;