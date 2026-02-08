import React, { useMemo, useState } from 'react';
import { WealthItem, UserSettings, Expense, Income, WealthCategory, Bill, Category } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS as APP_CAT_COLORS } from '../constants';
import { 
  Landmark, CreditCard, ShieldCheck, 
  ArrowRightLeft,
  PiggyBank, Briefcase, 
  TrendingUp, Coins, Home, Receipt, 
  Activity, PieChart as PieChartIcon,
  BarChart3, ChevronDown, ChevronUp,
  Target, Info, Zap, AlertCircle,
  LayoutGrid, List, BarChart as BarChartIcon,
  ArrowUpRight, ArrowDownRight, Layers,
  ReceiptText, Sparkles, Plus
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, 
  ResponsiveContainer, Tooltip, 
  Cell, LabelList, CartesianGrid 
} from 'recharts';
import { triggerHaptic } from '../utils/haptics';

interface AccountsProps {
  wealthItems: WealthItem[];
  expenses: Expense[];
  incomes: Income[];
  bills: Bill[];
  settings: UserSettings;
  onUpdateWealth: (id: string, updates: Partial<WealthItem>) => void;
  onDeleteWealth: (id: string) => void;
  onAddWealth: (item: Omit<WealthItem, 'id'>) => void;
  onEditAccount: (account: WealthItem) => void;
  onAddAccountClick: () => void;
  onAddBillClick?: (extra?: any) => void;
  onAddIncomeClick?: () => void;
  onAddTransferClick?: () => void;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const WEALTH_COLORS: Record<string, string> = {
  'Savings': '#10b981',
  'Gold': '#facc15',
  'Investment': '#6366f1',
  'Cash': '#34d399',
  'Credit Card': '#f43f5e',
  'Home Loan': '#e11d48',
  'Personal Loan': '#fb7185',
  'Pension': '#8b5cf6',
  'Other': '#94a3b8'
};

const getCategoryIcon = (category: WealthCategory) => {
  switch (category) {
    case 'Savings': return <PiggyBank size={10} />;
    case 'Pension': return <Briefcase size={10} />;
    case 'Gold': return <Coins size={10} />;
    case 'Investment': return <TrendingUp size={10} />;
    case 'Credit Card': return <CreditCard size={10} />;
    case 'Home Loan': return <Home size={10} />;
    case 'Personal Loan': return <Receipt size={10} />;
    case 'Gold Loan': return <Coins size={10} />;
    case 'Overdraft': return <Activity size={10} />;
    default: return <Landmark size={10} />;
  }
};

const UltraCompactRow: React.FC<{
  item: WealthItem;
  unpaidBills: number;
  currencySymbol: string;
  onClick: () => void;
}> = ({ item, unpaidBills, currencySymbol, onClick }) => {
  const isCC = item.category === 'Credit Card';
  const displayValue = isCC 
    ? Math.max(0, (item.limit || 0) - item.value - unpaidBills)
    : item.value;

  return (
    <div 
      onClick={() => { triggerHaptic(); onClick(); }}
      className="flex items-center justify-between py-2 px-3 hover:bg-brand-accent/30 transition-colors border-b border-brand-border cursor-pointer group bg-brand-surface"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`p-2 rounded-lg ${item.type === 'Liability' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} transition-colors`}>
          {getCategoryIcon(item.category)}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black text-brand-text truncate uppercase tracking-tight leading-none mb-1.5">
            {item.alias || item.name}
          </span>
          <div className="flex items-center gap-1.5">
             <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">
               {item.category}
             </span>
             {isCC && (
               <span className="text-[6px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-1 rounded">
                 Due: {currencySymbol}{Math.round(item.value + unpaidBills).toLocaleString()}
               </span>
             )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className={`text-[11px] font-black tracking-tight leading-none ${isCC ? 'text-indigo-400' : (item.value < 0 ? 'text-rose-500' : 'text-brand-text')}`}>
          {item.value < 0 && !isCC ? '-' : ''}{currencySymbol}{Math.abs(Math.round(displayValue)).toLocaleString()}
        </span>
        {isCC && <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest mt-1">Available</span>}
      </div>
    </div>
  );
};

const CustomLabel = (props: any) => {
  const { x, y, width, value, currencySymbol, position = "top" } = props;
  if (!value) return null;
  return (
    <text 
      x={position === "right" ? x + width + 5 : x + width / 2} 
      y={position === "right" ? y + 10 : y - 10} 
      fill="currentColor" 
      textAnchor={position === "right" ? "start" : "middle"}
      className="text-[9px] font-black fill-brand-text"
    >
      {currencySymbol}{Math.round(value).toLocaleString()}
    </text>
  );
};

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, settings, bills, onEditAccount, onAddTransferClick, onAddAccountClick
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'registry'>('dashboard');
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  const stats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const accountLiabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const liquid = wealthItems.filter(i => i.type === 'Investment' && ['Savings', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);
    const totalUnpaidBills = bills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);
    
    const totalLiabilities = Math.round(accountLiabilities + totalUnpaidBills);
    const netWorth = Math.round(assets - totalLiabilities);
    
    const solvencyRatio = assets > 0 ? ((assets - totalLiabilities) / assets) * 100 : 0;
    const liquidityRatio = assets > 0 ? (liquid / assets) * 100 : 0;

    const assetDist = wealthItems.filter(i => i.type === 'Investment').reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.value;
      return acc;
    }, {} as Record<string, number>);
    const liabilityDist = wealthItems.filter(i => i.type === 'Liability').reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.value;
      return acc;
    }, {} as Record<string, number>);
    const billDist = bills.filter(b => !b.isPaid).reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + b.amount;
      return acc;
    }, {} as Record<string, number>);

    return { 
      totalAssets: Math.round(assets),
      totalLiabilities,
      totalUnpaidBills: Math.round(totalUnpaidBills),
      netWorth,
      liquid: Math.round(liquid),
      solvencyRatio,
      liquidityRatio,
      assetChartData: Object.entries(assetDist).map(([name, value]) => ({ name, value: Math.round(value as number) })).sort((a, b) => b.value - a.value),
      liabilityChartData: Object.entries(liabilityDist).map(([name, value]) => ({ name, value: Math.round(value as number) })).sort((a, b) => b.value - a.value),
      billChartData: Object.entries(billDist).map(([name, value]) => ({ name, value: Math.round(value as number) })).sort((a, b) => b.value - a.value)
    };
  }, [wealthItems, bills]);

  const assetGroups = useMemo(() => {
    const groups: Record<string, WealthItem[]> = {};
    wealthItems.filter(i => i.type === 'Investment').forEach(item => {
      const g = item.group || item.category || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [wealthItems]);

  const liabilityGroups = useMemo(() => {
    const groups: Record<string, WealthItem[]> = {};
    wealthItems.filter(i => i.type === 'Liability').forEach(item => {
      const g = item.group || item.category || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [wealthItems]);

  const accountBillsMap = useMemo(() => {
    const map: Record<string, number> = {};
    bills.filter(b => !b.isPaid).forEach(b => {
      if (b.accountId) map[b.accountId] = (map[b.accountId] || 0) + b.amount;
    });
    return map;
  }, [bills]);

  return (
    <div className="h-full flex flex-col pb-32 animate-slide-up overflow-hidden">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1.5 mx-0.5 shadow-md h-[50px] flex items-center shrink-0 border border-white/5">
        <div className="flex justify-between items-center w-full px-1">
          <div>
            <h1 className="text-[14px] font-black text-brand-headerText uppercase leading-none tracking-tight">
              {activeView === 'dashboard' ? 'Portfolio' : 'Accounts'}
            </h1>
            <p className="text-[7px] font-bold text-brand-headerText/50 uppercase tracking-[0.2em] mt-1">
              {activeView === 'dashboard' ? 'Intelligence' : 'Registry'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => { triggerHaptic(); setActiveView(activeView === 'dashboard' ? 'registry' : 'dashboard'); }} 
              className={`p-2 rounded-xl transition-all active:scale-95 ${activeView === 'registry' ? 'bg-white/20 text-brand-headerText' : 'bg-white/10 text-brand-headerText'}`}
            >
              {activeView === 'dashboard' ? <PieChartIcon size={16} /> : <BarChart3 size={16} />}
            </button>
            <button 
              onClick={() => { triggerHaptic(); onAddAccountClick(); }} 
              className="p-2 bg-white/10 rounded-xl text-brand-headerText active:scale-95 transition-all"
            >
              <Plus size={16} />
            </button>
            <button 
              onClick={() => { triggerHaptic(); onAddTransferClick?.(); }} 
              className="p-2 bg-white/10 rounded-xl text-brand-headerText active:scale-95 transition-all"
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-brand-surface px-4 py-3 border-b border-brand-border shrink-0 flex items-center justify-between shadow-sm z-10">
        <div className="flex flex-col">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Total Net Equity</p>
          <h2 className="text-2xl font-black text-brand-text tracking-tighter leading-none">
            {stats.netWorth < 0 ? '-' : ''}{currencySymbol}{Math.abs(Math.round(stats.netWorth)).toLocaleString()}
          </h2>
        </div>
        <div className="flex gap-3">
           <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Equity score</span>
              <span className={`text-[12px] font-black ${stats.solvencyRatio > 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{Math.round(stats.solvencyRatio)}%</span>
           </div>
           <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400 shadow-inner">
              <ShieldCheck size={20} />
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeView === 'dashboard' ? (
          <div className="p-4 space-y-4 animate-slide-up pb-10">
             <div className="grid grid-cols-2 gap-3">
                <section className="bg-brand-surface p-4 rounded-[28px] border border-brand-border shadow-sm">
                   <div className="flex items-center gap-2 mb-2 opacity-60">
                      <Target size={12} className="text-indigo-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Liquidity index</span>
                   </div>
                   <h3 className="text-xl font-black text-indigo-400 tracking-tighter">{Math.round(stats.liquidityRatio)}%</h3>
                   <div className="w-full h-1 bg-brand-accent/40 rounded-full mt-2 overflow-hidden border border-white/5">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${stats.liquidityRatio}%` }} />
                   </div>
                </section>
                <section className="bg-brand-surface p-4 rounded-[28px] border border-brand-border shadow-sm">
                   <div className="flex items-center gap-2 mb-2 opacity-60">
                      <AlertCircle size={12} className="text-rose-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Debt burden</span>
                   </div>
                   <h3 className="text-xl font-black text-rose-500 tracking-tighter">{currencySymbol}{Math.round(stats.totalLiabilities).toLocaleString()}</h3>
                   <div className="w-full h-1 bg-brand-accent/40 rounded-full mt-2 overflow-hidden border border-white/5">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalLiabilities / (stats.totalAssets || 1)) * 100)}%` }} />
                   </div>
                </section>
             </div>

             <section className="bg-brand-surface rounded-[32px] p-5 border border-brand-border shadow-sm flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Asset Composition</h3>
                    <p className="text-xl font-black text-brand-text mt-1.5 tracking-tighter">{currencySymbol}{stats.totalAssets.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-56 w-full -ml-8">
                  <ResponsiveContainer width="115%" height="100%">
                    <BarChart layout="vertical" data={stats.assetChartData} margin={{ top: 10, right: 60, left: 20, bottom: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} width={80} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '12px', fontSize: '10px' }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                        {stats.assetChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={WEALTH_COLORS[entry.name] || '#6366f1'} />
                        ))}
                        <LabelList content={<CustomLabel currencySymbol={currencySymbol} position="right" />} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </section>
          </div>
        ) : (
          <div className="flex flex-col animate-slide-up">
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="px-4 py-2 bg-brand-accent/50 border-b border-brand-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <ArrowUpRight size={10} className="text-emerald-500" />
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Assets</span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-500">{currencySymbol}{Math.round(stats.totalAssets).toLocaleString()}</span>
               </div>
               
               <div className="divide-y divide-brand-border">
                  {Object.keys(assetGroups).sort().map(group => (
                    <div key={group} className="bg-brand-surface">
                      <div className="px-4 py-1.5 bg-brand-accent/20 flex justify-between items-center border-b border-brand-border">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{group}</span>
                        <span className="text-[7px] font-bold text-slate-500">
                          {currencySymbol}{Math.round(assetGroups[group].reduce((s,i)=>s+i.value,0)).toLocaleString()}
                        </span>
                      </div>
                      {assetGroups[group].map(item => (
                        <UltraCompactRow 
                          key={item.id} 
                          item={item} 
                          unpaidBills={accountBillsMap[item.id] || 0}
                          currencySymbol={currencySymbol} 
                          onClick={() => onEditAccount(item)} 
                        />
                      ))}
                    </div>
                  ))}
               </div>

               <div className="px-4 py-2 bg-brand-accent/50 border-y border-brand-border flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                     <ArrowDownRight size={10} className="text-rose-500" />
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Liabilities</span>
                  </div>
                  <span className="text-[9px] font-black text-rose-500">{currencySymbol}{Math.round(stats.totalLiabilities).toLocaleString()}</span>
               </div>

               <div className="divide-y divide-brand-border">
                  {Object.keys(liabilityGroups).sort().map(group => (
                    <div key={group} className="bg-brand-surface">
                      <div className="px-4 py-1.5 bg-brand-accent/20 flex justify-between items-center border-b border-brand-border">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{group}</span>
                        <span className="text-[7px] font-bold text-slate-500">
                          {currencySymbol}{Math.round(liabilityGroups[group].reduce((s,i)=>s+i.value,0)).toLocaleString()}
                        </span>
                      </div>
                      {liabilityGroups[group].map(item => (
                        <UltraCompactRow 
                          key={item.id} 
                          item={item} 
                          unpaidBills={accountBillsMap[item.id] || 0}
                          currencySymbol={currencySymbol} 
                          onClick={() => onEditAccount(item)} 
                        />
                      ))}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-brand-surface text-brand-text px-4 py-3 shrink-0 flex items-center justify-between gap-4 border-t border-brand-border">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[8px] font-black uppercase tracking-widest opacity-60">System Synced</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">
            Total Assets: {currencySymbol}{Math.round(stats.totalAssets).toLocaleString()}
          </span>
      </div>
    </div>
  );
};

export default Accounts;