import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification, BudgetRule, Bill } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Trash2, Search, X, Sparkles, Loader2, Edit2, 
  Banknote, Zap, ArrowRightLeft,
  ArrowDownCircle, ArrowUpCircle, Wifi, Smartphone, 
  Shield, HeartPulse, ShoppingBag, Coffee, 
  Trophy, TrendingUp, TrendingDown, Home, Car, Utensils, Plane,
  Gift, Dumbbell, ChevronLeft, ChevronRight,
  Briefcase, Scissors, Building2, PiggyBank,
  BookOpen, Construction, FilterX,
  BrainCircuit,
  Fingerprint, LayoutList, BarChart3,
  Wand2,
  Square, CheckSquare,
  Star,
  Activity,
  ReceiptText,
  TrendingUp as TrendingUpIcon,
  History,
  Plus,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { auditTransaction, refineBatchTransactions } from '../services/geminiService';
import { parseSmsLocally } from '../utils/smsParser';
import { triggerHaptic } from '../utils/haptics';
import { getCategoryIcon } from '../utils/iconUtils';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';

interface LedgerProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  bills: Bill[];
  settings: UserSettings;
  rules?: BudgetRule[];
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteWealth: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onAddRecord: () => void;
  onAddIncome: () => void;
  onAddBulk: (items: any[]) => void;
  onViewRule?: (ruleId: string) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SwipeableItem: React.FC<{
  item: any;
  recordType: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'balance';
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  aiSuggestion?: { category: Category; subCategory: string; merchant: string; potentialAvoid?: boolean };
  isDuplicate?: boolean;
  density: string;
  pendingBills: Bill[];
}> = ({ item, recordType, currencySymbol, onDelete, onEdit, onUpdateExpense, isSelectionMode, isSelected, onToggleSelect, aiSuggestion: initialAiSuggestion, density, pendingBills }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localAiSuggestion, setLocalAiSuggestion] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showFloatingPopup, setShowFloatingPopup] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isCompact = density === 'Compact';

  const matchedBill = useMemo(() => {
    if (recordType !== 'expense' || item.isConfirmed) return null;
    return pendingBills.find(b => 
      Math.abs(b.amount - item.amount) < 2 && 
      (b.merchant.toLowerCase().includes((item.merchant || '').toLowerCase()) || 
       (item.merchant || '').toLowerCase().includes(b.merchant.toLowerCase()))
    );
  }, [item, recordType, pendingBills]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting || isSelectionMode) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0 || isSelectionMode) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting || isSelectionMode) return;
    if (offsetX < -75) { triggerHaptic(20); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const handleItemAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuditing || recordType !== 'expense') return;
    triggerHaptic();
    setIsAuditing(true);
    try {
      const result = await auditTransaction(item, currencySymbol);
      if (result) {
        setLocalAiSuggestion({
          category: result.suggestedCategory,
          subCategory: result.suggestedSubCategory,
          merchant: item.merchant,
          potentialAvoid: result.potentialAvoid
        });
        setShowFloatingPopup(true);
      }
    } catch (err) {
    } finally {
      setIsAuditing(false);
    }
  };

  const activeAiSuggestion = localAiSuggestion || initialAiSuggestion;

  const handleApplyMatchedBill = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    if (matchedBill && onUpdateExpense) {
      onUpdateExpense(item.id, {
        isConfirmed: true,
        billId: matchedBill.id,
        category: 'Needs',
        mainCategory: 'Obligations',
        subCategory: 'Bill Payment',
        isAIUpgraded: true,
        merchant: matchedBill.merchant
      });
    }
  };

  const amount = item.amount || 0;
  const parentCategory = recordType === 'expense' ? item.category : 'Uncategorized';
  const themeColor = recordType === 'income' ? '#10b981' : (recordType === 'transfer' || recordType === 'bill_payment') ? '#6366f1' : CATEGORY_COLORS[parentCategory as Category] || '#94a3b8';

  const isAvoidFlagged = parentCategory === 'Avoids' || activeAiSuggestion?.potentialAvoid;

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-6">
        <Trash2 className="text-white" size={16} />
      </div>
      
      <div 
        onClick={() => isSelectionMode ? onToggleSelect(item.id) : (triggerHaptic(), onEdit({ ...item, recordType }))}
        className={`relative z-10 px-4 ${isCompact ? 'py-1.5' : 'py-3'} border-b border-brand-border transition-all active:bg-white/5 cursor-pointer flex flex-col gap-1 bg-brand-surface`} 
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {isSelectionMode && (
              <div className={`shrink-0 transition-all ${isSelected ? 'text-brand-accentUi' : 'text-slate-600'}`}>
                {isSelected ? <CheckSquare size={16} fill="currentColor" className="text-brand-accentUi" /> : <Square size={16} />}
              </div>
            )}

            <div className="flex items-center gap-2 overflow-hidden">
              <div 
                className={`${isCompact ? 'w-7 h-7 p-1 rounded-lg' : 'w-10 h-10 p-2 rounded-xl'} flex items-center justify-center shrink-0`} 
                style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
              >
                {getCategoryIcon(
                  parentCategory, 
                  item.mainCategory, 
                  item.subCategory, 
                  recordType === 'income' ? item.type : undefined,
                  isCompact ? 14 : 18
                )}
              </div>
              <div className="min-w-0 flex flex-col pt-0.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className={`flex items-center gap-1 font-extrabold ${isCompact ? 'text-[11px]' : 'text-[12px]'} truncate leading-tight transition-colors ${isAvoidFlagged ? 'text-rose-500 dark:text-rose-400' : 'text-brand-text'}`}>
                    {recordType === 'income' ? <span>{item.type}</span> : (
                       <>
                         <span className="opacity-50">{item.mainCategory || item.category}</span>
                         <ChevronRightIcon size={8} className="opacity-30" />
                         <span>{item.subCategory || 'General'}</span>
                       </>
                    )}
                  </div>
                  {item.ruleId && <Zap size={isCompact ? 6 : 8} className="text-emerald-500 fill-emerald-500" />}
                  {matchedBill && (
                    <button onClick={handleApplyMatchedBill} className="flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-indigo-600 text-white animate-pulse border border-indigo-500/30">
                      <span className="text-[6px] font-black uppercase tracking-tight">Bill</span>
                    </button>
                  )}
                  {(item.isAIUpgraded || activeAiSuggestion || (recordType === 'expense' && !matchedBill)) && (
                    <button onClick={(e) => { e.stopPropagation(); if (activeAiSuggestion) setShowFloatingPopup(!showFloatingPopup); else handleItemAudit(e); }} className={`transition-colors p-0.5 ${activeAiSuggestion ? 'text-indigo-400 animate-pulse' : 'text-slate-600'}`}>
                      {isAuditing ? <Loader2 size={isCompact ? 8 : 10} className="animate-spin text-indigo-400" /> : <Sparkles size={isCompact ? 8 : 10} />}
                    </button>
                  )}
                </div>
                {!isCompact && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded truncate max-w-[100px] bg-black/40 ${isAvoidFlagged ? 'text-rose-500' : 'text-slate-500'}`}>
                        {item.merchant || 'General'}
                      </span>
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                      </p>
                    </div>
                    {item.note && item.note !== item.merchant && (
                      <p className="text-[9px] font-medium text-slate-400 italic mt-0.5 line-clamp-1 leading-tight">
                        {item.note}
                      </p>
                    )}
                  </div>
                )}
                {isCompact && (
                   <div className="flex flex-col gap-0.5 mt-0.5">
                     <p className={`text-[7px] font-bold uppercase tracking-widest leading-none ${isAvoidFlagged ? 'text-rose-500/70' : 'text-slate-500'}`}>
                       {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()} • {item.merchant || 'GEN'}
                     </p>
                     {item.note && item.note !== item.merchant && (
                       <p className="text-[8px] font-medium text-slate-500 italic mt-0.5 line-clamp-1">
                         {item.note}
                       </p>
                     )}
                   </div>
                )}
              </div>
            </div>
          </div>
          <p className={`font-black ${isCompact ? 'text-[13px]' : 'text-[15px]'} tracking-tight ${recordType === 'income' ? 'text-emerald-500' : (recordType === 'transfer' || recordType === 'bill_payment') ? 'text-indigo-500' : (isAvoidFlagged ? 'text-rose-500' : 'text-brand-text')}`}>
            {recordType === 'income' ? '+' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const Ledger: React.FC<LedgerProps> = ({ 
  expenses, incomes, wealthItems, bills, settings, rules = [], onDeleteExpense, onDeleteIncome, onDeleteWealth, onConfirm, onUpdateExpense, onEditRecord, onAddRecord, onAddIncome, onAddBulk, onViewRule, viewDate, onMonthChange, addNotification, showToast
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer' | 'bill_payment'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [batchSuggestions, setBatchSuggestions] = useState<Record<string, any>>({});
  const [isShowingAISuggestionsOnly, setIsShowingAISuggestionsOnly] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabel = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()} '${viewDate.getFullYear().toString().slice(-2)}`;
  const isCompact = settings.density === 'Compact';

  const baseRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const isMatchingMonth = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        return d.getMonth() === m && d.getFullYear() === y;
      } catch { return false; }
    };
    const exps = expenses.filter(e => isMatchingMonth(e.date)).map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.filter(i => isMatchingMonth(i.date)).map(i => ({ ...i, recordType: 'income' as const }));
    const all = [...exps, ...incs];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return all;
    return all.filter(rec => 
      (rec.merchant || '').toLowerCase().includes(q) || 
      (rec.note || '').toLowerCase().includes(q) || 
      (rec.category || '').toLowerCase().includes(q) || 
      (rec.mainCategory || '').toLowerCase().includes(q) || 
      (rec.subCategory || '').toLowerCase().includes(q) || 
      (rec.amount || 0).toString().includes(q)
    );
  }, [expenses, incomes, viewDate, searchQuery]);

  const analyticsData = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const prevDateObj = new Date(y, m - 1, 1);
    const pm = prevDateObj.getMonth();
    const py = prevDateObj.getFullYear();

    const currentMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return Number(d.getMonth()) === Number(m) && Number(d.getFullYear()) === Number(y);
    });
    
    const catMap: Record<string, number> = { Needs: 0, Wants: 0, Savings: 0, Avoids: 0 };
    currentMonthExpenses.forEach(e => {
        if (catMap[e.category] !== undefined) catMap[e.category] += e.amount;
    });
    const pieData = Object.entries(catMap).map(([name, value]) => ({ 
        name, value, color: CATEGORY_COLORS[name as Category] 
    })).filter(d => d.value > 0);

    const totalOutflow = currentMonthExpenses.reduce((s: number, e: Expense) => s + (Number(e.amount) || 0), 0);
    const totalInflowFiltered = incomes.filter(i => {
        const d = new Date(i.date);
        return Number(d.getMonth()) === Number(m) && Number(d.getFullYear()) === Number(y);
    });
    const totalInflow = totalInflowFiltered.reduce((s: number, i: Income) => s + (Number(i.amount) || 0), 0) || Number(settings.monthlyIncome || 0);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const daysElapsed = (today.getMonth() === m && today.getFullYear() === y) ? today.getDate() : daysInMonth;
    const dailyBurn = totalOutflow / (daysElapsed || 1);
    const efficiencyScore = totalOutflow > 0 ? (1 - (Number(catMap['Avoids'] || 0) / totalOutflow)) * 100 : 100;

    const categories: Category[] = ['Needs', 'Wants', 'Savings', 'Avoids'];
    const comparison = categories.map(cat => {
      const current = expenses.filter(e => e.category === cat && e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((s, e) => s + e.amount, 0);
      const previous = expenses.filter(e => e.category === cat && e.isConfirmed && new Date(e.date).getMonth() === pm && new Date(e.date).getFullYear() === py).reduce((s, e) => s + e.amount, 0);
      return {
        name: cat,
        current: Math.round(current),
        previous: Math.round(previous),
        color: CATEGORY_COLORS[cat],
        isHigh: current > previous && previous > 0 && (current - previous) / previous > 0.15
      };
    });

    return { pieData, totalOutflow, totalInflow, dailyBurn, efficiencyScore, comparison };
  }, [expenses, incomes, viewDate, settings.monthlyIncome]);

  const filteredRecords = useMemo(() => {
    let list = [...baseRecords];
    if (isShowingAISuggestionsOnly) {
      list = list.filter(e => !!batchSuggestions[e.id]);
    } else {
      if (filterType === 'expense') list = list.filter(r => r.recordType === 'expense' && !['Transfer', 'Bill Payment'].includes((r as any).subCategory || ''));
      else if (filterType === 'income') list = list.filter(r => r.recordType === 'income');
      else if (filterType === 'transfer') list = list.filter(r => (r as any).subCategory === 'Transfer');
      else if (filterType === 'bill_payment') list = list.filter(r => (r as any).subCategory === 'Bill Payment');
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [filterType, baseRecords, isShowingAISuggestionsOnly, batchSuggestions]);

  const handleBatchRefine = async () => {
    triggerHaptic();
    setIsRefining(true);
    const candidates = filteredRecords.filter(r => r.recordType === 'expense' && !(r as any).isAIUpgraded && !(r as any).ruleId);
    try {
      if (candidates.length > 0) {
        const payload = candidates.map(c => ({ id: c.id, amount: Math.round((c as any).amount), merchant: (c as any).merchant || 'General', note: (c as any).note || '' }));
        const suggestions = await refineBatchTransactions(payload);
        const newMap = { ...batchSuggestions };
        suggestions.forEach(s => { newMap[s.id] = { ...s, potentialAvoid: s.isAvoidSuggestion }; });
        setBatchSuggestions(newMap);
      }
      setIsShowingAISuggestionsOnly(true);
    } catch (e) { setIsShowingAISuggestionsOnly(true); } 
    finally { setIsRefining(false); }
  };

  const handleBatchImport = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    triggerHaptic();
    setIsAnalyzing(true);
    try {
      const results = parseSmsLocally(textToProcess);
      if (results?.length > 0) {
        onAddBulk(results);
        setShowImportModal(false);
        setImportText('');
        showToast(`Successfully ingested ${results.length} records.`, 'success');
      } else { alert("Failed to identify valid patterns."); }
    } catch (err) { alert("Processing failed."); } 
    finally { setIsAnalyzing(false); }
  };

  const pendingBills = useMemo(() => bills.filter(b => !b.isPaid), [bills]);

  return (
    <div className={`pb-32 pt-0 animate-slide-up relative min-h-full flex flex-col ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center justify-between shrink-0 border border-white/5">
        <div className="flex flex-col px-1">
          <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">Ledger</h1>
          <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-0.5">Audit Registry</p>
        </div>
        <div className="flex items-center gap-1.5">
           <button onClick={handleBatchRefine} disabled={isRefining} className={`p-2 rounded-xl transition-all active:scale-95 ${isShowingAISuggestionsOnly ? 'bg-white/20 text-brand-headerText' : 'bg-white/10 text-brand-headerText'}`}>
                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} strokeWidth={2.5} />}
           </button>
           <button onClick={() => { triggerHaptic(); setViewMode(viewMode === 'list' ? 'compare' : 'list'); }} className={`p-2 rounded-xl transition-all active:scale-95 ${viewMode === 'compare' ? 'bg-white/20 text-brand-headerText' : 'bg-white/10 text-brand-headerText'}`}>
             {viewMode === 'list' ? <BarChart3 size={16} /> : <LayoutList size={16} />}
          </button>
        </div>
      </div>

      <div className={`flex items-center justify-between glass p-1 rounded-xl mb-1 mx-0.5 border-white/5 shadow-sm ${isCompact ? 'h-[36px]' : 'h-[40px]'} shrink-0 relative z-[200]`}>
        <div className="flex items-center gap-1 h-full px-1">
          <button onClick={() => (triggerHaptic(), onMonthChange(-1))} className="p-1 text-slate-500 active:scale-90"><ChevronLeft size={16} strokeWidth={3} /></button>
          <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[55px] text-center">{monthLabel}</h2>
          <button onClick={() => (triggerHaptic(), onMonthChange(1))} className="p-1 text-slate-500 active:scale-90"><ChevronRight size={16} strokeWidth={3} /></button>
        </div>
        <div className="flex items-center gap-0.5 h-full pr-1">
           <button onClick={() => { triggerHaptic(); onAddIncome(); }} className="p-1.5 rounded-lg text-emerald-500 active:scale-90 transition-transform" title="Add Income"><Banknote size={18} strokeWidth={3} /></button>
           <button onClick={() => { triggerHaptic(); onAddRecord(); }} className="p-1.5 rounded-lg text-brand-accentUi active:scale-90 transition-transform" title="Add Expense"><Plus size={18} strokeWidth={3} /></button>
           <button onClick={() => { triggerHaptic(); setSearchOpen(!isSearchOpen); }} className={`p-1.5 rounded-lg transition-all ${isSearchOpen ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Search size={16} /></button>
           <button onClick={() => { triggerHaptic(); setIsSelectionMode(!isSelectionMode); }} className={`p-1.5 rounded-lg transition-all ${isSelectionMode ? 'bg-brand-accentUi text-black' : 'text-slate-500'}`}><Square size={16} /></button>
           <button onClick={() => { triggerHaptic(); setShowImportModal(true); }} className="p-1.5 text-slate-500 active:scale-90"><Sparkles size={16} /></button>
        </div>
      </div>

      <div className="px-0.5 flex-1 flex flex-col">
        {viewMode === 'list' ? (
          <div className={`bg-brand-surface border border-brand-border ${isCompact ? 'rounded-[20px]' : 'rounded-[28px]'} overflow-hidden shadow-sm flex-1 min-h-[400px]`}>
            {isSearchOpen && (
              <div className="px-3 pt-3 pb-1 animate-kick">
                <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-brand-accent border border-brand-border px-4 py-2 rounded-xl text-xs font-bold text-brand-text outline-none focus:border-brand-primary/30" />
              </div>
            )}
            <div className="divide-y divide-brand-border">
              {filteredRecords.map((rec) => (
                <SwipeableItem 
                  key={rec.id} item={rec} recordType={rec.recordType} currencySymbol={currencySymbol} 
                  onDelete={rec.recordType === 'income' ? onDeleteIncome : onDeleteExpense} 
                  onEdit={onEditRecord} onUpdateExpense={onUpdateExpense}
                  isSelectionMode={isSelectionMode} isSelected={selectedIds.has(rec.id)}
                  onToggleSelect={(id) => setSelectedIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                  aiSuggestion={batchSuggestions[rec.id]} density={settings.density || 'Compact'}
                  pendingBills={pendingBills}
                />
              ))}
              {filteredRecords.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center justify-center opacity-30">
                  <FilterX size={32} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Registry Null</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex flex-col ${isCompact ? 'gap-1.5' : 'gap-3'} pb-10 animate-slide-up`}>
            <div className={`grid grid-cols-2 ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
              <div className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-4 rounded-[28px]'} border border-brand-border shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={12} className="text-orange-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Daily Burn</span>
                </div>
                <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-black text-brand-text tracking-tighter leading-none`}>
                  {currencySymbol}{Math.round(analyticsData.dailyBurn).toLocaleString()}
                </h3>
              </div>

              <div className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-4 rounded-[28px]'} border border-brand-border shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} className="text-indigo-400" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Efficiency</span>
                </div>
                <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-black text-brand-text tracking-tighter leading-none`}>
                  {Math.round(analyticsData.efficiencyScore)}%
                </h3>
              </div>
            </div>

            <section className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-5 rounded-[32px]'} border border-brand-border shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieIcon size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation</h3>
                  </div>
                </div>
                <div className={`${isCompact ? 'h-36' : 'h-44'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isCompact ? 25 : 35}
                        outerRadius={isCompact ? 45 : 55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {analyticsData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                  {analyticsData.pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[7px] font-black uppercase text-slate-500">{d.name}</span>
                    </div>
                  ))}
                </div>
            </section>
            
            <section className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-5 rounded-[28px]'} border border-brand-border shadow-sm`}>
               <div className={`flex items-center justify-between ${isCompact ? 'mb-3' : 'mb-5'}`}>
                  <div className="flex items-center gap-1.5">
                     <History size={14} className="text-slate-400" />
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spend Variance</h3>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-40" />
                        <span className="text-[7px] font-black text-slate-500 uppercase">Last</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accentUi" />
                        <span className="text-[7px] font-black text-slate-500 uppercase">Current</span>
                     </div>
                  </div>
               </div>
               
               <div className={`${isCompact ? 'h-48' : 'h-56'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.comparison} margin={{ top: 10, right: 0, left: -20, bottom: 20 }} barGap={2}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                        dy={10}
                      />
                      <Tooltip 
                        cursor={{fill: 'var(--brand-accent)'}}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const diff = data.current - data.previous;
                            const percent = data.previous > 0 ? (diff / data.previous) * 100 : 0;
                            return (
                              <div className="bg-brand-surface p-3 rounded-2xl border border-brand-border shadow-xl">
                                 <p className="text-[10px] font-black text-brand-text uppercase mb-2">{data.name}</p>
                                 <div className="space-y-1">
                                    <div className="flex justify-between gap-4">
                                       <span className="text-[8px] font-bold text-slate-500 uppercase">Last Month</span>
                                       <span className="text-[9px] font-black">{currencySymbol}{data.previous.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                       <span className="text-[8px] font-bold text-slate-500 uppercase">This Month</span>
                                       <span className="text-[9px] font-black">{currencySymbol}{data.current.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-1 mt-1 border-t border-brand-border flex justify-between gap-4">
                                       <span className="text-[8px] font-black uppercase text-indigo-400">Variance</span>
                                       <span className={`text-[9px] font-black ${diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                          {diff > 0 ? '+' : ''}{Math.round(percent)}%
                                       </span>
                                    </div>
                                 </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="previous" radius={[4, 4, 0, 0]} opacity={0.25}>
                        {analyticsData.comparison.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                      <Bar dataKey="current" radius={[4, 4, 0, 0]}>
                        {analyticsData.comparison.map((entry, index) => (
                          <Cell 
                            key={`cell-curr-${index}`} 
                            fill={entry.color} 
                            style={{ filter: entry.isHigh ? 'drop-shadow(0 0 6px rgba(255,0,0,0.3))' : undefined }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="mt-2 flex justify-center gap-4">
                  {analyticsData.comparison.some(d => d.isHigh) && (
                    <div className="flex items-center gap-1.5 bg-rose-500/5 px-3 py-1.5 rounded-xl border border-rose-500/10">
                       <TrendingUpIcon size={12} className="text-rose-500" />
                       <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">High Spend Detected</span>
                    </div>
                  )}
               </div>
            </section>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-2">
          <div className="bg-brand-surface w-full max-w-lg rounded-[32px] border border-brand-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
             <div className="flex justify-between items-center px-6 py-4 border-b border-brand-border">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-text">Import signals</h3>
                <button onClick={() => setShowImportModal(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><X size={18} /></button>
             </div>
             <div className="p-6 space-y-4">
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste CSV or banking logs..." className="w-full h-44 bg-brand-accent border border-brand-border p-4 rounded-2xl text-[11px] font-medium text-brand-text resize-none outline-none focus:border-brand-primary/30" />
                <button onClick={() => handleBatchImport(importText)} disabled={!importText || isAnalyzing} className="w-full bg-brand-primary text-brand-headerText font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all border border-brand-border">
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : 'Execute Ingestion'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PieIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export default Ledger;