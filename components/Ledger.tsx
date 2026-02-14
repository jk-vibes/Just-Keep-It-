import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification, BudgetRule, Bill } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Trash2, Search, X, Sparkles, Loader2, 
  Banknote, Zap,
  ChevronLeft, ChevronRight,
  FilterX,
  PieChart as PieChartIcon,
  BrainCircuit,
  LayoutList, BarChart3,
  Wand2,
  TrendingDown,
  Plus,
  ChevronRight as ChevronRightIcon,
  Check,
  History,
  FileText,
  Copy,
  AlertTriangle,
  Play,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { auditTransaction, refineBatchTransactions } from '../services/geminiService';
import { parseSmsLocally } from '../utils/smsParser';
import { triggerHaptic } from '../utils/haptics';
import { getCategoryIcon } from '../utils/iconUtils';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip
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
  onBulkUpdateExpense: (ids: string[], updates: Partial<Expense>) => void;
  onBulkDelete: (ids: string[], type: 'expense' | 'income') => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onAddRecord: () => void;
  onAddIncome: () => void;
  onAddBulk: (items: any[]) => void;
  onViewRule?: (ruleId: string) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'advice') => void;
}

const SwipeableItem: React.FC<{
  item: any;
  recordType: 'expense' | 'income' | 'transfer' | 'bill_payment' | 'balance';
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  aiSuggestion?: { 
    category: Category; 
    mainCategory: string; 
    subCategory: string; 
    merchant: string; 
    note: string;
    potentialAvoid?: boolean; 
    isDuplicateOf?: string;
  };
  density: string;
  pendingBills: Bill[];
}> = ({ item, recordType, currencySymbol, onDelete, onEdit, onUpdateExpense, aiSuggestion: initialAiSuggestion, density, pendingBills }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localAiSuggestion, setLocalAiSuggestion] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showFloatingPopup, setShowFloatingPopup] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isCompact = density === 'Compact';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
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
          mainCategory: result.suggestedMainCategory,
          subCategory: result.suggestedSubCategory,
          merchant: item.merchant,
          note: item.note, 
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

  const handleApplyAiSuggestion = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    if (activeAiSuggestion && onUpdateExpense) {
      if (activeAiSuggestion.isDuplicateOf) {
        onDelete(item.id);
      } else {
        onUpdateExpense(item.id, {
          isConfirmed: true,
          category: activeAiSuggestion.category,
          mainCategory: activeAiSuggestion.mainCategory,
          subCategory: activeAiSuggestion.subCategory,
          merchant: activeAiSuggestion.merchant,
          note: activeAiSuggestion.note,
          isAIUpgraded: true
        });
      }
      setShowFloatingPopup(false);
    }
  };

  const amount = item.amount || 0;
  const parentCategory = recordType === 'expense' ? item.category : 'Uncategorized';
  const themeColor = recordType === 'income' ? '#10b981' : (recordType === 'transfer' || recordType === 'bill_payment') ? '#6366f1' : CATEGORY_COLORS[parentCategory as Category] || '#94a3b8';

  const isAvoidFlagged = parentCategory === 'Avoids' || activeAiSuggestion?.potentialAvoid;
  const isDuplicate = !!activeAiSuggestion?.isDuplicateOf;
  const hasDistinctNote = item.note && item.note !== item.merchant && item.note !== item.subCategory;

  const isCatDiff = activeAiSuggestion && (item.mainCategory !== activeAiSuggestion.mainCategory || item.subCategory !== activeAiSuggestion.subCategory);
  const isMerchantDiff = activeAiSuggestion && (item.merchant !== activeAiSuggestion.merchant);

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-6">
        <Trash2 className="text-white" size={16} />
      </div>
      
      <div 
        onClick={() => (triggerHaptic(), onEdit({ ...item, recordType }))}
        className={`relative z-10 px-4 ${isCompact ? 'py-1.5' : 'py-3'} border-b transition-all cursor-pointer flex flex-col gap-1 bg-brand-surface border-brand-border active:bg-white/5`} 
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
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
                  <div className={`flex items-center gap-1 font-extrabold ${isCompact ? 'text-[11px]' : 'text-[12px]'} truncate leading-tight transition-all rounded-md px-1 -mx-1 ${isCatDiff ? 'ring-1 ring-indigo-400/50 bg-indigo-50/5' : ''} ${isAvoidFlagged ? 'text-rose-500 dark:text-rose-400' : 'text-brand-text'}`}>
                    {recordType === 'income' ? <span>{item.type}</span> : (
                       <>
                         <span className="opacity-50">{item.mainCategory || item.category}</span>
                         <ChevronRightIcon size={8} className="opacity-30" />
                         <span>{item.subCategory || (item.category === 'Uncategorized' ? 'Pending' : item.category)}</span>
                       </>
                    )}
                  </div>
                  {item.ruleId && <Zap size={isCompact ? 6 : 8} className="text-emerald-500 fill-emerald-500" />}
                  {isDuplicate && <Copy size={8} className="text-rose-400" title="Possible Duplicate" />}
                </div>
                {!isCompact && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded truncate max-w-[120px] transition-all ${isMerchantDiff ? 'ring-1 ring-indigo-500/30 bg-indigo-500/10' : 'bg-black/40'} ${isDuplicate ? 'ring-1 ring-rose-500/50 bg-rose-500/10' : ''} ${isAvoidFlagged ? 'text-rose-500' : 'text-slate-500'}`}>
                        {item.merchant || 'General'}
                      </span>
                      <p className={`text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none`}>
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}
                {isCompact && (
                   <div className="flex flex-col gap-0.5 mt-0.5">
                     <p className={`text-[7px] font-bold uppercase tracking-widest leading-none transition-all px-1 -mx-1 rounded ${isMerchantDiff ? 'bg-indigo-500/10 text-indigo-400' : isAvoidFlagged ? 'text-rose-500/70' : 'text-slate-500'}`}>
                       {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()} • {item.merchant || 'GEN'}
                     </p>
                   </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <div className="text-right flex flex-col items-end">
              <p className={`font-black ${isCompact ? 'text-[13px]' : 'text-[15px]'} tracking-tight px-1 rounded transition-all ${isDuplicate ? 'ring-1 ring-rose-500/50 bg-rose-500/5 animate-pulse' : ''} ${recordType === 'income' ? 'text-emerald-500' : (recordType === 'transfer' || recordType === 'bill_payment') ? 'text-indigo-500' : (isAvoidFlagged ? 'text-rose-500' : 'text-brand-text')}`}>
                {recordType === 'income' ? '+' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
              </p>
              
              {recordType === 'expense' && (
                <button 
                  onClick={handleItemAudit} 
                  className={`mt-1.5 transition-all p-1 rounded-md hover:bg-indigo-500/10 active:scale-90 ${activeAiSuggestion ? 'text-indigo-400 animate-pulse' : 'text-slate-600 opacity-60 hover:opacity-100'}`}
                >
                  {isAuditing ? <Loader2 size={isCompact ? 10 : 12} className="animate-spin text-indigo-400" /> : <BrainCircuit size={isCompact ? 10 : 12} />}
                </button>
              )}
            </div>
            {!isCompact && (
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                <Edit2 size={12} />
              </div>
            )}
          </div>
        </div>

        {hasDistinctNote && (
          <div className="flex items-start gap-1.5 mt-1 px-1 opacity-50 overflow-hidden">
            <FileText size={8} className="shrink-0 mt-0.5" />
            <p className="text-[8px] font-bold italic truncate text-brand-text">{item.note}</p>
          </div>
        )}
        
        {showFloatingPopup && activeAiSuggestion && (
           <div className={`mt-2 p-2 rounded-xl shadow-xl animate-kick border flex flex-col gap-2 transition-colors ${isDuplicate ? 'bg-rose-600 border-rose-400/30' : 'bg-indigo-600 border-indigo-400/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0 mr-2">
                   <p className="text-[7px] font-black text-white/70 uppercase tracking-widest mb-0.5">
                      {isDuplicate ? 'Redundancy Detected' : activeAiSuggestion.potentialAvoid ? 'Tactical Avoid' : 'Neural Scan Suggestion'}
                   </p>
                   
                   <div className="flex items-center gap-1.5 text-white">
                      {isCatDiff ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black opacity-50 line-through truncate max-w-[80px]">{item.subCategory || 'General'}</span>
                          <ArrowRight size={8} />
                          <span className="text-[10px] font-black uppercase truncate">{activeAiSuggestion.subCategory}</span>
                        </div>
                      ) : (
                        <p className="text-[9px] font-black text-white uppercase truncate">
                          {isDuplicate ? 'Remove duplicate record' : `${activeAiSuggestion.mainCategory} • ${activeAiSuggestion.subCategory}`}
                        </p>
                      )}
                   </div>
                   
                   {!isDuplicate && activeAiSuggestion.note && (
                     <p className="text-[6px] font-bold text-white/50 italic truncate">"{activeAiSuggestion.note}"</p>
                   )}
                </div>
                <button 
                  onClick={handleApplyAiSuggestion}
                  className="bg-white text-indigo-600 px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-tight shadow-sm active:scale-95 transition-all shrink-0"
                >
                  {isDuplicate ? 'Purge Record' : 'Apply Overwrite'}
                </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const Ledger: React.FC<LedgerProps> = ({ 
  expenses, incomes, wealthItems, bills, settings, rules = [], onDeleteExpense, onDeleteIncome, onConfirm, onUpdateExpense, onBulkUpdateExpense, onBulkDelete, onEditRecord, onAddRecord, onAddIncome, onAddBulk, viewDate, onMonthChange, showToast
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer' | 'bill_payment'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setSearchOpen] = useState(false);
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
    const incs = incomes.filter(i => (i as any).isMatchingMonth ? (i as any).isMatchingMonth : isMatchingMonth(i.date)).map(i => ({ ...i, recordType: 'income' as const }));
    const all: any[] = [...exps, ...incs];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return all;
    return all.filter(rec => 
      (rec.merchant || '').toLowerCase().includes(q) || 
      (rec.category || '').toLowerCase().includes(q) || 
      (rec.mainCategory || '').toLowerCase().includes(q) || 
      (rec.subCategory || '').toLowerCase().includes(q) || 
      (rec.amount || 0).toString().includes(q)
    );
  }, [expenses, incomes, viewDate, searchQuery]);

  const filteredRecords = useMemo(() => {
    let list: any[] = [...baseRecords];
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

  const analyticsData = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const prevDateObj = new Date(y, m - 1, 1);
    const pm = prevDateObj.getMonth();
    const py = prevDateObj.getFullYear();

    const currentMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === y && e.subCategory !== 'Transfer';
    });

    const prevMonthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === pm && d.getFullYear() === py && e.subCategory !== 'Transfer';
    });

    const catMap: Record<string, number> = { Needs: 0, Wants: 0, Savings: 0, Avoids: 0 };
    currentMonthExpenses.forEach(e => { if (catMap[e.category] !== undefined) catMap[e.category] += e.amount; });
    
    const pieData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name as Category] }))
      .filter(d => d.value > 0);

    const comparisonData = (['Needs', 'Wants', 'Savings', 'Avoids'] as const).map(cat => {
      const current = currentMonthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      const previous = prevMonthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return {
        name: cat,
        current: Math.round(current),
        previous: Math.round(previous),
        color: CATEGORY_COLORS[cat]
      };
    });

    const totalOutflow = currentMonthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const efficiencyScore = totalOutflow > 0 ? (1 - ((catMap['Avoids'] || 0) / totalOutflow)) * 100 : 100;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const daysElapsed = (today.getMonth() === m && today.getFullYear() === y) ? today.getDate() : daysInMonth;
    
    return { pieData, comparisonData, totalOutflow, dailyBurn: totalOutflow / (daysElapsed || 1), efficiencyScore };
  }, [expenses, viewDate]);

  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.6;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  
    return (
      <text 
        x={x} y={y} 
        fill="var(--brand-text)" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-[7px] font-black uppercase tracking-tighter"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const handleApplyRules = () => {
    triggerHaptic();
    if (!rules || rules.length === 0) {
      showToast("No rules defined in the Rule Engine.", "error");
      return;
    }

    const unconfirmedExpenses = filteredRecords.filter(r => r.recordType === 'expense' && !r.isConfirmed);
    if (unconfirmedExpenses.length === 0) {
      showToast("No unconfirmed records to process.", "info");
      return;
    }

    let appliedCount = 0;
    unconfirmedExpenses.forEach(exp => {
      const merchant = (exp.merchant || '').toLowerCase();
      const note = (exp.note || '').toLowerCase();
      
      const match = rules.find(rule => {
        const kw = rule.keyword.toLowerCase();
        return merchant.includes(kw) || note.includes(kw);
      });

      if (match) {
        onUpdateExpense(exp.id, {
          category: match.category,
          mainCategory: match.mainCategory,
          subCategory: match.subCategory,
          ruleId: match.id,
          isConfirmed: true
        });
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      showToast(`Successfully applied rules to ${appliedCount} records.`, "success");
    } else {
      showToast("No matches found for existing rules.", "info");
    }
  };

  const handleBatchRefine = async () => {
    triggerHaptic();
    // Allow user to scan any visible expense in the current month view
    const candidates = (baseRecords as any[]).filter(r => r.recordType === 'expense');
    
    if (candidates.length === 0) {
      showToast("No expense records in current month to scan.", "info");
      return;
    }

    setIsRefining(true);
    showToast("Initiating Neural Audit for current month...", "info");

    try {
      const payload = candidates.map(c => ({ 
        id: c.id, 
        amount: Math.round(c.amount), 
        merchant: c.merchant || 'General', 
        note: c.note || '', 
        date: c.date 
      }));
      
      const suggestions = await refineBatchTransactions(payload);
      
      if (suggestions && suggestions.length > 0) {
        const newMap = { ...batchSuggestions };
        suggestions.forEach(s => { 
          newMap[s.id] = { 
            ...s, 
            potentialAvoid: s.isAvoidSuggestion,
            isDuplicateOf: s.isDuplicateOf
          }; 
        });
        setBatchSuggestions(newMap);
        
        const avoidCount = suggestions.filter(s => s.isAvoidSuggestion).length;
        const dupeCount = suggestions.filter(s => s.isDuplicateOf).length;
        showToast(`Scan complete: ${avoidCount} Avoids, ${dupeCount} Duplicates found.`, 'success');
        setIsShowingAISuggestionsOnly(true);
      } else {
        showToast("Neural scan completed. No optimizations suggested.", "success");
      }
    } catch (e) { 
      showToast("Tactical scan interrupted. Please try again.", "error");
    } finally { 
      setIsRefining(false); 
    }
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
        showToast(`Syncing ${results.length} incoming records.`, 'success');
      } else { alert("Registry failed to resolve CSV payload."); }
    } catch (err) { alert("Processing failure."); } 
    finally { setIsAnalyzing(false); }
  };

  const pendingBills = useMemo(() => bills.filter(b => !b.isPaid), [bills]);

  return (
    <div className={`pb-32 pt-0 animate-slide-up relative min-h-full flex flex-col ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center justify-between shrink-0 border border-white/5">
        <div className="flex flex-col px-1">
          <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">Ledger</h1>
          <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Audit Registry</p>
        </div>
        <div className="flex items-center gap-1.5">
           <button onClick={handleApplyRules} title="Run Rule Engine" className="p-2 bg-white/10 rounded-xl text-brand-headerText hover:bg-white/20 transition-all active:scale-95">
                <Zap size={16} strokeWidth={2.5} />
           </button>
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
           {isShowingAISuggestionsOnly && (
             <button 
               onClick={() => { triggerHaptic(); setIsShowingAISuggestionsOnly(false); }} 
               className="p-1.5 rounded-lg text-rose-500 active:scale-90 transition-transform bg-rose-500/10 mr-1"
               title="Clear Neural Filter"
             >
               <X size={16} strokeWidth={3} />
             </button>
           )}
           <button onClick={() => { triggerHaptic(); onAddIncome(); }} className="p-1.5 rounded-lg text-emerald-500 active:scale-90 transition-transform" title="Add Income"><Banknote size={18} strokeWidth={3} /></button>
           <button onClick={() => { triggerHaptic(); onAddRecord(); }} className="p-1.5 rounded-lg text-brand-accentUi active:scale-90 transition-transform" title="Add Expense"><Plus size={18} strokeWidth={3} /></button>
           <button onClick={() => { triggerHaptic(); setSearchOpen(!isSearchOpen); }} className={`p-1.5 rounded-lg transition-all ${isSearchOpen ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Search size={16} /></button>
        </div>
      </div>

      <div className="px-0.5 flex-1 flex flex-col">
        {viewMode === 'list' ? (
          <div className={`bg-brand-surface border border-brand-border ${isCompact ? 'rounded-[20px]' : 'rounded-[28px]'} overflow-hidden shadow-sm flex-1 min-h-[400px]`}>
            {isSearchOpen && (
              <div className="px-3 py-3 animate-kick flex flex-col gap-2 bg-brand-accent/30 border-b border-brand-border">
                <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search records..." className="w-full bg-brand-surface border border-brand-border px-4 py-2 rounded-xl text-xs font-bold text-brand-text outline-none focus:border-brand-primary/30" />
              </div>
            )}
            <div className="divide-y divide-brand-border">
              {filteredRecords.map((rec) => (
                <SwipeableItem 
                  key={rec.id} item={rec} recordType={rec.recordType} currencySymbol={currencySymbol} 
                  onDelete={rec.recordType === 'income' ? onDeleteIncome : onDeleteExpense} 
                  onEdit={onEditRecord} onUpdateExpense={onUpdateExpense}
                  aiSuggestion={batchSuggestions[rec.id]} density={settings.density || 'Compact'}
                  pendingBills={pendingBills}
                />
              ))}
              {filteredRecords.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center justify-center opacity-30">
                  {isShowingAISuggestionsOnly ? (
                    <>
                      <Check size={32} className="text-emerald-500 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Protocol Optimization Complete</p>
                      <button 
                        onClick={() => setIsShowingAISuggestionsOnly(false)}
                        className="mt-4 text-[8px] font-black text-brand-primary uppercase tracking-widest underline"
                      >
                        Return to Full Feed
                      </button>
                    </>
                  ) : (
                    <>
                      <FilterX size={32} strokeWidth={1.5} />
                      <p className="text-[10px] font-black uppercase tracking-widest mt-4">Registry Null</p>
                    </>
                  )}
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
                    <PieChartIcon size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation</h3>
                  </div>
                </div>
                <div className={`${isCompact ? 'h-48' : 'h-56'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={analyticsData.pieData} 
                        cx="50%" cy="50%" 
                        innerRadius={isCompact ? 22 : 30} 
                        outerRadius={isCompact ? 38 : 50} 
                        paddingAngle={4} 
                        dataKey="value"
                        labelLine={true}
                        label={renderPieLabel}
                      >
                        {analyticsData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </section>

            <section className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-5 rounded-[32px]'} border border-brand-border shadow-sm`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Variance</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 opacity-20" />
                      <span className="text-[7px] font-black text-slate-500 uppercase">Last</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accentUi" />
                      <span className="text-[7px] font-black text-slate-500 uppercase">This</span>
                    </div>
                  </div>
                </div>
                
                <div className={`${isCompact ? 'h-40' : 'h-52'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.comparisonData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }} barGap={2}>
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
                            return (
                              <div className="bg-brand-surface p-3 rounded-2xl border border-brand-border shadow-xl">
                                <p className="text-[9px] font-black text-brand-text uppercase mb-2">{data.name}</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Last Month</span>
                                    <span className="text-[8px] font-black text-brand-text">{currencySymbol}{data.previous.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">This Month</span>
                                    <span className="text-[8px] font-black text-brand-text">{currencySymbol}{data.current.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="previous" radius={[4, 4, 0, 0]} fill="var(--brand-text)" opacity={0.1} />
                      <Bar dataKey="current" radius={[4, 4, 0, 0]}>
                        {analyticsData.comparisonData.map((entry, index) => (
                          <Cell key={`cell-cur-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </section>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm p-2">
          <div className="bg-brand-surface w-full max-w-lg rounded-[32px] border border-brand-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
             <div className="flex justify-between items-center px-6 py-4 border-b border-brand-border">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-text">Import records</h3>
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

export default Ledger;