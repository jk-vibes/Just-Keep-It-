import React, { useMemo, useState } from 'react';
import { 
  AreaChart, Area, 
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis,
  PieChart, Pie, Cell, YAxis
} from 'recharts';
import { Expense, UserSettings, Category, Income, WealthItem, UserProfile, BudgetItem, View, Bill } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  TrendingUp, Activity, Landmark, 
  ArrowRight, BrainCircuit,
  LayoutPanelLeft, BarChart3,
  PieChart as PieIcon,
  Percent, AlertTriangle, Sparkles,
  ArrowUpDown,
  History,
  TrendingDown,
  UserCircle2,
  X,
  ReceiptText,
  CalendarDays
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface DashboardProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  budgetItems: BudgetItem[];
  bills: Bill[];
  settings: UserSettings;
  user: UserProfile | null;
  onCategorizeClick: () => void;
  onConfirmExpense: (id: string, category: Category) => void;
  onSmartAdd: () => void;
  onAffordabilityCheck: () => void;
  onNavigate: (view: View, filter?: string) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, incomes, wealthItems, budgetItems, bills, settings, viewDate, onCategorizeClick, onNavigate
}) => {
  const [trendViewMode, setTrendViewMode] = useState<'area' | 'bar'>('area');
  const currencySymbol = getCurrencySymbol(settings.currency);
  const pendingCount = useMemo(() => expenses.filter(e => !e.isConfirmed).length, [expenses]);
  const isCompact = settings.density === 'Compact';

  const wealthStats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const liquid = wealthItems.filter(i => i.type === 'Investment' && ['Savings', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);
    return { 
      netWorth: Math.round(assets - liabilities), 
      liquid: Math.round(liquid) 
    };
  }, [wealthItems]);

  const stats = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const currentExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
    const spent = currentExps.reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncomes = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y);
    const totalIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome;
    
    const catData = (['Needs', 'Wants', 'Savings', 'Avoids'] as const).map(cat => {
      const val = currentExps.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
      const budget = budgetItems.filter(b => b.category === cat).reduce((sum, b) => sum + b.amount, 0);
      return { 
        name: cat, 
        value: val || 0.1, 
        displayValue: Math.round(val),
        color: CATEGORY_COLORS[cat], 
        utilization: budget > 0 ? (val / budget) * 100 : 0 
      };
    });

    const surplus = totalIncome - spent;
    const retentionRate = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;
    const avoidsTotal = currentExps.filter(e => e.category === 'Avoids').reduce((sum, e) => sum + e.amount, 0);
    const efficiencyRate = spent > 0 ? (1 - (avoidsTotal / spent)) * 100 : 100;
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;
    const daysElapsed = isCurrentMonth ? today.getDate() : new Date(y, m + 1, 0).getDate();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dailyBurn = spent / daysElapsed;
    const projectedFinish = dailyBurn * daysInMonth;

    return { spent: Math.round(spent), income: Math.round(totalIncome), surplus: Math.round(surplus), retentionRate, catData, dailyBurn, projectedFinish, efficiencyRate, avoidsTotal: Math.round(avoidsTotal) };
  }, [expenses, incomes, settings.monthlyIncome, viewDate, budgetItems]);

  const { trendData, categoryComparisonData } = useMemo(() => {
    const tData = [];
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const prevDateObj = new Date(y, m - 1, 1);
    const pm = prevDateObj.getMonth();
    const py = prevDateObj.getFullYear();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      const dm = d.getMonth();
      const dy = d.getFullYear();
      const monthExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === dm && new Date(e.date).getFullYear() === dy);
      const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });

      tData.push({
        month: monthLabel,
        Needs: Math.round(monthExps.filter(e => e.category === 'Needs').reduce((s, e) => s + e.amount, 0)),
        Wants: Math.round(monthExps.filter(e => e.category === 'Wants').reduce((s, e) => s + e.amount, 0)),
        Savings: Math.round(monthExps.filter(e => e.category === 'Savings').reduce((s, e) => s + e.amount, 0)),
        Avoids: Math.round(monthExps.filter(e => e.category === 'Avoids').reduce((s, e) => s + e.amount, 0)),
      });
    }

    const categories: Category[] = ['Needs', 'Wants', 'Savings', 'Avoids'];
    const compData = categories.map(cat => {
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

    return { trendData: tData, categoryComparisonData: compData };
  }, [expenses, viewDate]);

  const totalBillsAmount = useMemo(() => {
    return bills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  return (
    <div className={`pb-32 pt-0 animate-slide-up flex flex-col ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center shrink-0 border border-white/5">
        <div className="flex flex-col px-1">
          <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">Dashboard</h1>
          <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">Wealth Summary</p>
        </div>
      </div>

      <div className={`px-0.5 ${isCompact ? 'space-y-1.5' : 'space-y-3'}`}>
        <section className={`bg-brand-surface ${isCompact ? 'rounded-[20px] p-3' : 'rounded-[28px] p-5'} text-brand-text shadow-xl relative overflow-hidden flex items-center justify-between border border-brand-border`}>
          <div className="absolute top-0 right-0 p-2 opacity-5 rotate-12">
            <Landmark size={isCompact ? 40 : 60} />
          </div>
          <button 
            onClick={() => { triggerHaptic(); onNavigate('Accounts'); }}
            className="relative z-10 flex flex-col text-left active:scale-95 transition-transform"
          >
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">Total Worth</p>
            <h2 className={`${isCompact ? 'text-lg' : 'text-2xl'} font-black tracking-tighter leading-none`}>
              <span className="text-xs opacity-40 mr-0.5 font-bold">{currencySymbol}</span>
              {Math.round(wealthStats.netWorth).toLocaleString()}
            </h2>
          </button>
          <button 
            onClick={() => { triggerHaptic(); onNavigate('Accounts'); }}
            className="relative z-10 flex flex-col items-end border-l border-brand-border pl-6 text-right active:scale-95 transition-transform"
          >
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">Cash Balance</p>
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-black tracking-tighter leading-none`}>
              <span className="text-xs opacity-40 mr-0.5 font-bold">{currencySymbol}</span>
              {Math.round(wealthStats.liquid).toLocaleString()}
            </h2>
          </button>
        </section>

        <div className={`grid grid-cols-3 ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
           <button 
            onClick={() => { triggerHaptic(); onNavigate('Ledger', 'Avoids'); }}
            className={`bg-brand-surface ${isCompact ? 'p-2.5 rounded-2xl' : 'p-4 rounded-[24px]'} border border-brand-border shadow-sm text-left active:scale-95 transition-transform`}
          >
              <div className="flex items-center gap-1.5 mb-1.5">
                 <AlertTriangle size={12} className="text-amber-500" />
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Wasted</p>
              </div>
              <h3 className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-brand-text tracking-tighter leading-none`}>
                {currencySymbol}{Math.round(stats.avoidsTotal).toLocaleString()}
              </h3>
              <p className="text-[6px] font-bold text-slate-400 uppercase mt-1">Avoided</p>
           </button>

           <button 
             onClick={() => { triggerHaptic(); onNavigate('Budget', 'Bills'); }}
             className={`bg-brand-surface ${isCompact ? 'p-2.5 rounded-2xl' : 'p-4 rounded-[24px]'} border border-brand-border shadow-sm text-left active:scale-95 transition-transform`}
           >
              <div className="flex items-center gap-1.5 mb-1.5">
                 <ReceiptText size={12} className="text-rose-500" />
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bills</p>
              </div>
              <h3 className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-brand-text tracking-tighter leading-none`}>
                {currencySymbol}{Math.round(totalBillsAmount).toLocaleString()}
              </h3>
              <p className="text-[6px] font-bold text-slate-400 uppercase mt-1">Pending</p>
           </button>

           <button 
             onClick={() => { triggerHaptic(); onNavigate('Ledger'); }}
             className={`bg-brand-surface ${isCompact ? 'p-2.5 rounded-2xl' : 'p-4 rounded-[24px]'} border border-brand-border shadow-sm text-left active:scale-95 transition-transform`}
           >
              <div className="flex items-center gap-1.5 mb-1.5">
                 <Percent size={12} className="text-brand-primary" />
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saved %</p>
              </div>
              <h3 className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-brand-text tracking-tighter leading-none`}>
                {Math.round(stats.efficiencyRate)}%
              </h3>
              <p className="text-[6px] font-bold text-slate-400 uppercase mt-1">Score</p>
           </button>
        </div>

        <div className={`grid grid-cols-12 ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
           <section className={`col-span-7 bg-brand-surface ${isCompact ? 'p-2.5 rounded-2xl' : 'p-3 rounded-[24px]'} border border-brand-border shadow-sm overflow-hidden`}>
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-1.5">
                    <PieIcon size={12} className="text-indigo-400" />
                    <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Spending</h3>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`${isCompact ? 'h-16 w-16' : 'h-20 w-20'} relative flex-shrink-0`}>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.catData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isCompact ? 14 : 18}
                          outerRadius={isCompact ? 28 : 32}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {stats.catData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                   <h4 className={`${isCompact ? 'text-xs' : 'text-sm'} font-black tracking-tighter leading-none truncate ${stats.surplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.surplus < 0 ? '-' : ''}{currencySymbol}{Math.abs(Math.round(stats.surplus)).toLocaleString()}
                  </h4>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Leftover</p>
                </div>
              </div>
           </section>

           <section className={`col-span-5 bg-brand-surface ${isCompact ? 'p-2.5 rounded-2xl' : 'p-3 rounded-[24px]'} border border-brand-border shadow-sm overflow-hidden`}>
              <div className="flex items-center gap-1.5 mb-2.5">
                 <Activity size={10} className="text-slate-400" />
                 <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saved</h3>
              </div>
              <div className="flex flex-col items-center justify-center py-2">
                 <h3 className={`${isCompact ? 'text-xl' : 'text-2xl'} font-black text-brand-text tracking-tighter`}>{Math.round(stats.retentionRate)}%</h3>
                 <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Rate</span>
              </div>
           </section>
        </div>

        <section className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-5 rounded-[28px]'} border border-brand-border shadow-sm`}>
           <div className={`flex items-center justify-between ${isCompact ? 'mb-3' : 'mb-5'}`}>
              <div className="flex items-center gap-1.5">
                 <TrendingUp size={14} className="text-slate-400" />
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spending Trends</h3>
              </div>
              <div className="flex items-center bg-brand-accent p-0.5 rounded-xl border border-brand-border">
                <button 
                  onClick={() => { triggerHaptic(); setTrendViewMode('area'); }} 
                  className={`p-1.5 rounded-lg transition-all ${trendViewMode === 'area' ? 'bg-brand-surface text-indigo-500 shadow-sm' : 'text-slate-500'}`}
                >
                  <LayoutPanelLeft size={14} />
                </button>
                <button 
                  onClick={() => { triggerHaptic(); setTrendViewMode('bar'); }} 
                  className={`p-1.5 rounded-lg transition-all ${trendViewMode === 'bar' ? 'bg-brand-surface text-indigo-500 shadow-sm' : 'text-slate-500'}`}
                >
                  <BarChart3 size={14} />
                </button>
              </div>
           </div>
           
           <div className={`${isCompact ? 'h-36' : 'h-48'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                 {trendViewMode === 'area' ? (
                   <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                      dy={10}
                    />
                    <Tooltip 
                      formatter={(value: number) => Math.round(value).toLocaleString()}
                      contentStyle={{ backgroundColor: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '16px', fontSize: '9px' }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Area type="monotone" dataKey="Needs" stackId="1" stroke={CATEGORY_COLORS.Needs} fill={CATEGORY_COLORS.Needs} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="Wants" stackId="1" stroke={CATEGORY_COLORS.Wants} fill={CATEGORY_COLORS.Wants} fillOpacity={0.5} />
                    <Area type="monotone" dataKey="Savings" stackId="1" stroke={CATEGORY_COLORS.Savings} fill={CATEGORY_COLORS.Savings} fillOpacity={0.4} />
                    <Area type="monotone" dataKey="Avoids" stackId="1" stroke={CATEGORY_COLORS.Avoids} fill={CATEGORY_COLORS.Avoids} fillOpacity={0.3} />
                   </AreaChart>
                 ) : (
                   <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                      dy={10}
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      formatter={(value: number) => Math.round(value).toLocaleString()}
                      contentStyle={{ backgroundColor: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '16px', fontSize: '9px' }}
                    />
                    <Bar dataKey="Needs" stackId="a" fill={CATEGORY_COLORS.Needs} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Wants" stackId="a" fill={CATEGORY_COLORS.Wants} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Savings" stackId="a" fill={CATEGORY_COLORS.Savings} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Avoids" stackId="a" fill={CATEGORY_COLORS.Avoids} radius={[6, 6, 0, 0]} />
                   </BarChart>
                 )}
              </ResponsiveContainer>
           </div>
        </section>

        <section className={`bg-brand-surface ${isCompact ? 'p-3 rounded-2xl' : 'p-5 rounded-[28px]'} border border-brand-border shadow-sm`}>
           <div className={`flex items-center justify-between ${isCompact ? 'mb-3' : 'mb-5'}`}>
              <div className="flex items-center gap-1.5">
                 <History size={14} className="text-slate-400" />
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Variance</h3>
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
           
           <div className={`${isCompact ? 'h-40' : 'h-52'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={categoryComparisonData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }} barGap={2}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontStyle: 'normal', fontWeight: 900, fill: '#64748b' }} 
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
                                     <span className="text-[8px] font-bold text-slate-500 uppercase">Previous</span>
                                     <span className="text-[9px] font-black">{currencySymbol}{data.previous.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                     <span className="text-[8px] font-bold text-slate-500 uppercase">Current</span>
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
                    <Bar dataKey="previous" radius={[4, 4, 0, 0]} opacity={0.2}>
                       {categoryComparisonData.map((entry, index) => (
                         <Cell key={`cell-prev-${index}`} fill={entry.color} />
                       ))}
                    </Bar>
                    <Bar dataKey="current" radius={[4, 4, 0, 0]}>
                       {categoryComparisonData.map((entry, index) => (
                         <Cell 
                           key={`cell-curr-${index}`} 
                           fill={entry.color} 
                           style={{ filter: entry.isHigh ? 'drop-shadow(0 0 4px rgba(255,0,0,0.3))' : undefined }}
                         />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>

           <div className="mt-2 flex justify-center gap-4">
              {categoryComparisonData.some(d => d.isHigh) && (
                <div className="flex items-center gap-1 bg-rose-500/5 px-2 py-1 rounded-lg border border-rose-500/10">
                   <AlertTriangle size={10} className="text-rose-500" />
                   <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">Protocol Warning: Elevated Burn Rate Detected</span>
                </div>
              )}
           </div>
        </section>



        {pendingCount > 0 && (
          <button 
            onClick={() => { triggerHaptic(); onCategorizeClick(); }}
            className={`w-full bg-indigo-600 ${isCompact ? 'rounded-[24px] p-3.5' : 'rounded-[32px] p-5'} flex items-center justify-between active:scale-[0.98] transition-all group shadow-xl border border-indigo-400/20`}
          >
            <div className={`flex items-center ${isCompact ? 'gap-3' : 'gap-5'} px-1`}>
              <div className={`${isCompact ? 'p-2' : 'p-3'} bg-white/20 rounded-2xl backdrop-blur-md`}>
                 <BrainCircuit size={isCompact ? 18 : 24} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className={`${isCompact ? 'text-[10px]' : 'text-[12px]'} font-black text-white uppercase tracking-wider`}>{pendingCount} Transactions to Sort</h3>
                <p className="text-[7px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Categorization needed</p>
              </div>
            </div>
            <div className="bg-white/10 p-2 rounded-2xl text-white">
              <ArrowRight size={14} strokeWidth={3} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;