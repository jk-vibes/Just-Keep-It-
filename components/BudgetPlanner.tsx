import React, { useState, useMemo } from 'react';
import { BudgetItem, RecurringItem, UserSettings, Category, Expense, Bill, WealthItem, Frequency } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Plus, Target, 
  ChevronRight, Activity,
  Shield, Star, Trophy,
  Edit2, AlertCircle,
  ReceiptText, Coins, RefreshCw,
  Clock, Trash2, Landmark, CreditCard,
  ListFilter, History
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface CategoryStatCardProps {
  label: string;
  percentage: number;
  spent: number;
  color: string;
  icon: any;
  currencySymbol: string;
  isActive: boolean;
  onClick: () => void;
  isCompact: boolean;
}

const CategoryStatCard: React.FC<CategoryStatCardProps> = ({ 
  label, 
  percentage, 
  spent, 
  color, 
  icon: Icon,
  currencySymbol,
  isActive,
  onClick,
  isCompact
}) => {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 ${isCompact ? 'p-1.5 rounded-lg' : 'p-2 rounded-xl'} border-l-4 transition-all duration-300 text-left active:scale-95 ${
        isActive 
          ? 'bg-brand-surface border-brand-border shadow-md scale-[1.02]' 
          : 'bg-brand-accent/10 border-brand-border opacity-70 grayscale-[0.3]'
      }`}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`p-1 rounded-md bg-opacity-10`} style={{ backgroundColor: `${color}20`, color }}>
          <Icon size={12} />
        </div>
        <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-brand-text truncate`}>
          {currencySymbol}{Math.round(spent).toLocaleString()}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, percentage)}%`, backgroundColor: color }} />
          </div>
          <span className="text-[6px] font-black text-slate-400">{Math.round(percentage)}%</span>
        </div>
      </div>
    </button>
  );
};

interface BudgetPlannerProps {
  budgetItems: BudgetItem[];
  recurringItems: RecurringItem[];
  expenses: Expense[];
  bills: Bill[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  onAddBudget: () => void;
  onEditBudget: (item: BudgetItem) => void;
  onUpdateBudget: (id: string, updates: Partial<BudgetItem>) => void;
  onDeleteBudget: (id: string) => void;
  onPayBill: (bill: Bill) => void;
  onEditBill: (bill: Bill) => void;
  onDeleteBill: (id: string) => void;
  onAddBillClick: () => void;
  onAddRecurringClick: () => void;
  onEditRecurring: (item: RecurringItem) => void;
  onEditExpense: (expense: Expense) => void;
  onNavigate: (view: any, filter?: string) => void;
  viewDate: Date;
  initialTab?: 'Goals' | 'Bills' | 'Recurring';
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ 
  budgetItems, recurringItems, expenses, bills, wealthItems, settings,
  onAddBudget, onEditBudget, onPayBill, onEditBill, onDeleteBill, onAddBillClick,
  onAddRecurringClick, onEditRecurring, onEditExpense, onNavigate, viewDate, initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'Goals' | 'Bills' | 'Recurring'>(() => {
    if (initialTab === 'Goals' || initialTab === 'Bills' || initialTab === 'Recurring') return initialTab;
    return 'Goals';
  });
  const [activeBucket, setActiveBucket] = useState<Category>('Needs');
  const [showRecords, setShowRecords] = useState(false);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const isCompact = settings.density === 'Compact';

  const m = viewDate.getMonth();
  const y = viewDate.getFullYear();

  const bucketStats = useMemo(() => {
    const buckets: Category[] = ['Needs', 'Wants', 'Savings', 'Avoids'];
    const currentExps = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });

    const stats = buckets.map(cat => {
      const spent = currentExps.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
      const planned = budgetItems.filter(b => b.bucket === cat).reduce((sum, b) => sum + b.amount, 0);
      return {
        name: cat,
        spent,
        planned,
        percentage: planned > 0 ? (spent / planned) * 100 : 0,
        color: CATEGORY_COLORS[cat],
        icon: cat === 'Needs' ? Shield : cat === 'Wants' ? Star : cat === 'Savings' ? Trophy : AlertCircle
      };
    });

    const uncategorizedCount = currentExps.filter(e => e.category === 'Uncategorized' || !e.category).length;
    
    return { stats, uncategorizedCount };
  }, [expenses, budgetItems, m, y]);

  const filteredBudgetItems = useMemo(() => {
    // Milestones are now independent of the active bucket selection for utilization
    // But we still filter out 'Avoids' as per requirement
    return budgetItems.filter(b => b.bucket !== 'Avoids');
  }, [budgetItems]);

  const bucketExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y && e.category === activeBucket;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, activeBucket, m, y]);

  const daddyInsight = useMemo(() => {
    const avoids = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y && e.category === 'Avoids';
    });
    const avoidTotal = avoids.reduce((sum, e) => sum + e.amount, 0);
    const avoidCount = avoids.length;
    
    if (avoidCount === 0) return { message: "Clean slate, son. Keep it that way.", score: 100, color: 'text-emerald-500' };
    if (avoidTotal > 5000) return { message: "You're burning capital on nonsense. Tighten up.", score: 40, color: 'text-rose-500' };
    return { message: "Some leaks detected. Plug them before they sink you.", score: 75, color: 'text-amber-500' };
  }, [expenses, m, y]);

  const billStats = useMemo(() => {
    const pending = bills.filter(b => !b.isPaid);
    const total = pending.reduce((s, b) => s + b.amount, 0);
    return { total, list: pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) };
  }, [bills]);

  const recurringStats = useMemo(() => {
    const total = recurringItems.reduce((s, r) => s + r.amount, 0);
    return { total };
  }, [recurringItems]);

  return (
    <div className="pb-32 pt-0 animate-slide-up flex flex-col min-h-full">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1.5 mx-0.5 shadow-md h-[50px] flex items-center justify-between shrink-0 border border-white/5">
        <div className="flex flex-col px-1">
          <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">Planner</h1>
          <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Protocols & Goals</p>
        </div>
        <div className="flex items-center bg-white/10 rounded-xl p-0.5">
           {(['Goals', 'Bills', 'Recurring'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => { triggerHaptic(); setActiveTab(tab); }}
               className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-950 shadow-sm' : 'text-brand-headerText opacity-60'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'Goals' && (
        <div className="px-0.5 space-y-3">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center border border-brand-border">
                <Landmark size={20} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Daddy Mind Score</p>
                <p className={`text-[11px] font-black uppercase ${daddyInsight.color}`}>{daddyInsight.message}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black tracking-tighter text-brand-text">{daddyInsight.score}<span className="text-[10px] opacity-30">/100</span></p>
            </div>
          </div>

          <div className="flex gap-1.5">
             {bucketStats.stats.map(stat => (
               <CategoryStatCard 
                 key={stat.name}
                 label={stat.name}
                 spent={stat.spent}
                 percentage={stat.percentage}
                 color={stat.color}
                 icon={stat.icon}
                 currencySymbol={currencySymbol}
                 isActive={activeBucket === stat.name}
                 onClick={() => { 
                   triggerHaptic(); 
                   setActiveBucket(stat.name);
                   // Navigate to Ledger with filter
                   onNavigate('Ledger', stat.name);
                 }}
                 isCompact={isCompact}
               />
             ))}
          </div>

          {bucketStats.uncategorizedCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{bucketStats.uncategorizedCount} records need bucketing</span>
              </div>
              <button 
                onClick={() => { triggerHaptic(); setActiveBucket('Uncategorized'); setShowRecords(true); }}
                className="text-[7px] font-black text-amber-500 uppercase underline underline-offset-2"
              >
                Fix Now
              </button>
            </div>
          )}

          <div className="bg-brand-surface border border-brand-border rounded-[28px] overflow-hidden shadow-sm">
             <div className="px-5 py-4 border-b border-brand-border flex justify-between items-center bg-brand-accent/30">
                <div className="flex items-center gap-2">
                   <Target size={14} className="text-brand-primary" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-text">
                     {showRecords ? `${activeBucket} Registry` : 'Strategic Milestones'}
                   </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { triggerHaptic(); setShowRecords(!showRecords); }}
                    className={`p-1.5 rounded-lg transition-all ${showRecords ? 'bg-brand-primary text-white shadow-md' : 'bg-brand-accent text-slate-500'}`}
                    title={showRecords ? "Show Milestones" : "Show Records"}
                  >
                     {showRecords ? <Target size={14} /> : <History size={14} />}
                  </button>
                  {!showRecords && (
                    <button 
                      onClick={() => { triggerHaptic(); onAddBudget(); }}
                      className="p-1.5 bg-brand-accentUi text-brand-bg rounded-lg shadow-lg active:scale-90 transition-all"
                    >
                       <Plus size={14} strokeWidth={3} />
                    </button>
                  )}
                </div>
             </div>
             <div className="divide-y divide-brand-border min-h-[200px]">
                {showRecords ? (
                  bucketExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-30">
                       <History size={32} strokeWidth={1} />
                       <p className="text-[9px] font-black uppercase tracking-widest mt-4">No records in {activeBucket}</p>
                    </div>
                  ) : (
                    bucketExpenses.map(exp => (
                      <div 
                        key={exp.id} 
                        className="p-4 flex items-center justify-between group hover:bg-brand-accent/30 transition-colors cursor-pointer"
                        onClick={() => onEditExpense(exp)}
                      >
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-slate-500 shrink-0">
                               <ReceiptText size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-1.5">
                                  <h4 className="text-[10px] font-black uppercase text-brand-text truncate">{exp.merchant || 'General'}</h4>
                                  {exp.isImported && <span className="text-[6px] font-black bg-indigo-500/10 text-indigo-500 px-1 rounded">IMP</span>}
                               </div>
                               <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{exp.mainCategory} • {exp.subCategory}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[11px] font-black text-brand-text">{currencySymbol}{Math.round(exp.amount).toLocaleString()}</p>
                            <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">{new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</p>
                         </div>
                      </div>
                    ))
                  )
                ) : (
                  filteredBudgetItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-30">
                       <Activity size={32} strokeWidth={1} />
                       <p className="text-[9px] font-black uppercase tracking-widest mt-4">Zero {activeBucket} nodes</p>
                    </div>
                  ) : (
                    filteredBudgetItems.map(item => {
                      const spent = expenses
                        .filter(e => {
                        const d = new Date(e.date);
                        const matchesBucket = e.category === item.bucket;
                        const matchesMain = e.mainCategory === item.category;
                        const matchesSub = !item.subCategory || item.subCategory === 'General' || e.subCategory === item.subCategory;
                        return d.getMonth() === m && d.getFullYear() === y && matchesBucket && matchesMain && matchesSub;
                        })
                        .reduce((sum, e) => sum + e.amount, 0);
                      const progress = item.amount > 0 ? (spent / item.amount) * 100 : 0;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="p-4 flex items-center justify-between group hover:bg-brand-accent/30 transition-colors cursor-pointer"
                          onClick={() => onEditBudget(item)}
                        >
                           <div className="flex-1 min-w-0 mr-4">
                              <div className="flex justify-between items-end mb-2">
                                 <h4 className="text-[11px] font-black uppercase text-brand-text truncate">{item.name}</h4>
                                 <span className="text-[9px] font-black text-brand-text">
                                   {currencySymbol}{Math.round(spent).toLocaleString()} / <span className="opacity-40">{Math.round(item.amount).toLocaleString()}</span>
                                 </span>
                              </div>
                              <div className="w-full h-1 bg-brand-accent rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full transition-all duration-1000 ${progress > 100 ? 'bg-rose-500' : 'bg-brand-primary'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                              </div>
                           </div>
                           <button className="p-2 text-slate-600 hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all">
                              <Edit2 size={14} />
                           </button>
                        </div>
                      );
                    })
                  )
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Bills' && (
        <div className="px-0.5 space-y-3">
          <section className="bg-brand-surface p-5 rounded-[28px] border border-brand-border shadow-sm text-center">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2 block">Outstanding Load</span>
             <h3 className="text-2xl font-black text-rose-500 tracking-tighter leading-none">{currencySymbol}{billStats.total.toLocaleString()}</h3>
          </section>

          <div className="bg-brand-surface border border-brand-border rounded-[28px] overflow-hidden shadow-sm">
             <div className="px-5 py-4 border-b border-brand-border flex justify-between items-center bg-brand-accent/30">
                <div className="flex items-center gap-2">
                   <ReceiptText size={14} className="text-indigo-400" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-text">Payment Registry</h3>
                </div>
                <button 
                  onClick={() => { triggerHaptic(); onAddBillClick(); }}
                  className="p-1.5 bg-brand-accentUi text-brand-bg rounded-lg shadow-lg active:scale-90 transition-all"
                >
                   <Plus size={14} strokeWidth={3} />
                </button>
             </div>
             <div className="divide-y divide-brand-border min-h-[300px]">
                {billStats.list.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                     <AlertCircle size={32} strokeWidth={1} />
                     <p className="text-[9px] font-black uppercase tracking-widest mt-4">Registry Clear</p>
                  </div>
                ) : (
                  billStats.list.map(bill => {
                    const diffDays = Math.ceil((new Date(bill.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = diffDays < 0;
                    
                    return (
                      <div key={bill.id} className="p-4 flex items-center justify-between group hover:bg-brand-accent/30 transition-colors">
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button 
                              onClick={() => { triggerHaptic(); onPayBill(bill); }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isOverdue ? 'bg-rose-500/10 text-rose-500 animate-pulse' : 'bg-brand-accent text-slate-500 hover:bg-indigo-600 hover:text-white'}`}
                            >
                               <Coins size={18} />
                            </button>
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEditBill(bill)}>
                               <div className="flex items-center gap-2">
                                  <h4 className="text-[11px] font-black uppercase text-brand-text truncate leading-tight">{bill.merchant}</h4>
                                  <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isOverdue ? 'bg-rose-500 text-white' : 'bg-brand-accent text-slate-500'}`}>
                                    {isOverdue ? 'Overdue' : `T-${diffDays}d`}
                                  </span>
                               </div>
                               <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">{bill.mainCategory || 'UNCATEGORIZED'}</span>
                                  <span className="text-[7px] text-slate-300 opacity-30">•</span>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{bill.subCategory || 'GENERAL'}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right flex items-center gap-3 shrink-0 ml-2">
                            <div>
                               <p className="text-[13px] font-black text-brand-text tracking-tight">{currencySymbol}{Math.round(bill.amount).toLocaleString()}</p>
                               <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">
                                 {new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                               </p>
                            </div>
                            <button 
                              onClick={() => { triggerHaptic(); onEditBill(bill); }}
                              className="p-2 text-slate-600 hover:text-brand-primary active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                            >
                               <Edit2 size={14} />
                            </button>
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Recurring' && (
        <div className="px-0.5 space-y-3">
           <section className="bg-brand-surface p-5 rounded-[28px] border border-brand-border shadow-sm text-center">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2 block">Subscription Burn</span>
             <h3 className="text-2xl font-black text-indigo-400 tracking-tighter leading-none">{currencySymbol}{recurringStats.total.toLocaleString()}</h3>
           </section>

           <div className="bg-brand-surface border border-brand-border rounded-[28px] overflow-hidden shadow-sm">
             <div className="px-5 py-4 border-b border-brand-border flex justify-between items-center bg-brand-accent/30">
                <div className="flex items-center gap-2">
                   <RefreshCw size={14} className="text-emerald-500" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-text">Active Subscriptions</h3>
                </div>
                <button 
                  onClick={() => { triggerHaptic(); onAddRecurringClick(); }}
                  className="p-1.5 bg-brand-accentUi text-brand-bg rounded-lg shadow-lg active:scale-90 transition-all"
                >
                   <Plus size={14} strokeWidth={3} />
                </button>
             </div>
             <div className="divide-y divide-brand-border min-h-[300px]">
                {recurringItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                     <Clock size={32} strokeWidth={1} />
                     <p className="text-[9px] font-black uppercase tracking-widest mt-4">No recurring flows</p>
                  </div>
                ) : (
                  recurringItems.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-brand-accent/30 transition-colors" onClick={() => onEditRecurring(item)}>
                       <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Clock size={16} /></div>
                          <div>
                             <h4 className="text-[11px] font-black uppercase text-brand-text leading-tight">{item.merchant || item.note}</h4>
                             <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.frequency} • {item.bucket}</p>
                          </div>
                       </div>
                       <div className="text-right flex items-center gap-3">
                          <div>
                             <p className="text-[12px] font-black text-brand-text tracking-tight">{currencySymbol}{Math.round(item.amount).toLocaleString()}</p>
                             <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5 tracking-widest">Next: {new Date(item.nextDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-700 group-hover:text-brand-primary transition-colors" />
                       </div>
                    </div>
                  ))
                )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;