import React, { useState, useMemo } from 'react';
import { BudgetItem, RecurringItem, UserSettings, Category, Expense, Bill, WealthItem, Frequency } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Plus, Target, 
  ChevronRight, Activity,
  Shield, Star, Trophy,
  Edit2, AlertCircle,
  ReceiptText, Coins, RefreshCw,
  Clock, Trash2, Landmark, CreditCard
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

const QuickDistribution: React.FC<{ 
  distribution: Record<string, number>, 
  wealthItems: WealthItem[], 
  currencySymbol: string 
}> = ({ distribution, wealthItems, currencySymbol }) => {
  if (Object.keys(distribution).length === 0) return null;
  
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
      {Object.entries(distribution).map(([accId, amount]) => {
        const acc = wealthItems.find(w => w.id === accId);
        if (!acc) return null;
        return (
          <div key={accId} className="flex items-center justify-between py-2 px-3 hover:bg-brand-accent/30 transition-colors border-b border-brand-border cursor-pointer group bg-brand-surface">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${acc.type === 'Liability' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} transition-colors`}>
                {acc.type === 'Liability' ? <CreditCard size={12} /> : <Landmark size={12} />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-brand-text truncate uppercase tracking-tight leading-none mb-1.5">
                  {acc.alias || acc.name}
                </span>
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {acc.category}
                </span>
              </div>
            </div>
            {/* Cast amount to number to fix TS error: Argument of type 'unknown' is not assignable to parameter of type 'number' */}
            <span className="text-[11px] font-black text-brand-text">{currencySymbol}{Math.round(amount as number).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
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
  viewDate: Date;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ 
  budgetItems, recurringItems, expenses, bills, wealthItems, settings,
  onAddBudget, onEditBudget, onPayBill, onEditBill, onDeleteBill, onAddBillClick,
  onAddRecurringClick, onEditRecurring, onEditExpense, viewDate
}) => {
  const [activeTab, setActiveTab] = useState<'Goals' | 'Bills' | 'Recurring'>('Goals');
  const [activeBucket, setActiveBucket] = useState<Category>('Needs');
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

    return buckets.map(cat => {
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
  }, [expenses, budgetItems, m, y]);

  const filteredBudgetItems = useMemo(() => {
    return budgetItems.filter(b => b.bucket === activeBucket);
  }, [budgetItems, activeBucket]);

  const billStats = useMemo(() => {
    const pending = bills.filter(b => !b.isPaid);
    const total = pending.reduce((s, b) => s + b.amount, 0);
    const dist = pending.reduce((acc, b) => {
      if (b.accountId) acc[b.accountId] = (acc[b.accountId] || 0) + b.amount;
      return acc;
    }, {} as Record<string, number>);
    return { total, distribution: dist, list: pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) };
  }, [bills]);

  const recurringStats = useMemo(() => {
    const total = recurringItems.reduce((s, r) => s + r.amount, 0);
    const dist = recurringItems.reduce((acc, r) => {
      if (r.accountId) acc[r.accountId] = (acc[r.accountId] || 0) + r.amount;
      return acc;
    }, {} as Record<string, number>);
    return { total, distribution: dist };
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
          <div className="flex gap-1.5">
             {bucketStats.map(stat => (
               <CategoryStatCard 
                 key={stat.name}
                 label={stat.name}
                 spent={stat.spent}
                 percentage={stat.percentage}
                 color={stat.color}
                 icon={stat.icon}
                 currencySymbol={currencySymbol}
                 isActive={activeBucket === stat.name}
                 onClick={() => { triggerHaptic(); setActiveBucket(stat.name); }}
                 isCompact={isCompact}
               />
             ))}
          </div>

          <div className="bg-brand-surface border border-brand-border rounded-[28px] overflow-hidden shadow-sm">
             <div className="px-5 py-4 border-b border-brand-border flex justify-between items-center bg-brand-accent/30">
                <div className="flex items-center gap-2">
                   <Target size={14} className="text-brand-primary" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-text">{activeBucket} Milestones</h3>
                </div>
                <button 
                  onClick={() => { triggerHaptic(); onAddBudget(); }}
                  className="p-1.5 bg-brand-accentUi text-brand-bg rounded-lg shadow-lg active:scale-90 transition-all"
                >
                   <Plus size={14} strokeWidth={3} />
                </button>
             </div>
             <div className="divide-y divide-brand-border min-h-[200px]">
                {filteredBudgetItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-30">
                     <Activity size={32} strokeWidth={1} />
                     <p className="text-[9px] font-black uppercase tracking-widest mt-4">Zero {activeBucket} nodes</p>
                  </div>
                ) : (
                  filteredBudgetItems.map(item => {
                    const spent = expenses
                      .filter(e => {
                        const d = new Date(e.date);
                        return d.getMonth() === m && d.getFullYear() === y && 
                               (e.category === item.bucket && e.mainCategory === item.category);
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
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'Bills' && (
        <div className="px-0.5 space-y-3">
          <section className="bg-brand-surface p-4 rounded-[28px] border border-brand-border shadow-sm flex items-center justify-between">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Outstanding Load</span>
                <h3 className="text-xl font-black text-rose-500 tracking-tighter leading-none">{currencySymbol}{billStats.total.toLocaleString()}</h3>
             </div>
             <div className="flex-1 ml-6 min-w-0">
                <QuickDistribution distribution={billStats.distribution} wealthItems={wealthItems} currencySymbol={currencySymbol} />
             </div>
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
           <section className="bg-brand-surface p-4 rounded-[28px] border border-brand-border shadow-sm flex items-center justify-between">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Subscription Burn</span>
                <h3 className="text-xl font-black text-indigo-400 tracking-tighter leading-none">{currencySymbol}{recurringStats.total.toLocaleString()}</h3>
             </div>
             <div className="flex-1 ml-6 min-w-0">
                <QuickDistribution distribution={recurringStats.distribution} wealthItems={wealthItems} currencySymbol={currencySymbol} />
             </div>
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