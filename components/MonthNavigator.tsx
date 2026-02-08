
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthNavigatorProps {
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate?: (year: number, month: number) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ viewDate, onMonthChange }) => {
  const month = viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const yearShort = viewDate.getFullYear().toString().slice(-2);

  return (
    <>
      {/* Navigation Arrows Overlay */}
      <div className="fixed inset-y-0 left-0 flex items-center z-[45] pointer-events-none p-2">
        <button 
          onClick={() => onMonthChange(-1)}
          className="pointer-events-auto p-3 bg-white/10 dark:bg-slate-800/20 backdrop-blur-md rounded-full text-slate-400 hover:text-brand-primary dark:hover:text-indigo-400 transition-all active:scale-90 border border-white/20 dark:border-slate-700/30 shadow-sm"
          aria-label="Previous Month"
        >
          <ChevronLeft size={24} strokeWidth={3} />
        </button>
      </div>

      <div className="fixed inset-y-0 right-0 flex items-center z-[45] pointer-events-none p-2">
        <button 
          onClick={() => onMonthChange(1)}
          className="pointer-events-auto p-3 bg-white/10 dark:bg-slate-800/20 backdrop-blur-md rounded-full text-slate-400 hover:text-brand-primary dark:hover:text-indigo-400 transition-all active:scale-90 border border-white/20 dark:border-slate-700/30 shadow-sm"
          aria-label="Next Month"
        >
          <ChevronRight size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Stamp Style Month Name - Updated to MMM'YY format */}
      <div className="fixed bottom-24 left-6 z-0 pointer-events-none select-none animate-kick opacity-5 dark:opacity-10">
        <div className="flex items-baseline leading-none">
          <span className="text-[120px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">
            {month}'{yearShort}
          </span>
        </div>
      </div>
    </>
  );
};

export default MonthNavigator;
