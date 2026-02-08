import React, { useState, useRef, useEffect } from 'react';
import { Expense, Category, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Filter, Trash2, Search, X, Sparkles, ClipboardPaste, MessageSquare, Loader2 } from 'lucide-react';
import { parseBulkTransactions } from '../services/geminiService';

interface ExpenseListProps {
  expenses: Expense[];
  settings: UserSettings;
  onDelete: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onAddBulk: (expenses: Omit<Expense, 'id'>[]) => void;
}

interface SwipeableItemProps {
  exp: Expense;
  currencySymbol: string;
  onDelete: (id: string) => void;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ exp, currencySymbol, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJustConfirmed, setIsJustConfirmed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  
  // Track previous confirmed state to trigger animation
  const prevConfirmedRef = useRef(exp.isConfirmed);

  useEffect(() => {
    // If it was not confirmed, and now it is, trigger animation
    if (!prevConfirmedRef.current && exp.isConfirmed) {
      setIsJustConfirmed(true);
      const timer = setTimeout(() => setIsJustConfirmed(false), 1000);
      return () => clearTimeout(timer);
    }
    prevConfirmedRef.current = exp.isConfirmed;
  }, [exp.isConfirmed]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) {
      touchStartX.current = e.touches[0].clientX;
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;

    // Only allow swiping left
    if (diff < 0) {
      setOffsetX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) {
      triggerDelete();
    } else {
      setOffsetX(0);
    }
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const triggerDelete = () => {
    setOffsetX(-1000); // Fly off screen visual
    setIsDeleting(true); // Trigger collapse animation
    setTimeout(() => {
      onDelete(exp.id);
    }, 300); // Wait for transition before actual delete
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl group select-none transition-all duration-300 ease-out 
        ${isDeleting ? 'max-h-0 opacity-0 mb-0 scale-95' : 'max-h-24 opacity-100 mb-2 scale-100'}
        ${isJustConfirmed ? 'ring-2 ring-emerald-400 scale-[1.02]' : ''}
        animate-slide-up
      `}
    >
      {/* Background Action (Red Delete) */}
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-5 rounded-2xl">
        <Trash2 className="text-white animate-pulse" size={20} />
      </div>

      {/* Foreground Content */}
      <div 
        className={`bg-white dark:bg-slate-800 p-2 rounded-2xl border shadow-[0_1px_4px_-1px_rgba(0,0,0,0.02)] flex items-center justify-between relative z-10 touch-pan-y
          ${isJustConfirmed ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/10' : 'border-slate-100 dark:border-slate-800'}
        `}
        style={{ 
          transform: `translateX(${offsetX}px)`, 
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[10px] shadow-sm transition-transform group-hover:scale-105"
            style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
          >
            {exp.category[0]}
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-slate-900 dark:text-white text-xs leading-tight truncate max-w-[120px]">{exp.merchant || exp.note || 'General'}</h4>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">
              {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {!exp.isConfirmed && <span className="text-amber-500 font-black animate-pulse">• Pending</span>}
              {isJustConfirmed && <span className="text-emerald-500 font-black animate-bounce">• Saved</span>}
            </div>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div className="flex flex-col items-end">
            <p className="font-black text-slate-900 dark:text-white text-sm">{currencySymbol}{exp.amount.toLocaleString()}</p>
            <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{exp.category}</p>
          </div>
          {/* Desktop delete button */}
          <button 
            onClick={(e) => { e.stopPropagation(); triggerDelete(); }}
            className="p-1.5 text-slate-200 hover:text-rose-500 dark:text-slate-700 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, settings, onDelete, onConfirm, onAddBulk }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    setIsAnalyzing(true);
    const results = await parseBulkTransactions(importText, settings.currency);
    setIsAnalyzing(false);
    
    if (results && results.length > 0) {
      onAddBulk(results);
      setImportText('');
      setShowImportModal(false);
      alert(`Successfully imported ${results.length} transactions!`);
    } else {
      alert("No valid transactions found in the text.");
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportText(text);
    } catch (err) {
      alert("Failed to read clipboard.");
    }
  };

  // Filter expenses based on search query
  const filteredExpenses = expenses.filter(exp => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const merchant = (exp.merchant || '').toLowerCase();
    const note = (exp.note || '').toLowerCase();
    const amount = exp.amount.toString();
    const category = exp.category.toLowerCase();
    
    return merchant.includes(query) || 
           note.includes(query) || 
           amount.includes(query) ||
           category.includes(query);
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="pb-32 pt-2 min-h-full">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-2 -mx-4 px-4 mb-2 transition-colors flex gap-2">
        <div className="relative group flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#163074] dark:group-focus-within:text-indigo-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-slate-100 dark:bg-slate-800 pl-10 pr-10 py-3 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-slate-200 dark:focus:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
        
        {/* Magic Import Button */}
        <button 
          onClick={() => setShowImportModal(true)}
          className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-center"
        >
          <Sparkles size={20} />
        </button>
      </div>

      <div className="space-y-0"> 
        {/* Changed space-y-2 to space-y-0 because margin is handled in SwipeableItem for animation smoothness */}
        
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800/50 rounded-[24px] border-2 border-dashed border-slate-100 dark:border-slate-800 transition-colors animate-slide-up">
            {searchQuery ? (
              <div className="flex flex-col items-center">
                 <Search size={24} className="text-slate-200 mb-2" />
                 <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No results for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Filter size={24} className="text-slate-200 mb-2" />
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No transactions found</p>
              </div>
            )}
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <SwipeableItem 
              key={exp.id} 
              exp={exp} 
              currencySymbol={currencySymbol} 
              onDelete={onDelete} 
            />
          ))
        )}
      </div>

      {/* Magic Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center p-0 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] animate-slide-up shadow-2xl border-t border-white/10 p-1">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-2">
                 <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
                   <MessageSquare size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Import SMS Log</h3>
               </div>
               <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                 <X size={16} />
               </button>
             </div>
             
             <div className="p-6 space-y-4">
               <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                 <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 leading-relaxed">
                   🔒 Privacy Note: Browsers cannot read your SMS inbox directly. Please copy your transaction messages and paste them below. AI will filter out OTPs and spam.
                 </p>
               </div>

               <div className="relative">
                 <textarea
                   value={importText}
                   onChange={(e) => setImportText(e.target.value)}
                   placeholder="Paste your SMS text here..."
                   className="w-full h-40 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-medium text-slate-900 dark:text-white resize-none outline-none border border-slate-100 dark:border-slate-700 focus:border-indigo-500 transition-colors"
                 />
                 {!importText && (
                   <button 
                     onClick={pasteFromClipboard}
                     className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-600"
                   >
                     <ClipboardPaste size={12} /> Paste Clipboard
                   </button>
                 )}
               </div>

               <button
                 onClick={handleBulkImport}
                 disabled={!importText || isAnalyzing}
                 className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 size={16} className="animate-spin" /> Analyzing Transactions...
                   </>
                 ) : (
                   <>
                     <Sparkles size={16} /> Process Import
                   </>
                 )}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;