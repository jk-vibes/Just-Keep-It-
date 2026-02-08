import React, { useState, useMemo } from 'react';
import { BudgetItem, RecurringItem, UserSettings, Category, Expense, Bill, WealthItem, Frequency } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Plus, Target, 
  LayoutGrid, List, Layers,
  ChevronRight, Activity,
  Shield, Star, Trophy,
  Edit2, AlertCircle,
  ReceiptText, Coins, RefreshCw, Calendar,
  Clock
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
      <div className="flex items-center gap-1 mb-1 opacity-60">
        <Icon size={isCompact ? 8 : 10} style={{ color: isActive ? color : undefined }} />
        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <h4 className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-brand-text tracking-tighter leading-none`}>
          {Math.round(percentage)}%
        </h4>
      </div>
      <p className="text-[6px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">
        {currencySymbol}{Math.round(spent).toLocaleString()}
      </p>
    </button>
  );
};

const SubCategoryCard: React.FC<{ item: BudgetItem; spent: number; currencySymbol: string; isYTD: boolean; monthsElapsed: number; onEdit: (item: BudgetItem) => void; isCompact: boolean }> = ({ item, spent, currencySymbol, isYTD, monthsElapsed, onEdit, isCompact }) => {
    const budgetAmount = isYTD ? item.amount * monthsElapsed : item.amount;
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    const isOver = spent > budgetAmount;
    const color = CATEGORY_COLORS[item.bucket as Category];

    return (
        <div 
            onClick={() => { triggerHaptic(); onEdit(item); }}
            className={`bg-brand-surface ${isCompact ? 'p-2 rounded-xl' : 'p-2.5 rounded-2xl'} border border-brand-border shadow-sm flex flex-col gap-1.5 transition-all active:scale-[0.98] cursor-pointer group`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className={`${isCompact ? 'p-1' : 'p-1.5'} rounded-lg bg-brand-accent/20 text-slate-500 border border-white/5`} style={{ color }}>
                        <Layers size={isCompact ? 10 : 12} />
                    </div>
                    <div className="min-w-0">
                        <h4 className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black text-brand-text uppercase leading-none truncate w-32`}>{item.name}</h4>
                        <p className={`${isCompact ? 'text-[6px]' : 'text-[7px]'} font-bold text-slate-500 uppercase tracking-widest mt-0.5`}>{item.category} • {item.subCategory || 'General'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right">
                      <p className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} font-black ${isOver ? 'text-rose-500' : 'text-brand-text'}`}>
                          {currencySymbol}{Math.round(spent).toLocaleString()}
                      </p>
                      <p className={`${isCompact ? 'text-[6px]' : 'text-[7px]'} font-bold text-slate-500 uppercase tracking-widest`}>
                        of {currencySymbol}{Math.round(budgetAmount).toLocaleString()} ({Math.round(percentage)}%)
                      </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-600">
                    <Edit2 size={isCompact ? 8 : 10} />
                  </div>
                </div>
            </div>
            <div className="relative">
                <div className="w-full h-1 bg-brand-accent/10 rounded-full overflow-hidden flex border border-white/5">
                    <div 
                        className={`h-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : ''}`}
                        style={{ width: `${Math.min(100, percentage)}%`, backgroundColor: isOver ? undefined : color }}
                    />
                </div>
            </div>
        </div>
    );
};

const RecurringCard: React.FC<{ item: RecurringItem; currencySymbol: string; onEdit: (item: RecurringItem) => void; isCompact: boolean }> = ({ item, currencySymbol, onEdit, isCompact }) => {
  const color = CATEGORY_COLORS[item.bucket];
  
  return (
    <div 
      onClick={() => { triggerHaptic(); onEdit(item); }}
      className={`bg-brand-surface ${isCompact ? 'p-2.5 rounded-xl' : 'p-4 rounded-2xl'} border border-brand-border shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-brand-accent/20 border border-white/5 ${isCompact ? 'rounded-lg' : 'rounded-xl'}`} style={{ color }}>
          <RefreshCw size={isCompact ? 14 : 16} />
        </div>
        <div>
          <h4 className={`${isCompact ? 'text-[10px]' : 'text-[11px]'} font-black text-brand-text uppercase tracking-tight leading-none mb-1`}>{item.merchant || item.note}</h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={8} /> {item.frequency}
            </span>
            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1 rounded flex items-center gap-1">
              <Clock size={8} /> Next: {new Date(item.nextDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`${isCompact ? 'text-[11px]' : 'text-[12px]'} font-black text-brand-text`}>
            {currencySymbol}{Math.round(item.amount).toLocaleString()}
          </p>
          <p className="text-[6px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">EST. OUTFLOW</p>
        </div>
        <ChevronRight size={14} className="text-slate-700 group-hover:text-white transition-colors" />
      </div>
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
  onDeleteBill: (id: string) => void;
  onEditBill: (bill: Bill) => void;
  onEditExpense: (expense: Expense) => void;
  onEditRecurring: (item: RecurringItem) => void;
  onAddBillClick: () => void;
  onAddRecurringClick: () => void;
  viewDate: Date;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgetItems, expenses, bills, wealthItems, settings, recurringItems,
  onAddBudget, onEditBudget, onPayBill, onEditBill, onAddBillClick, 
  onAddRecurringClick, onEditRecurring, viewDate
}) => {
  const [activeView, setActiveView] = useState<'Budgets' | 'Bills' | 'Recurring'>('Budgets');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [period, setPeriod] = useState<'Monthly' | 'YTD'>('Monthly');
  const currencySymbol = getCurrencySymbol(settings.currency);
  const isCompact = settings.density === 'Compact';

  const handleCategoryToggle = (cat: Category) => {
    triggerHaptic();
    setSelectedCategory(prev => prev === cat ? null : cat);
  };

  const stats = useMemo(() => {
    const isYTD = period === 'YTD';
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const monthsElapsed = m + 1;
    const curExps = expenses.filter(e => {
      const d = new Date(e.date);
      if (isYTD) return d.getFullYear() === y && d.getMonth() <= m && e.subCategory !== 'Transfer';
      return d.getMonth() === m && d.getFullYear() === y && e.subCategory !== 'Transfer';
    });
    
    const categories: Category[] = ['Needs', 'Wants', 'Savings'];
    const utilByCat = categories.reduce((acc, cat) => {
      let catPlanned = budgetItems.filter(i => i.bucket === cat).reduce((s, i) => s + i.amount, 0);
      if (isYTD) catPlanned *= monthsElapsed;
      const catRealized = curExps.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      acc[cat] = { planned: catPlanned, realized: catRealized, percentage: catPlanned > 0 ? (catRealized / catPlanned) * 100 : 0 };
      return acc;
    }, {} as Record<string, { planned: number, realized: number, percentage: number }>);

    const subCatUsage = budgetItems.reduce((acc, item) => {
        const spent = curExps.filter(e => {
            const isMatchingBucket = e.category === item.bucket;
            if (!isMatchingBucket) return false;
            
            const isMatchingCategory = e.mainCategory === item.category;
            const subMatch = item.subCategory && (item.subCategory === 'General' || e.subCategory === item.subCategory);
            const nameMatch = e.merchant?.toLowerCase().includes(item.name.toLowerCase()) || 
                             e.note?.toLowerCase().includes(item.name.toLowerCase());
            
            return (isMatchingCategory && subMatch) || nameMatch;
        }).reduce((s, e) => s + e.amount, 0);
        
        acc[item.id] = spent;
        return acc;
    }, {} as Record<string, number>);

    const totalPendingBills = bills.reduce((sum, b) => sum + b.amount, 0);
    const totalRecurringMonthly = recurringItems.reduce((sum, r) => sum + r.amount, 0);
    return { utilByCat, subCatUsage, totalPendingBills, totalRecurringMonthly };
  }, [budgetItems, expenses, viewDate, period, bills, recurringItems]);

  const filteredBudgetItems = useMemo(() => {
    if (!selectedCategory) return budgetItems;
    return budgetItems.filter(item => item.bucket === selectedCategory);
  }, [budgetItems, selectedCategory]);

  return (
    <div className={`pb-32 pt-0 animate-slide-up flex flex-col ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-3 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center justify-between border border-white/5">
        <div className="flex flex-col">
          <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">Budget Planner</h1>
          <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-0.5">Tactical Protocol</p>
        </div>
        <button 
          onClick={() => { 
            triggerHaptic(); 
            if (activeView === 'Bills') onAddBillClick();
            else if (activeView === 'Recurring') onAddRecurringClick();
            else onAddBudget(); 
          }}
          className="p-2 bg-white/10 text-brand-headerText rounded-xl active:scale-95 transition-all border border-white/5"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="flex glass p-1 rounded-2xl mb-1 mx-0.5 border-white/5 shadow-sm h-[44px] items-center bg-brand-accent/10 shrink-0">
        <button onClick={() => setActiveView('Budgets')} className={`flex-1 h-full flex items-center justify-center gap-1.5 text-[8px] font-black uppercase rounded-xl transition-all ${activeView === 'Budgets' ? 'bg-brand-surface/60 text-brand-text shadow-sm' : 'text-slate-500'}`}>
          <LayoutGrid size={12} /> Goals
        </button>
        <button onClick={() => setActiveView('Bills')} className={`flex-1 h-full flex items-center justify-center gap-1.5 text-[8px] font-black uppercase rounded-xl transition-all ${activeView === 'Bills' ? 'bg-brand-surface/60 text-brand-text shadow-sm' : 'text-slate-500'}`}>
          <List size={12} /> Bills
        </button>
        <button onClick={() => setActiveView('Recurring')} className={`flex-1 h-full flex items-center justify-center gap-1.5 text-[8px] font-black uppercase rounded-xl transition-all ${activeView === 'Recurring' ? 'bg-brand-surface/60 text-brand-text shadow-sm' : 'text-slate-500'}`}>
          <RefreshCw size={12} /> Cycle
        </button>
      </div>

      <div className={`px-0.5 ${isCompact ? 'space-y-1.5' : 'space-y-3'}`}>
        {activeView === 'Budgets' ? (
          <>
            <section className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-4 rounded-[24px]'} border border-brand-border shadow-sm`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="bg-brand-accent/20 p-0.5 rounded-lg flex border border-white/5">
                      {(['Monthly', 'YTD'] as const).map(p => (
                        <button key={p} onClick={() => { triggerHaptic(); setPeriod(p); }} className={`px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-brand-surface/60 text-brand-text shadow-sm' : 'text-slate-500'}`}>
                          {p}
                        </button>
                      ))}
                   </div>
                </div>
                <div className={`flex ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
                  {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                    <CategoryStatCard 
                      key={cat} label={cat} percentage={stats.utilByCat[cat].percentage} spent={stats.utilByCat[cat].realized} color={CATEGORY_COLORS[cat]} 
                      icon={cat === 'Needs' ? Shield : cat === 'Wants' ? Star : Trophy} currencySymbol={currencySymbol} 
                      isActive={selectedCategory === cat} onClick={() => handleCategoryToggle(cat)} isCompact={isCompact}
                    />
                  ))}
                </div>
              </div>
            </section>
            <div className={`space-y-1.5 ${isCompact ? 'px-0' : 'px-0'}`}>
               {filteredBudgetItems.length === 0 ? (
                 <div className="py-20 text-center flex flex-col items-center justify-center opacity-20">
                    <Target size={40} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">No goals defined</p>
                 </div>
               ) : (
                 filteredBudgetItems.map(item => (
                   <SubCategoryCard key={item.id} item={item} spent={stats.subCatUsage[item.id] || 0} currencySymbol={currencySymbol} isYTD={period === 'YTD'} monthsElapsed={new Date(viewDate).getMonth() + 1} onEdit={onEditBudget} isCompact={isCompact} />
                 ))
               )}
            </div>
          </>
        ) : activeView === 'Bills' ? (
          <div className={`space-y-3 ${isCompact ? 'px-0' : 'px-0'}`}>
             <div className={`bg-brand-surface ${isCompact ? 'p-4 rounded-[24px]' : 'p-6 rounded-[32px]'} border border-brand-border shadow-lg relative overflow-hidden group`}>
               <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform">
                  <ReceiptText size={isCompact ? 60 : 80} />
               </div>
               <div className="relative z-10 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <Coins size={14} />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Outstanding Dues</span>
                  </div>
                  <h2 className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-black text-brand-text tracking-tighter leading-none`}>
                    <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
                    {stats.totalPendingBills.toLocaleString()}
                  </h2>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {bills.length} Pending Signals
                  </p>
               </div>
             </div>

             <div className="space-y-1.5">
                {bills.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center opacity-20">
                     <AlertCircle size={40} strokeWidth={1} />
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">Registry Clear</p>
                  </div>
                ) : (
                  bills.map(bill => {
                    const account = wealthItems.find(w => w.id === bill.accountId);
                    return (
                      <div 
                        key={bill.id}
                        onClick={() => { triggerHaptic(); onEditBill(bill); }}
                        className={`bg-brand-surface ${isCompact ? 'p-2.5 rounded-xl' : 'p-4 rounded-2xl'} border border-brand-border shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 bg-rose-500/10 text-rose-500 ${isCompact ? 'rounded-lg' : 'rounded-xl'}`}>
                            <ReceiptText size={isCompact ? 14 : 16} />
                          </div>
                          <div>
                            <h4 className={`${isCompact ? 'text-[10px]' : 'text-[11px]'} font-black text-brand-text uppercase tracking-tight leading-none mb-1`}>{bill.merchant}</h4>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                                Due {new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                              </span>
                              {account && !isCompact && (
                                <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1 rounded">
                                  {account.alias || account.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`${isCompact ? 'text-[11px]' : 'text-[12px]'} font-black text-brand-text`}>
                              {currencySymbol}{Math.round(bill.amount).toLocaleString()}
                            </p>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onPayBill(bill); }}
                              className="text-[7px] font-black text-indigo-500 uppercase tracking-widest mt-1 hover:underline"
                            >
                              Settle
                            </button>
                          </div>
                          <ChevronRight size={14} className="text-slate-700 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        ) : (
          <div className={`space-y-3 ${isCompact ? 'px-0' : 'px-0'}`}>
             <div className={`bg-brand-surface ${isCompact ? 'p-4 rounded-[24px]' : 'p-6 rounded-[32px]'} border border-brand-border shadow-lg relative overflow-hidden group`}>
               <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:scale-110 transition-transform">
                  <RefreshCw size={isCompact ? 60 : 80} />
               </div>
               <div className="relative z-10 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Clock size={14} />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Automated Outflows</span>
                  </div>
                  <h2 className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-black text-brand-text tracking-tighter leading-none`}>
                    <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
                    {stats.totalRecurringMonthly.toLocaleString()}
                  </h2>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    ESTIMATED MONTHLY LOAD
                  </p>
               </div>
             </div>

             <div className="space-y-1.5">
                {recurringItems.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center opacity-20">
                     <RefreshCw size={40} strokeWidth={1} />
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">No Recurring Signals</p>
                  </div>
                ) : (
                  recurringItems.map(item => (
                    <RecurringCard key={item.id} item={item} currencySymbol={currencySymbol} onEdit={onEditRecurring} isCompact={isCompact} />
                  ))
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPlanner;