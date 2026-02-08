
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification, BudgetRule } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Trash2, Search, X, Sparkles, Loader2, Edit2, 
  Banknote, History, Wallet, Star, Shield, 
  Zap, HeartPulse, ShoppingBag, Coffee, 
  Trophy, TrendingUp, Landmark, CreditCard, 
  Globe, Bitcoin, Gem, Home, Activity,
  Plane, Utensils, Gift, Dumbbell, Car,
  ChevronLeft, ChevronRight, ArrowRightLeft,
  ArrowDownCircle, ArrowUpCircle, Wifi, Smartphone, 
  Briefcase, Scissors, User, Building2, PiggyBank,
  BookOpen, Construction, FilterX, FileText,
  BrainCircuit, Cpu, Wand2, Scale, ChevronRight as ChevronRightIcon,
  Fingerprint, LayoutList, BarChart3
} from 'lucide-react';
import { auditTransaction, refineBatchTransactions } from '../services/geminiService';
import { parseSmsLocally } from '../utils/smsParser';
import { triggerHaptic } from '../utils/haptics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface LedgerProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  rules?: BudgetRule[];
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteWealth: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onAddBulk: (items: any[]) => void;
  onViewRule?: (ruleId: string) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
}

const getCategoryIcon = (category: string, subCategory?: string, type?: string, recordType?: string) => {
  if (recordType === 'balance') return <Scale size={16} />;
  const sc = subCategory?.toLowerCase() || '';
  const c = category.toLowerCase();
  if (sc === 'transfer') return <ArrowRightLeft size={16} />;
  if (c === 'needs') {
    if (sc.includes('rent') || sc.includes('mortgage') || sc.includes('home')) return <Home size={16} />;
    if (sc.includes('fuel') || sc.includes('transport') || sc.includes('car')) return <Car size={16} />;
    if (sc.includes('grocer')) return <ShoppingBag size={16} />;
    if (sc.includes('util') || sc.includes('electricity') || sc.includes('water')) return <Zap size={16} />;
    if (sc.includes('health') || sc.includes('insur') || sc.includes('hospital')) return <HeartPulse size={16} />;
    if (sc.includes('internet') || sc.includes('wifi')) return <Wifi size={16} />;
    if (sc.includes('mobile') || sc.includes('phone')) return <Smartphone size={16} />;
    if (sc.includes('edu') || sc.includes('school')) return <BookOpen size={16} />;
    if (sc.includes('house') || sc.includes('mainten')) return <Construction size={16} />;
    return <Shield size={16} />;
  }
  if (c === 'wants') {
    if (sc.includes('din') || sc.includes('eat') || sc.includes('rest')) return <Utensils size={16} />;
    if (sc.includes('travel') || sc.includes('flight') || sc.includes('hotel')) return <Plane size={16} />;
    if (sc.includes('ent') || sc.includes('movie') || sc.includes('game')) return <Zap size={16} />;
    if (sc.includes('gift')) return <Gift size={16} />;
    if (sc.includes('hobb') || sc.includes('gym')) return <Dumbbell size={16} />;
    if (sc.includes('coffee') || sc.includes('cafe')) return <Coffee size={16} />;
    if (sc.includes('apparel') || sc.includes('cloth') || sc.includes('fashion')) return <ShoppingBag size={16} />;
    if (sc.includes('beauty') || sc.includes('groom') || sc.includes('salon')) return <Scissors size={16} />;
    return <Star size={16} />;
  }
  if (c === 'savings') {
    if (sc.includes('stock') || sc.includes('fund') || sc.includes('sip')) return <TrendingUp size={16} />;
    if (sc.includes('gold')) return <Gem size={16} />;
    if (sc.includes('crypto') || sc.includes('bitcoin')) return <Bitcoin size={16} />;
    if (sc.includes('emergency')) return <Shield size={16} />;
    if (sc.includes('real estate')) return <Building2 size={16} />;
    if (sc.includes('retire') || sc.includes('pension')) return <PiggyBank size={16} />;
    return <Trophy size={16} />;
  }
  if (type === 'Salary') return <Banknote size={16} />;
  if (type === 'Freelance') return <Briefcase size={16} />;
  if (type === 'Investment') return <TrendingUp size={16} />;
  if (type === 'Gift') return <Gift size={16} />;
  return <Sparkles size={16} />;
};

const SwipeableItem: React.FC<{
  item: any;
  recordType: 'expense' | 'income' | 'transfer' | 'balance';
  currencySymbol: string;
  matchedRule?: BudgetRule;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onViewRule?: (ruleId: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  density: string;
}> = ({ item, recordType, currencySymbol, matchedRule, onDelete, onEdit, onViewRule, onUpdateExpense, density }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const touchStartX = useRef<number | null>(null);
  const totalMovementRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; totalMovementRef.current = 0; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    totalMovementRef.current = Math.max(totalMovementRef.current, Math.abs(diff));
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) { triggerHaptic(20); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const amount = item.amount || item.value || 0;
  const parentCategory = recordType === 'expense' ? item.category : 'Uncategorized';
  const themeColor = recordType === 'income' ? '#10b981' : recordType === 'transfer' ? '#6366f1' : recordType === 'balance' ? '#3b82f6' : CATEGORY_COLORS[parentCategory] || '#94a3b8';
  
  const isRuleMatched = !!item.ruleId;
  const isAIUpgraded = item.isAIUpgraded;

  const handleAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (recordType !== 'expense' || auditLoading) return;
    setAuditLoading(true);
    const result = await auditTransaction(item, currencySymbol);
    setAuditResult(result);
    setAuditLoading(false);
  };

  const applyAuditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (auditResult?.suggestedCategory && onUpdateExpense) {
      onUpdateExpense(item.id, { category: auditResult.suggestedCategory as Category, isAIUpgraded: true, isConfirmed: true });
      setAuditResult(null);
    }
  };

  const handleViewRuleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.ruleId && onViewRule) {
      onViewRule(item.ruleId);
    }
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-end px-6">
        <Trash2 className="text-slate-400 dark:text-slate-500" size={18} />
      </div>
      
      <div 
        onClick={() => totalMovementRef.current < 10 && (triggerHaptic(), onEdit({ ...item, recordType }))}
        className={`relative z-10 px-4 py-3 border-b border-slate-50 dark:border-slate-800/40 bg-white dark:bg-slate-950 transition-all active:bg-slate-50 dark:active:bg-slate-900 cursor-pointer group`} 
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl mt-0.5" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
              {getCategoryIcon(parentCategory, item.subCategory, recordType === 'income' ? item.type : undefined, recordType)}
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[13px] truncate leading-tight">
                  {recordType === 'income' ? item.type : recordType === 'transfer' ? 'Transfer' : recordType === 'balance' ? 'Balance Snapshot' : item.subCategory || item.category}
                </h4>
                {isRuleMatched && <Zap size={8} className="text-emerald-500 fill-emerald-500 shrink-0" />}
                {isAIUpgraded && <Sparkles size={8} className="text-indigo-400 shrink-0" />}
                {recordType === 'expense' && !item.isConfirmed && !isAIUpgraded && !isRuleMatched && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {item.merchant || item.name || 'General'}
                </span>
                <span className="text-[7px] text-slate-300 dark:text-slate-600 font-black">•</span>
                <p className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-3 shrink-0 ml-2">
            <div>
              <p className={`font-black text-[15px] tracking-tight ${recordType === 'income' ? 'text-emerald-500' : recordType === 'transfer' ? 'text-indigo-500' : recordType === 'balance' ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>
                {recordType === 'income' ? '+' : recordType === 'transfer' ? '⇅' : recordType === 'balance' ? 'Σ' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
              </p>
              {recordType === 'expense' && !auditResult && !isAIUpgraded && !isRuleMatched && (
                <button onClick={handleAudit} className="text-indigo-400 opacity-50 hover:opacity-100 transition-transform active:scale-90 mt-1">
                  {auditLoading ? <Loader2 size={10} className="animate-spin" /> : <BrainCircuit size={10} />}
                </button>
              )}
            </div>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors"><Edit2 size={12} /></div>
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-50 dark:border-slate-800/50 pt-2 animate-kick">
           <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                   <Fingerprint size={10} className="text-slate-400" />
                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Source Context</span>
                </div>
                {isRuleMatched && (
                   <button onClick={handleViewRuleClick} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 hover:scale-105 active:scale-95 transition-all">
                      <span className="text-[7px] font-black uppercase">View Rule</span>
                      <ChevronRightIcon size={8} />
                   </button>
                )}
             </div>
             <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 italic leading-relaxed line-clamp-2">
                "{item.note || item.merchant || 'Manual entry - no source log recorded.'}"
             </p>
           </div>
        </div>
        
        {auditResult && (
          <div className="mt-2 p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 animate-kick">
            <p className="text-[7px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{auditResult.insight}</p>
            {!auditResult.isCorrect && (
              <button onClick={applyAuditCategory} className="mt-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[6px] font-black text-indigo-600 uppercase tracking-widest">Apply AI Suggestion</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Ledger: React.FC<LedgerProps> = ({ 
  expenses, incomes, wealthItems, settings, rules = [], onDeleteExpense, onDeleteIncome, onDeleteWealth, onEditRecord, onAddBulk, onViewRule, viewDate, onMonthChange, addNotification, onUpdateExpense
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabelCompact = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}'${viewDate.getFullYear().toString().slice(-2)}`;

  const currentMonthTotals = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const exps = expenses.filter(e => e.subCategory !== 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((sum, e) => sum + e.amount, 0);
    const incs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y).reduce((sum, i) => sum + i.amount, 0);
    return { income: incs, expense: exps, delta: incs - exps };
  }, [expenses, incomes, viewDate]);

  const compareData = useMemo(() => [
    { name: 'Income', amount: currentMonthTotals.income, color: '#10b981' },
    { name: 'Expense', amount: currentMonthTotals.expense, color: '#f43f5e' }
  ], [currentMonthTotals]);

  const filteredRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const q = searchQuery.toLowerCase().trim();
    const exps = expenses.filter(e => e.subCategory !== 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y).map(i => ({ ...i, recordType: 'income' as const }));
    const transfers = expenses.filter(e => e.subCategory === 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'transfer' as const }));
    
    let list: any[] = [];
    if (filterType === 'all') list = [...exps, ...incs, ...transfers];
    else if (filterType === 'expense') list = exps;
    else if (filterType === 'income') list = incs;
    else if (filterType === 'transfer') list = transfers;
    
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!q) return list;
    return list.filter(rec => {
      const name = (rec.merchant || rec.note || rec.name || '').toLowerCase();
      const cat = (rec.category || rec.type || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || rec.amount?.toString().includes(q) || rec.value?.toString().includes(q);
    });
  }, [filterType, expenses, incomes, viewDate, searchQuery]);

  const handleBatchImport = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    triggerHaptic();
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const results = parseSmsLocally(textToProcess);
      if (results?.length > 0) {
        onAddBulk(results);
        setShowImportModal(false);
        setImportText('');
      } else {
        alert("Failed to identify valid financial patterns. Ensure headers are present.");
      }
    } catch (err) { 
      alert("Inflow processing failed.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleFilterToggle = (type: typeof filterType) => {
    triggerHaptic();
    setFilterType(prev => prev === type ? 'all' : type);
  };

  const handleModeToggle = (mode: typeof viewMode) => {
    triggerHaptic();
    setViewMode(mode);
  };

  return (
    <div className="pb-32 pt-1 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Ledger</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Registry Log</p>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => { triggerHaptic(); setIsSearchOpen(!isSearchOpen); }} 
               className={`p-2 rounded-xl transition-all ${isSearchOpen ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/10 text-white active:scale-90'}`}
             >
               <Search size={14} />
             </button>
             <button 
               onClick={() => { triggerHaptic(); setShowImportModal(true); }} 
               className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-90"
             >
               <Sparkles size={14} />
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
              <button onClick={() => (triggerHaptic(), onMonthChange(-1))} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors active:scale-90"><ChevronLeft size={14} strokeWidth={3} /></button>
              <div className="px-2 flex items-center gap-2">
                <History size={11} className="text-brand-primary" />
                <h2 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-none">{monthLabelCompact}</h2>
              </div>
              <button onClick={() => (triggerHaptic(), onMonthChange(1))} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors active:scale-90"><ChevronRight size={14} strokeWidth={3} /></button>
            </div>
            
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => handleModeToggle('list')} 
                className={`p-1.5 rounded-lg transition-all active:scale-90 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}
                title="List View"
              >
                <LayoutList size={14} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => handleModeToggle('compare')} 
                className={`p-1.5 rounded-lg transition-all active:scale-90 ${viewMode === 'compare' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}
                title="Comparison View"
              >
                <BarChart3 size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleFilterToggle('expense')} 
                  className={`p-2 rounded-xl border transition-all active:scale-90 ${filterType === 'expense' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                  title="Expenses"
                >
                  <ArrowDownCircle size={14} />
                </button>
                <button 
                  onClick={() => handleFilterToggle('income')} 
                  className={`p-2 rounded-xl border transition-all active:scale-90 ${filterType === 'income' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                  title="Income"
                >
                  <ArrowUpCircle size={14} />
                </button>
                <button 
                  onClick={() => handleFilterToggle('transfer')} 
                  className={`p-2 rounded-xl border transition-all active:scale-90 ${filterType === 'transfer' ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                  title="Transfers"
                >
                  <ArrowRightLeft size={14} />
                </button>
                {filterType !== 'all' && (
                  <button 
                    onClick={() => (triggerHaptic(), setFilterType('all'))} 
                    className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                    title="Clear Filter"
                  >
                    <FilterX size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {isSearchOpen && viewMode === 'list' && (
            <div className="animate-kick">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  autoFocus 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search merchant, category or amount..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-primary transition-colors" 
                />
                {searchQuery && (
                  <button 
                    onClick={() => { triggerHaptic(); setSearchQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        {viewMode === 'list' ? (
          filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-36 text-center px-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl mb-4 text-slate-200 dark:text-slate-700">
                 <FilterX size={32} strokeWidth={1.5} />
              </div>
              <p className="text-slate-300 dark:text-slate-700 font-black text-[10px] uppercase tracking-[0.4em]">
                {searchQuery ? 'No search results found' : `No ${filterType === 'all' ? 'entries' : filterType} in registry`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {filteredRecords.map((rec) => (
                <SwipeableItem 
                  key={rec.id} 
                  item={rec} 
                  recordType={rec.recordType} 
                  currencySymbol={currencySymbol} 
                  matchedRule={rules.find(r => r.id === rec.ruleId)}
                  onDelete={rec.recordType === 'income' ? onDeleteIncome : rec.recordType === 'balance' ? onDeleteWealth : onDeleteExpense} 
                  onEdit={onEditRecord} 
                  onViewRule={onViewRule}
                  onUpdateExpense={onUpdateExpense}
                  density={settings.density || 'Compact'} 
                />
              ))}
            </div>
          )
        ) : (
          <div className="p-6 animate-slide-up">
            <div className="flex flex-col items-center gap-6 mb-8">
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Income</p>
                  <h3 className="text-xl font-black text-emerald-500 tracking-tighter">{currencySymbol}{currentMonthTotals.income.toLocaleString()}</h3>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Total Expense</p>
                  <h3 className="text-xl font-black text-rose-500 tracking-tighter">{currencySymbol}{currentMonthTotals.expense.toLocaleString()}</h3>
                </div>
              </div>

              <div className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Net Cash Flow</p>
                <h2 className={`text-4xl font-black tracking-tighter ${currentMonthTotals.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentMonthTotals.delta >= 0 ? '+' : ''}{currencySymbol}{Math.abs(currentMonthTotals.delta).toLocaleString()}
                </h2>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${currentMonthTotals.delta >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {currentMonthTotals.delta >= 0 ? 'Surplus Protocol' : 'Deficit Protocol'}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({active, payload}) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/90 backdrop-blur px-3 py-2 rounded-xl border border-white/10 shadow-xl">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                            <p className="text-sm font-black text-white">{currencySymbol}{(payload[0].value as number).toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[12, 12, 0, 0]} barSize={60}>
                    {compareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-around mt-2">
              {compareData.map(d => (
                <div key={d.name} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Import to Ledger</h3>
                <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400"><X size={18} /></button>
             </div>
             <div className="p-6 space-y-4">
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste CSV or banking logs here..." className="w-full h-44 bg-slate-50 dark:bg-slate-500/10 p-4 rounded-2xl text-[11px] font-medium outline-none border border-slate-100 dark:border-slate-800 dark:text-white resize-none" />
                <button onClick={() => handleBatchImport(importText)} disabled={!importText || isAnalyzing} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95">
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : 'Direct Ledger Ingestion'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
