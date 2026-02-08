
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Trash2, Search, X, Sparkles, Loader2, Edit2, Banknote, History, Wallet } from 'lucide-react';
import { parseBulkTransactions, auditTransaction } from '../services/geminiService';

interface RecordListProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteWealth: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onAddBulk: (expenses: Omit<Expense, 'id'>[]) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
}

const SwipeableItem: React.FC<{
  item: Expense | Income | WealthItem;
  recordType: 'expense' | 'income' | 'wealth';
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  density: string;
}> = ({ item, recordType, currencySymbol, onDelete, onEdit, onUpdateExpense, density }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const touchStartX = useRef<number | null>(null);

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
    if (offsetX < -75) { setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const amount = (item as any).amount || (item as any).value;
  const label = recordType === 'wealth' ? (item as WealthItem).category : recordType === 'income' ? (item as Income).type : (item as Expense).category;
  const name = (item as any).merchant || (item as any).note || (item as any).name || 'Entry';
  const isLiability = recordType === 'wealth' && (item as WealthItem).type === 'Liability';

  const handleAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recordType !== 'expense' || auditLoading) return;
    setAuditLoading(true);
    const result = await auditTransaction(item as Expense, currencySymbol);
    setAuditResult(result);
    setAuditLoading(false);
  };

  const applyAuditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (auditResult?.suggestedCategory && onUpdateExpense) {
      onUpdateExpense(item.id, { category: auditResult.suggestedCategory as Category });
      setAuditResult(null);
    }
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-5"><Trash2 className="text-white animate-pulse" size={20} /></div>
      <div className={`relative z-10 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950 transition-transform`} style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded flex items-center justify-center text-white font-black text-[8px] shrink-0" style={{ backgroundColor: recordType === 'income' ? '#10b981' : recordType === 'wealth' ? (isLiability ? '#f59e0b' : '#3b82f6') : CATEGORY_COLORS[(item as Expense).category] }}>
              {label[0]}
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 dark:text-white text-[11px] truncate max-w-[150px] leading-tight mb-0.5">{name}</h4>
              <div className="flex items-center gap-2">
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-tight">{label}</p>
                {recordType === 'expense' && !auditResult && (
                  <button onClick={handleAudit} className="text-indigo-400 opacity-50 hover:opacity-100">
                    {auditLoading ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <p className={`font-black text-[12px] ${recordType === 'income' ? 'text-emerald-500' : isLiability ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                {recordType === 'income' ? '+' : recordType === 'wealth' ? '' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
              </p>
              <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest leading-none mt-1">{new Date((item as any).date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
            </div>
            <button onClick={() => onEdit(item)} className="p-1.5 text-slate-200 hover:text-indigo-500 transition-all"><Edit2 size={14} /></button>
          </div>
        </div>
        {auditResult && (
          <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 animate-kick">
            <p className="text-[8px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{auditResult.insight}</p>
            {!auditResult.isCorrect && (
              <button onClick={applyAuditCategory} className="mt-1.5 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[7px] font-black text-indigo-600 uppercase tracking-widest">Apply Category</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RecordList: React.FC<RecordListProps> = ({ 
  expenses, incomes, wealthItems, settings, onDeleteExpense, onDeleteIncome, onDeleteWealth, onEditRecord, onAddBulk, viewDate, addNotification, onUpdateExpense
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'inflows' | 'portfolio'>('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabelCompact = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}'${viewDate.getFullYear().toString().slice(-2)}`;

  const activityRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const exps = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; }).map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; }).map(i => ({ ...i, recordType: 'income' as const }));
    return [...exps, ...incs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, viewDate]);

  const inflowRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    return incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; }).map(i => ({ ...i, recordType: 'income' as const })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, viewDate]);

  const filteredRecords = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'activity') list = activityRecords;
    else if (activeTab === 'inflows') list = inflowRecords;
    else if (activeTab === 'portfolio') list = wealthItems.map(w => ({ ...w, recordType: 'wealth' as const }));
    return list.filter(rec => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const note = ((rec as any).note || (rec as any).merchant || (rec as any).name || '').toLowerCase();
      return note.includes(q) || (rec as any).amount?.toString().includes(q) || (rec as any).value?.toString().includes(q);
    });
  }, [activeTab, activityRecords, inflowRecords, wealthItems, searchQuery]);

  const handleBatchImport = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    setIsAnalyzing(true);
    try {
      const chunkResults = await parseBulkTransactions(textToProcess, settings.currency);
      if (chunkResults?.length > 0) {
        onAddBulk(chunkResults);
        addNotification({ type: 'Activity', title: 'Import Successful', message: `Added ${chunkResults.length} records.`, severity: 'success' });
      }
      setShowImportModal(false);
    } catch (err) { } finally { setIsAnalyzing(false); }
  };

  const density = settings.density || 'Compact';

  return (
    <div className="pb-32 pt-2 min-h-full">
      {/* PAGE HEADER */}
      <div className="bg-slate-900 px-5 py-4 rounded-2xl mb-4 mx-1">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-base font-black text-white tracking-tighter uppercase leading-none">Activity Ledger</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Real-time Transaction Feed</p>
          </div>
          <div className="flex gap-1.5">
             <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-2 rounded-xl transition-all ${isSearchOpen ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}><Search size={16} /></button>
             <button onClick={() => setShowImportModal(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"><Sparkles size={16} /></button>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md py-2 px-1 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2 px-2">
           <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{activeTab === 'portfolio' ? 'Assets & Debt' : monthLabelCompact}</h2>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg mx-1">
          <button onClick={() => setActiveTab('activity')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'activity' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm' : 'text-slate-400'}`}><History size={10} /> History</button>
          <button onClick={() => setActiveTab('inflows')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'inflows' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm' : 'text-slate-400'}`}><Banknote size={10} /> Inflows</button>
          <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1.5 ${activeTab === 'portfolio' ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-sm' : 'text-slate-400'}`}><Wallet size={10} /> Portfolio</button>
        </div>
        {isSearchOpen && (
          <div className="mt-2 animate-kick px-1">
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter records..." className="w-full bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold outline-none border-none text-slate-900 dark:text-white" />
          </div>
        )}
      </div>

      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-300 dark:text-slate-700 font-black text-[10px] uppercase tracking-[0.3em]">No Logged Activity</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <SwipeableItem key={rec.id} item={rec as any} recordType={rec.recordType} currencySymbol={currencySymbol} onDelete={rec.recordType === 'income' ? onDeleteIncome : rec.recordType === 'wealth' ? onDeleteWealth : onDeleteExpense} onEdit={onEditRecord} onUpdateExpense={onUpdateExpense} density={density} />
          ))
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Sync External Source</h3>
                <button onClick={() => setShowImportModal(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400"><X size={18} /></button>
             </div>
             <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
                <div className="space-y-4">
                  <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste SMS or CSV logs..." className="w-full h-40 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-xs font-medium outline-none border-none dark:text-white resize-none" />
                  <button onClick={() => handleBatchImport(importText)} disabled={!importText || isAnalyzing} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 transition-all">
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : 'Process Feed'}
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordList;
