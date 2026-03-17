import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, AppTheme, Notification, WealthItem, BudgetItem, Bill } from './types';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import AddExpense from './components/AddExpense';
import AddIncome from './components/AddIncome';
import AddBill from './components/AddBill';
import AddAccount from './components/AddAccount';
import AddTransfer from './components/AddTransfer';
import AddRule from './components/AddRule';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import NotificationPane from './components/NotificationPane';
import AuthScreen from './components/AuthScreen';
import Accounts from './components/Accounts';
import BudgetPlanner from './components/BudgetPlanner';
import Footer from './components/Footer';
import RulesEngine from './components/RulesEngine';
import AskMe from './components/AskMe';
import BrandedLogo from './components/BrandedLogo';
import VersionLog from './components/VersionLog';
import BillPayModal from './components/BillPayModal';
import BudgetGoalModal from './components/BudgetGoalModal';
import CategoryManager from './components/CategoryManager';
import ImportReviewModal from './components/ImportReviewModal';
import { SpiderIcon, NarutoIcon, CaptainAmericaIcon, BatmanIcon, MoonIcon } from './components/ThemeSymbols';
import { Loader2, LayoutDashboard, List, Settings as SettingsIcon, Bell, Wallet, Target, X, Sparkles, CheckCircle2, AlertCircle, Zap, UserCircle2, Info, BrainCircuit } from 'lucide-react';
import { DEFAULT_SPLIT, DEFAULT_CATEGORIES, getCurrencySymbol } from './constants';
import { triggerHaptic } from './utils/haptics';
import { parseSmsLocally } from './utils/smsParser';
import { generate12MonthData } from './utils/mockData';
import { getFatherlyAdvice, batchProcessNewTransactions } from './services/geminiService';

const STORAGE_KEY = 'jk_budget_data_whole_num_v12';
const APP_VERSION = 'v2.0';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 350000,
  split: DEFAULT_SPLIT,
  isOnboarded: true, 
  appTheme: 'Batman',
  isCloudSyncEnabled: false,
  currency: 'INR',
  dataFilter: 'all',
  density: 'Compact',
  hasLoadedMockData: false,
  customCategories: DEFAULT_CATEGORIES
};

const BackgroundCharacter = ({ theme }: { theme: AppTheme }) => {
  const Icon = theme === 'Spiderman' ? SpiderIcon : 
               theme === 'CaptainAmerica' ? CaptainAmericaIcon : 
               theme === 'Naruto' ? NarutoIcon : 
               theme === 'Moon' ? MoonIcon : BatmanIcon;
  return (
    <div className="fixed -bottom-10 -right-10 w-80 h-80 opacity-[0.05] pointer-events-none z-0 grayscale rotate-12 transition-all duration-1000">
      <Icon />
    </div>
  );
};

const Toast: React.FC<{ 
  message: string; 
  type?: 'success' | 'error' | 'info' | 'advice'; 
  duration: number;
  onClose: () => void;
  theme: AppTheme;
}> = ({ message, type = 'success', duration, onClose, theme }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - step));
    }, intervalTime);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onClose, duration]);

  const config = {
    success: { icon: <CheckCircle2 size={12} />, gradient: theme === 'Moon' ? 'from-black to-slate-700' : 'from-emerald-600 to-emerald-800', label: 'SYSTEM UPDATE', textColor: 'text-white' },
    error: { icon: <AlertCircle size={12} />, gradient: theme === 'Moon' ? 'from-black to-slate-700' : 'from-rose-600 to-rose-800', label: 'PROTOCOL ALERT', textColor: 'text-white' },
    info: { icon: <Info size={12} />, gradient: (theme === 'Moon' || theme === 'Batman') ? 'from-brand-primary to-brand-secondary' : 'from-indigo-600 to-indigo-800', label: 'REGISTRY SIGNAL', textColor: (theme === 'Moon' || theme === 'Batman') ? 'text-brand-headerText' : 'text-white' },
    advice: { icon: <UserCircle2 size={12} />, gradient: theme === 'Moon' ? 'from-black to-slate-700' : 'from-brand-primary to-brand-secondary', label: "DADDY'S ADVICE", textColor: (theme === 'Moon' || theme === 'Batman') ? 'text-brand-headerText' : 'text-white' }
  };

  const { icon, gradient, label, textColor } = config[type];

  return (
    <div className="fixed bottom-[10px] left-4 z-[400] animate-slide-up pointer-events-none">
      <div className={`w-[260px] pointer-events-auto overflow-hidden bg-[#0c0c0c] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col rounded-2xl`}>
        <div className={`px-3 py-1.5 bg-gradient-to-r ${gradient} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className={`${textColor} opacity-80`}>{icon}</span>
            <span className={`text-[7.5px] font-black ${textColor} uppercase tracking-[0.3em] drop-shadow-sm`}>{label}</span>
          </div>
          <button onClick={onClose} className={`${textColor} opacity-40 hover:opacity-100 transition-colors`}><X size={12} /></button>
        </div>
        <div className="p-3.5 relative">
          <div className="flex-1 min-w-0">
            <span className={`text-[12px] font-bold leading-relaxed block text-white/90 ${type === 'advice' ? 'italic' : ''}`}>{type === 'advice' && '"'}{message}{type === 'advice' && '"'}</span>
          </div>
        </div>
        <div className="h-[1.5px] w-full bg-white/5"><div className="h-full bg-white opacity-30 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [wealthItems, setWealthItems] = useState<WealthItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [editingRule, setEditingRule] = useState<BudgetRule | null>(null);
  const [stagedImportItems, setStagedImportItems] = useState<any[] | null>(null);
  
  const [settlingBill, setSettlingBill] = useState<Bill | null>(null);
  const [isShowingAskMe, setIsShowingAskMe] = useState(false);
  const [isShowingVersionLog, setIsShowingVersionLog] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isShowingCategoryManager, setIsShowingCategoryManager] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewFilter, setViewFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'advice'; duration: number } | null>(null);
  
  const [fatherlyAdvice, setFatherlyAdvice] = useState<string | null>(null);
  const [lastAdviceFetch, setLastAdviceFetch] = useState<number>(0);

  const [notifiedBudgetGoalIds, setNotifiedBudgetGoalIds] = useState<Record<string, string[]>>({});

  const addNotification = useCallback((notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => {
    const id = notif.id || Math.random().toString(36).substring(2, 11);
    setNotifications(prev => [{ ...notif, id, timestamp: new Date().toISOString(), read: false }, ...prev.slice(0, 100)]);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'advice' = 'success', customDuration?: number) => { 
    const duration = customDuration || (type === 'advice' ? 30000 : 10000);
    setToast({ message, type, duration }); 
    if (type === 'info' || type === 'advice') {
      addNotification({ type: type === 'advice' ? 'AI' : 'Activity', title: type === 'advice' ? "Neural Insight" : "Registry Update", message, severity: type === 'advice' ? 'info' : 'success' });
    }
  }, [addNotification]);

  useEffect(() => {
    if (isLoading || isResetting || !budgetItems.length) return;
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    const monthKey = `${y}-${m}`;
    budgetItems.forEach(goal => {
      const spent = expenses.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === m && d.getFullYear() === y && e.category === goal.bucket && e.mainCategory === goal.category;
        }).reduce((sum, e) => sum + e.amount, 0);
      const threshold = 0.8;
      const percentage = goal.amount > 0 ? spent / goal.amount : 0;
      const notifiedThisMonth = notifiedBudgetGoalIds[monthKey] || [];
      if (percentage >= threshold && !notifiedThisMonth.includes(goal.id)) {
        const symbol = getCurrencySymbol(settings.currency);
        addNotification({
          type: 'AI',
          title: 'Neural Protocol Alert',
          message: `Spending for "${goal.name}" has exceeded 80% of your ${symbol}${Math.round(goal.amount)} budget. Current: ${symbol}${Math.round(spent)}.`,
          severity: 'warning'
        });
        setNotifiedBudgetGoalIds(prev => ({ ...prev, [monthKey]: [...(prev[monthKey] || []), goal.id] }));
      }
    });
  }, [expenses, budgetItems, isLoading, isResetting, addNotification, settings.currency, notifiedBudgetGoalIds]);

  const handleRegisterCategory = useCallback((bucket: Category, main: string, sub: string) => {
    setSettings(prev => {
      const updated = JSON.parse(JSON.stringify(prev.customCategories || DEFAULT_CATEGORIES));
      if (!updated[bucket]) updated[bucket] = {};
      if (!updated[bucket][main]) updated[bucket][main] = [];
      if (!updated[bucket][main].includes(sub)) updated[bucket][main].push(sub);
      return { ...prev, customCategories: updated };
    });
  }, []);

  const categorizeWithAvoids = useCallback((expense: Partial<Expense>, forceBucket?: Category): Partial<Expense> => {
    const bucket = forceBucket || expense.category || 'Uncategorized';
    
    if (bucket === 'Uncategorized' || bucket === 'Avoids') return expense;

    const m = new Date(expense.date || '').getMonth();
    const y = new Date(expense.date || '').getFullYear();
    const expDate = new Date(expense.date || '').getTime();
    
    // 1. Calculate total spent in this bucket (Needs/Wants/Savings) for the month, but only for records BEFORE this one
    const spentInBucket = expenses
      .filter(e => e.id !== expense.id && e.category === bucket && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y && new Date(e.date).getTime() <= expDate)
      .reduce((sum, e) => sum + e.amount, 0);

    // 2. Calculate total spent in this specific category (mainCategory) for the month, but only for records BEFORE this one
    const spentInCategory = expenses
      .filter(e => e.id !== expense.id && e.category === bucket && e.mainCategory === expense.mainCategory && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y && new Date(e.date).getTime() <= expDate)
      .reduce((sum, e) => sum + e.amount, 0);

    // 3. Get limits
    const splitPercentage = settings.split[bucket as keyof typeof settings.split] || 0;
    const bucketLimit = (settings.monthlyIncome * splitPercentage) / 100;

    const budgetItem = budgetItems.find(b => b.bucket === bucket && b.name.toLowerCase() === expense.mainCategory?.toLowerCase());
    const categoryGoal = budgetItem?.amount || Infinity;

    // 4. Check violations
    // If current total (including this expense) exceeds the goal or bucket limit
    const isOverBucket = bucketLimit > 0 && (spentInBucket + (expense.amount || 0)) > bucketLimit;
    const isOverGoal = (spentInCategory + (expense.amount || 0)) > categoryGoal;

    if (isOverBucket || isOverGoal) {
      return {
        ...expense,
        category: bucket,
        originalCategory: bucket,
        isAvoid: true,
        note: `${expense.note || ''} [AUTO-AVOID: ${isOverBucket ? 'Over Bucket Limit' : 'Over Category Goal'}]`.trim()
      };
    }

    return { ...expense, category: bucket, originalCategory: bucket, isAvoid: false };
  }, [expenses, settings, budgetItems]);

  const reevaluateAvoids = useCallback(() => {
    setExpenses(prev => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Sort by date ascending to track running totals fairly
      const sortedExpenses = [...prev].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const bucketRunningTotals: Record<string, number> = {};
      const categoryRunningTotals: Record<string, number> = {};

      let changed = false;
      const updatedMap: Record<string, Expense> = {};

      sortedExpenses.forEach(e => {
        const d = new Date(e.date);
        const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        
        if (!isCurrentMonth) {
          updatedMap[e.id] = e;
          return;
        }

        const bucket = e.category;
        if (bucket === 'Uncategorized' || bucket === 'Avoids') {
          updatedMap[e.id] = e;
          return;
        }

        const splitPercentage = settings.split[bucket as keyof typeof settings.split] || 0;
        const bucketLimit = (settings.monthlyIncome * splitPercentage) / 100;

        const budgetItem = budgetItems.find(b => b.bucket === bucket && b.name.toLowerCase() === e.mainCategory.toLowerCase());
        const categoryGoal = budgetItem?.amount || Infinity;

        const catKey = `${bucket}:${e.mainCategory.toLowerCase()}`;
        
        // Update running totals
        bucketRunningTotals[bucket] = (bucketRunningTotals[bucket] || 0) + e.amount;
        categoryRunningTotals[catKey] = (categoryRunningTotals[catKey] || 0) + e.amount;

        const isOverBucket = bucketLimit > 0 && bucketRunningTotals[bucket] > bucketLimit;
        const isOverGoal = categoryRunningTotals[catKey] > categoryGoal;

        const shouldBeAvoid = isOverBucket || isOverGoal;
        
        if (shouldBeAvoid && !e.isAvoid) {
          changed = true;
          updatedMap[e.id] = {
            ...e,
            isAvoid: true,
            note: `${e.note || ''} [AUTO-AVOID: ${isOverBucket ? 'Over Bucket Limit' : 'Over Category Goal'}]`.trim()
          };
        } else if (!shouldBeAvoid && e.isAvoid && e.note?.includes('[AUTO-AVOID:')) {
          changed = true;
          updatedMap[e.id] = {
            ...e,
            isAvoid: false,
            note: e.note.replace(/\[AUTO-AVOID:.*?\]/g, '').trim()
          };
        } else {
          updatedMap[e.id] = e;
        }
      });

      if (!changed) return prev;
      return prev.map(e => updatedMap[e.id] || e);
    });
  }, [settings, budgetItems]);

  useEffect(() => {
    reevaluateAvoids();
  }, [expenses, budgetItems, settings.monthlyIncome, settings.split, reevaluateAvoids]);

  const handleUpdateExpense = useCallback((id: string, updates: Partial<Expense>, frequency?: Frequency) => {
    const isRecurringUpdate = recurringItems.some(r => r.id === id);
    if (isRecurringUpdate) {
      setRecurringItems(prev => prev.map(r => r.id === id ? { ...r, amount: updates.amount ?? r.amount, bucket: updates.category ?? r.bucket, category: updates.mainCategory ?? r.category, subCategory: updates.subCategory ?? r.subCategory, merchant: updates.merchant ?? r.merchant, note: updates.note ?? r.note, frequency: frequency ?? r.frequency, accountId: updates.sourceAccountId ?? r.accountId } : r));
    } else {
      setExpenses(prev => {
        const target = prev.find(e => e.id === id);
        if (!target) return prev;
        
        // If category is being updated, check if it should be an Avoid
        let finalUpdates = { ...updates };
        if (updates.category) {
          finalUpdates = categorizeWithAvoids({ ...target, ...updates }, updates.category);
        }

        if (finalUpdates.isAIUpgraded && finalUpdates.merchant && finalUpdates.category && finalUpdates.category !== 'Uncategorized') {
          setRules(currentRules => {
            const kw = finalUpdates.merchant!.trim();
            const exists = currentRules.some(r => r.keyword.toLowerCase() === kw.toLowerCase());
            if (!exists) {
              return [{ id: Math.random().toString(36).substring(2, 11), keyword: kw, category: finalUpdates.category as Category, mainCategory: finalUpdates.mainCategory || 'General', subCategory: finalUpdates.subCategory || 'General' }, ...currentRules];
            }
            return currentRules;
          });
        }
        return prev.map(e => e.id === id ? { ...e, ...finalUpdates } : e);
      });
    }
    if (frequency && frequency !== 'None' && !isRecurringUpdate) {
      const recId = Math.random().toString(36).substring(2, 11);
      setRecurringItems(prev => [{ id: recId, amount: updates.amount || 0, bucket: (updates.category as Category) || 'Uncategorized', category: updates.mainCategory || 'General', subCategory: updates.subCategory || 'General', note: updates.note || '', merchant: updates.merchant || '', frequency: frequency, nextDueDate: updates.date || new Date().toISOString().split('T')[0], accountId: updates.sourceAccountId, isMock: false }, ...prev]);
    }
    showToast("Record updated.", 'success');
  }, [recurringItems, showToast, categorizeWithAvoids]);

  const handleBulkUpdateExpense = useCallback((ids: string[], updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, ...updates } : e));
    showToast(`Updated ${ids.length} records.`, 'success');
  }, [showToast]);

  const handleBulkDelete = useCallback((ids: string[], type: 'expense' | 'income' | 'recurring') => {
    if (type === 'expense') setExpenses(prev => prev.filter(e => !ids.includes(e.id)));
    else if (type === 'income') setIncomes(prev => prev.filter(i => !ids.includes(i.id)));
    else if (type === 'recurring') setRecurringItems(prev => prev.filter(r => !ids.includes(r.id)));
    showToast(`Purged ${ids.length} records.`, 'success');
  }, [showToast]);

  const handleAddBulkToLedger = useCallback((items: any[]) => {
    const newItems = items.map(i => ({ ...i, id: Math.random().toString(36).substring(2, 11) }));
    setExpenses(prev => [...newItems, ...prev]);
    showToast(`Injected ${items.length} records to registry.`, 'success');
  }, [showToast]);

  const fetchAdvice = useCallback(async () => {
    if (Date.now() - lastAdviceFetch < 300000) return;
    try {
      const advice = await getFatherlyAdvice(expenses, wealthItems, settings);
      setFatherlyAdvice(advice);
      showToast(advice, 'advice');
      setLastAdviceFetch(Date.now());
    } catch (e) { }
  }, [expenses, wealthItems, settings, lastAdviceFetch, showToast]);

  const executeBillSettlement = useCallback((bill: Bill, accountId: string) => {
    triggerHaptic(50);
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, isPaid: true } : b));
    const id = Math.random().toString(36).substring(2, 11);
    const newExpense: Expense = { id, amount: bill.amount, date: new Date().toISOString().split('T')[0], category: bill.category, mainCategory: bill.mainCategory, subCategory: bill.subCategory || 'Bill Payment', merchant: bill.merchant, note: `Bill Payment: ${bill.merchant}`, isConfirmed: true, sourceAccountId: accountId, billId: bill.id };
    setExpenses(prev => [newExpense, ...prev]);
    setWealthItems(prev => prev.map(w => { if (w.id === accountId) return { ...w, value: w.type === 'Liability' ? w.value + bill.amount : w.value - bill.amount }; return w; }));
    setSettlingBill(null);
    showToast("Bill settlement authorized.", 'success');
  }, [showToast]);

  const handleUpdateCustomCategories = useCallback((categories: Record<Category, Record<string, string[]>>) => {
    setSettings(prev => ({ ...prev, customCategories: categories }));
    showToast("Registry taxonomy updated.", 'success');
  }, [showToast]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && currentView === 'Dashboard') {
      fetchAdvice();
      const interval = setInterval(fetchAdvice, 300000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isLoading, currentView, fetchAdvice]);

  const handleLoadMockData = useCallback(() => {
    triggerHaptic(50);
    const mock = generate12MonthData();
    
    const mergeUnique = (prev: any[], next: any[]) => {
      const combined = [...next, ...prev];
      const seen = new Set();
      return combined.filter(item => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };

    setExpenses(prev => mergeUnique(prev, mock.expenses));
    setIncomes(prev => mergeUnique(prev, mock.incomes));
    setWealthItems(prev => mergeUnique(prev, mock.wealthItems));
    setBudgetItems(prev => mergeUnique(prev, mock.budgetItems));
    setRules(prev => mergeUnique(prev, mock.rules));
    setBills(prev => mergeUnique(prev, mock.bills));
    setRecurringItems(prev => mergeUnique(prev, mock.recurringItems));

    setSettings(prev => ({ ...prev, hasLoadedMockData: true, monthlyIncome: 350000 }));
    showToast("Tactical demo data loaded into registry.", 'info');
  }, [showToast]);

  const handlePurgeMockData = useCallback(() => {
    triggerHaptic(50);
    setExpenses(prev => prev.filter(e => !e.isMock));
    setIncomes(prev => prev.filter(i => !i.isMock));
    setWealthItems(prev => prev.filter(w => !w.isMock));
    setBudgetItems(prev => prev.filter(b => !b.isMock));
    setRules(prev => prev.filter(r => !r.isMock));
    setBills(prev => prev.filter(b => !b.isMock));
    setRecurringItems(prev => prev.filter(r => !r.isMock));
    setSettings(prev => ({ ...prev, hasLoadedMockData: false }));
    showToast("Simulation records purged.", 'success');
  }, [showToast]);

  const handleReset = useCallback(() => { triggerHaptic(50); setIsResetting(true); localStorage.clear(); window.location.href = window.location.origin; }, []);

  const handleExport = useCallback(() => {
    triggerHaptic(50);
    const data = {
      settings,
      expenses,
      incomes,
      wealthItems,
      bills,
      user,
      budgetItems,
      rules,
      recurringItems,
      notifications,
      notifiedBudgetGoalIds,
      version: APP_VERSION,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `justkeep_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Backup protocol complete. Data exported.", 'success');
  }, [settings, expenses, incomes, wealthItems, bills, user, budgetItems, rules, recurringItems, notifications, notifiedBudgetGoalIds, showToast]);

  const handleRestore = useCallback((file: File) => {
    triggerHaptic(50);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...data.settings }));
        if (data.expenses) setExpenses(data.expenses);
        if (data.incomes) setIncomes(data.incomes);
        if (data.wealthItems) setWealthItems(data.wealthItems);
        if (data.bills) setBills(data.bills);
        if (data.budgetItems) setBudgetItems(data.budgetItems);
        if (data.rules) setRules(data.rules);
        if (data.recurringItems) setRecurringItems(data.recurringItems);
        if (data.notifications) setNotifications(data.notifications);
        if (data.user) setUser(data.user);
        if (data.notifiedBudgetGoalIds) setNotifiedBudgetGoalIds(data.notifiedBudgetGoalIds);
        
        showToast("Registry restored from backup.", 'success');
      } catch (err) {
        showToast("Backup restoration failed. Invalid file format.", 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  const visibleWealth = useMemo(() => {
    const list = settings.dataFilter === 'user' ? wealthItems.filter(w => !w.isMock) : settings.dataFilter === 'mock' ? wealthItems.filter(w => w.isMock) : wealthItems;
    return [...list]; // Return new reference to ensure re-renders
  }, [wealthItems, settings.dataFilter]);

  const visibleExpenses = useMemo(() => settings.dataFilter === 'user' ? expenses.filter(e => !e.isMock) : settings.dataFilter === 'mock' ? expenses.filter(e => e.isMock) : expenses, [expenses, settings.dataFilter]);
  const visibleIncomes = useMemo(() => settings.dataFilter === 'user' ? incomes.filter(i => !i.isMock) : settings.dataFilter === 'mock' ? incomes.filter(i => i.isMock) : incomes, [incomes, settings.dataFilter]);
  const visibleBudgetItems = useMemo(() => settings.dataFilter === 'user' ? budgetItems.filter(b => !b.isMock) : settings.dataFilter === 'mock' ? budgetItems.filter(b => b.isMock) : budgetItems, [budgetItems, settings.dataFilter]);
  const visibleBills = useMemo(() => bills.filter(b => !b.isPaid && (settings.dataFilter === 'user' ? !b.isMock : settings.dataFilter === 'mock' ? b.isMock : true)), [bills, settings.dataFilter]);
  const visibleRecurringItems = useMemo(() => settings.dataFilter === 'user' ? recurringItems.filter(r => !r.isMock) : settings.dataFilter === 'mock' ? recurringItems.filter(r => r.isMock) : recurringItems, [recurringItems, settings.dataFilter]);

  const globalMetrics = useMemo(() => {
    const m = viewDate.getMonth(); const y = viewDate.getFullYear();
    const assets = visibleWealth.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const accountLiabilities = visibleWealth.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const billLiabilities = visibleBills.reduce((sum, b) => sum + b.amount, 0);
    const netWorth = assets - (accountLiabilities + billLiabilities);
    const currentExps = visibleExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y && e.subCategory !== 'Transfer'; });
    const totals = { Needs: 0, Wants: 0, Savings: 0, Avoids: 0 };
    currentExps.forEach(e => { 
      if (e.isAvoid) totals.Avoids += e.amount;
      if (e.category === 'Needs') totals.Needs += e.amount;
      else if (e.category === 'Wants') totals.Wants += e.amount;
      else if (e.category === 'Savings') totals.Savings += e.amount;
    });
    const monthlyIncome = visibleIncomes.filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; }).reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome || 0;
    const totalSpent = totals.Needs + totals.Wants + totals.Savings;
    const categoryPercentages = { Needs: 0, Wants: 0, Savings: 0, Avoids: 0 }; 
    (['Needs', 'Wants', 'Savings'] as const).forEach(cat => { 
      const catBudget = visibleBudgetItems.filter(b => b.bucket === cat).reduce((sum, b) => sum + b.amount, 0); 
      categoryPercentages[cat] = catBudget > 0 ? (totals[cat] / catBudget) * 100 : 0; 
    });
    // Avoids percentage could be relative to total budget or just 0
    categoryPercentages.Avoids = monthlyIncome > 0 ? (totals.Avoids / monthlyIncome) * 100 : 0;
    return { categoryPercentages, remainingPercentage: monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - totalSpent) / monthlyIncome) * 100) : 0, netWorth, healthStatus: netWorth > 0 ? 'positive' : netWorth < 0 ? 'negative' : 'neutral', totalAssets: assets, totalLiabilities: accountLiabilities + billLiabilities };
  }, [visibleExpenses, visibleIncomes, visibleWealth, visibleBudgetItems, visibleBills, settings, viewDate]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const dedupe = (arr: any[]) => {
          if (!Array.isArray(arr)) return [];
          const seen = new Set();
          return arr.filter(item => {
            if (!item.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        };

        if (parsed.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...parsed.settings }));
        if (parsed.expenses) setExpenses(dedupe(parsed.expenses)); 
        if (parsed.incomes) setIncomes(dedupe(parsed.incomes)); 
        if (parsed.wealthItems) setWealthItems(dedupe(parsed.wealthItems));
        if (parsed.bills) setBills(dedupe(parsed.bills)); 
        if (parsed.budgetItems) setBudgetItems(dedupe(parsed.budgetItems)); 
        if (parsed.rules) setRules(dedupe(parsed.rules));
        if (parsed.recurringItems) setRecurringItems(dedupe(parsed.recurringItems)); 
        if (parsed.notifications) setNotifications(dedupe(parsed.notifications));
        if (parsed.user) { setUser(parsed.user); setIsAuthenticated(true); }
        if (parsed.notifiedBudgetGoalIds) setNotifiedBudgetGoalIds(parsed.notifiedBudgetGoalIds);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { if (!isLoading && !isResetting) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, incomes, wealthItems, bills, user, budgetItems, rules, recurringItems, notifications, notifiedBudgetGoalIds })); } }, [settings, expenses, incomes, wealthItems, bills, user, budgetItems, rules, recurringItems, notifications, notifiedBudgetGoalIds, isLoading, isResetting]);

  useEffect(() => { const root = window.document.documentElement; root.setAttribute('data-theme', settings.appTheme || 'Batman'); root.setAttribute('data-density', settings.density || 'Compact'); if (['Spiderman', 'Naruto'].includes(settings.appTheme || '')) { root.classList.remove('dark'); } else { root.classList.add('dark'); } }, [settings.appTheme, settings.density]);

  const getBudgetContext = useCallback(() => {
    const m = viewDate.getMonth(); const y = viewDate.getFullYear();
    const currentExps = visibleExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; });
    
    return visibleBudgetItems.map(item => {
      const spent = currentExps
        .filter(e => e.category === item.bucket && e.mainCategory === item.category && (!item.subCategory || item.subCategory === 'General' || e.subCategory === item.subCategory))
        .reduce((sum, e) => sum + e.amount, 0);
      return `${item.bucket}/${item.category}${item.subCategory ? `/${item.subCategory}` : ''}: Limit ${item.amount}, Spent ${spent}, Remaining ${Math.max(0, item.amount - spent)}`;
    }).join(' | ');
  }, [visibleBudgetItems, visibleExpenses, viewDate]);

  const applyRuleToExpenses = useCallback((rule: BudgetRule) => {
    setExpenses(prev => prev.map(ex => {
      const merchant = (ex.merchant || '').toLowerCase();
      const keyword = rule.keyword.toLowerCase();
      if (merchant.includes(keyword) || keyword.includes(merchant)) {
        return {
          ...ex,
          category: rule.category,
          mainCategory: rule.mainCategory,
          subCategory: rule.subCategory,
          ruleId: rule.id
        };
      }
      return ex;
    }));
  }, []);

  const handleCSVImport = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const results = parseSmsLocally(text);
          if (!results || results.length === 0) { 
            showToast("No financial records identified in the source.", 'error'); 
            resolve();
            return; 
          }
          triggerHaptic(50);
          const freshExpenses = results.filter(r => (r.entryType === 'Expense' || r.entryType === 'Transfer') && r.amount);
          
          let aiMetadata: any[] = [];
          try { 
            if (freshExpenses.length > 0) { 
              const budgetCtx = getBudgetContext();
              // Process up to 100 transactions in chunks of 50
              const limit = 100;
              const toProcess = freshExpenses.slice(0, limit);
              for (let i = 0; i < toProcess.length; i += 50) {
                const chunk = toProcess.slice(i, i + 50).map(f => ({ 
                  merchant: f.merchant || 'General', 
                  amount: f.amount || 0, 
                  date: f.date, 
                  note: f.note || f.rawContent 
                })); 
                const chunkMetadata = await batchProcessNewTransactions(chunk, budgetCtx);
                aiMetadata = [...aiMetadata, ...chunkMetadata];
              }
            } 
          } catch (aiErr) {}

          const newExpensesToCommit: Expense[] = [];
          const newIncomesToCommit: Income[] = [];
          const newRulesToCommit: BudgetRule[] = [];
          const newlyAddedRuleKeywords = new Set<string>();

          results.forEach((res) => {
            const resMerchant = (res.merchant || '').toLowerCase().trim();
            const isDuplicate = expenses.some(ex => {
              const exMerchant = (ex.merchant || '').toLowerCase().trim();
              return ex.date === res.date && 
                     Math.abs(ex.amount - (res.amount || 0)) < 0.01 && 
                     (exMerchant === resMerchant || exMerchant.includes(resMerchant) || resMerchant.includes(exMerchant));
            });
            if (isDuplicate) return; 
            const id = Math.random().toString(36).substring(2, 11);
            let accountId = '';
            const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card'].includes(i.category));
            const hint = (res.accountName || res.merchant || '').toLowerCase();
            const accountMatch = wealthItems.find(w => w.name.toLowerCase().includes(hint) || hint.includes(w.name.toLowerCase()) || (w.alias && (w.alias.toLowerCase().includes(hint) || hint.includes(w.alias.toLowerCase()))));
            if (accountMatch) accountId = accountMatch.id; else if (liquidAccounts.length === 1) accountId = liquidAccounts[0].id;
            
            if (res.entryType === 'Expense' || res.entryType === 'Transfer') {
               const resMerchantLower = resMerchant.toLowerCase();
               const matchingRule = rules.find(r => resMerchantLower.includes(r.keyword.toLowerCase()) || r.keyword.toLowerCase().includes(resMerchantLower));
               
               const aiMatch = aiMetadata.find(meta => meta.merchant.toLowerCase().includes(resMerchantLower));
               const isEnriched = !!aiMatch;

               let finalCategory: Category = 'Uncategorized';
               let finalMain = 'General';
               let finalSub = 'Other';
               let finalMerchant = res.merchant || 'General';
               let finalNote = res.note || 'Imported Entry';
               let ruleId = '';

               if (matchingRule) {
                 finalCategory = matchingRule.category;
                 finalMain = matchingRule.mainCategory;
                 finalSub = matchingRule.subCategory || 'Other';
                 ruleId = matchingRule.id;
               } else if (isEnriched) {
                 finalCategory = aiMatch.category;
                 finalMain = aiMatch.mainCategory;
                 finalSub = aiMatch.subCategory;
                 finalMerchant = aiMatch.merchant;
                 finalNote = aiMatch.intelligentNote;
               } else {
                 finalCategory = res.category || 'Uncategorized';
                 finalMain = res.mainCategory || 'General';
                 finalSub = res.subCategory || 'Other';
               }

               const enrichedExpense = categorizeWithAvoids({
                 id,
                 amount: res.amount || 0,
                 date: res.date,
                 category: finalCategory,
                 mainCategory: finalMain,
                 subCategory: finalSub,
                 merchant: finalMerchant,
                 note: finalNote,
                 isConfirmed: true,
                 isImported: true,
                 sourceAccountId: accountId,
                 isAIUpgraded: isEnriched,
                 ruleId
               });

               newExpensesToCommit.push(enrichedExpense as Expense);

               if (!matchingRule && isEnriched && aiMatch.merchant && aiMatch.category !== 'Uncategorized') {
                  const keywordLower = aiMatch.merchant.toLowerCase();
                  const ruleExists = rules.some(r => r.keyword.toLowerCase() === keywordLower);
                  if (!ruleExists && !newlyAddedRuleKeywords.has(keywordLower)) { 
                    newRulesToCommit.push({ id: Math.random().toString(36).substring(2, 11), keyword: aiMatch.merchant, category: aiMatch.category, mainCategory: aiMatch.mainCategory, subCategory: aiMatch.subCategory, isImported: true }); 
                    newlyAddedRuleKeywords.add(keywordLower); 
                  }
               }
            }
 else if (res.entryType === 'Income') { 
              newIncomesToCommit.push({ id, amount: res.amount || 0, date: res.date, type: res.incomeType as any || 'Other', note: res.note || 'Imported Income', isImported: true, targetAccountId: accountId }); 
            }
          });

          if (newExpensesToCommit.length > 0) setExpenses(prev => [...newExpensesToCommit, ...prev]);
          if (newIncomesToCommit.length > 0) setIncomes(prev => [...newIncomesToCommit, ...prev]);
          if (newRulesToCommit.length > 0) setRules(prev => [...prev, ...newRulesToCommit]);
          
          const totalCount = newExpensesToCommit.length + newIncomesToCommit.length;
          if (totalCount > 0) showToast(`Successfully synchronized ${totalCount} records.`, 'success'); 
          else showToast("No new records found to synchronize.", 'info');
          resolve();
        } catch (err) { 
          showToast("Signal ingestion failure. Ensure CSV format is valid.", 'error'); 
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }, [expenses, rules, wealthItems, showToast, getBudgetContext, categorizeWithAvoids]);

  const handleDeduplicate = useCallback(() => {
    triggerHaptic(50);
    const seen = new Set<string>();
    const uniqueExpenses: Expense[] = [];
    let removedCount = 0;

    // Sort by date descending to keep the most recent entries if needed, 
    // but here we just want to find duplicates based on content
    expenses.forEach(ex => {
      const key = `${ex.date}-${Math.round(ex.amount * 100)}-${(ex.merchant || '').toLowerCase().trim()}`;
      if (seen.has(key)) {
        removedCount++;
      } else {
        seen.add(key);
        uniqueExpenses.push(ex);
      }
    });

    if (removedCount > 0) {
      setExpenses(uniqueExpenses);
      showToast(`Purged ${removedCount} duplicate records from the registry.`, 'success');
    } else {
      showToast("No duplicate records detected in the registry.", 'info');
    }
  }, [expenses, showToast]);

  const finalizeImport = (finalItems: any[]) => {
    const newExpenses: Expense[] = [];
    const newIncomes: Income[] = [];
    const newRules: BudgetRule[] = [];
    const internalRuleTrack = new Set<string>();
    finalItems.forEach(item => {
      const id = Math.random().toString(36).substring(2, 11);
      if (item.entryType === 'Expense' || item.entryType === 'Transfer') {
        newExpenses.push({ id, amount: item.amount, date: item.date, category: item.category || 'Uncategorized', mainCategory: item.mainCategory || 'General', subCategory: item.subCategory || 'Other', merchant: item.merchant, note: item.note || item.intelligentNote, isConfirmed: true, isImported: true, sourceAccountId: item.targetAccountId, isAIUpgraded: item.isAIEnriched });
        if (item.isAIEnriched && item.merchant && item.category !== 'Uncategorized') { const kw = item.merchant.toLowerCase(); const exists = rules.some(r => r.keyword.toLowerCase() === kw); if (!exists && !internalRuleTrack.has(kw)) { newRules.push({ id: Math.random().toString(36).substring(2, 11), keyword: item.merchant, category: item.category, mainCategory: item.mainCategory, subCategory: item.subCategory, isImported: true }); internalRuleTrack.add(kw); } }
      } else if (item.entryType === 'Income') { newIncomes.push({ id, amount: item.amount, date: item.date, type: item.incomeType || 'Other', note: item.note, isImported: true, targetAccountId: item.targetAccountId }); }
    });
    if (newExpenses.length > 0) setExpenses(prev => [...newExpenses, ...prev]);
    if (newIncomes.length > 0) setIncomes(prev => [...newIncomes, ...prev]);
    if (newRules.length > 0) setRules(prev => [...prev, ...newRules]);
    setStagedImportItems(null); showToast(`Successfully synchronized ${finalItems.length} records.`, 'success');
  };

  if (isResetting || isLoading) return <div className="w-full h-screen bg-brand-bg flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={(p) => { setUser(p); setIsAuthenticated(true); }} />;

  const handleNavbarViewChange = (v: View) => {
    if (v === 'Affordability') setIsShowingAskMe(true);
    else if (v === 'AddExpense') setIsAddingExpense(true);
    else if (v === 'AddIncome') setIsAddingIncome(true);
    else if (v === 'Add') { if (currentView === 'Accounts') setIsAddingAccount(true); else if (currentView === 'Budget') setIsAddingBudget(true); else if (currentView === 'Rules') setIsAddingRule(true); else setIsAddingExpense(true); }
    else {
      if (v !== 'Ledger' && v !== 'Budget') setViewFilter(null);
      setCurrentView(v);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-brand-bg flex flex-col relative text-brand-text transition-colors duration-500">
      <div className="mesh-bg"><div className="mesh-blob"></div></div>
      <BackgroundCharacter theme={settings.appTheme || 'Batman'} />
      <header className="flex-none bg-brand-surface/95 px-3 py-3 z-50 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-1">
               <BrandedLogo size="sm" healthStatus={globalMetrics.healthStatus} />
               <div className="flex flex-col items-start leading-none">
                 <span className="text-base font-black italic tracking-tighter text-brand-text">
                   Just<span className={globalMetrics.healthStatus === 'negative' ? 'text-rose-500' : 'text-emerald-500'}>Keep</span>
                 </span>
                 <button 
                   onClick={() => { triggerHaptic(); setIsShowingVersionLog(true); }} 
                   className="text-[7px] font-black text-brand-accentUi tracking-widest hover:underline active:scale-95 transition-all mt-0.5"
                 >
                   {APP_VERSION}
                 </button>
               </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="flex items-center gap-1">
              <button onClick={() => { triggerHaptic(); setViewFilter(null); setCurrentView(currentView === 'Dashboard' ? 'Budget' : 'Dashboard'); }} className={`p-2 rounded-xl border-2 transition-all ${(currentView === 'Dashboard' || currentView === 'Budget') ? 'bg-brand-accentUi/10 border-brand-accentUi text-brand-accentUi' : 'bg-white/5 border-transparent text-slate-400'}`}>{currentView === 'Dashboard' ? <Target size={18} /> : <LayoutDashboard size={18} />}</button>
              <button onClick={() => { triggerHaptic(); setViewFilter(null); setCurrentView(currentView === 'Accounts' ? 'Ledger' : 'Accounts'); }} className={`p-2 rounded-xl border-2 transition-all ${(currentView === 'Accounts' || currentView === 'Ledger') ? 'bg-brand-accentUi/10 border-brand-accentUi text-brand-accentUi' : 'bg-white/5 border-transparent text-slate-400'}`}>{currentView === 'Accounts' ? <List size={18} /> : <Wallet size={18} />}</button>
            </div>
            <div className="flex items-center gap-1 ml-0.5">
              <button onClick={() => setCurrentView('Rules')} className={`p-2 rounded-xl border-2 transition-all ${currentView === 'Rules' ? 'bg-indigo-50/10 border-indigo-500 text-indigo-400' : 'bg-white/5 border-transparent text-slate-400'}`}><Zap size={18} /></button>
              <button onClick={() => setCurrentView('Notifications')} className={`p-2 rounded-xl border-2 transition-all ${currentView === 'Notifications' ? 'bg-brand-accentUi/10 border-brand-accentUi text-brand-accentUi' : 'bg-white/5 border-transparent text-slate-400'}`}><Bell size={18} /></button>
              <button onClick={() => setCurrentView('Profile')} className={`p-0.5 rounded-full transition-all ${currentView === 'Profile' ? 'ring-2 ring-brand-primary' : ''}`}>{user?.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full border border-brand-border object-cover" /> : <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400"><SettingsIcon size={16} /></div>}</button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
        <div className="max-w-2xl mx-auto w-full px-2 min-h-full flex flex-col">
          <div className="flex-1">
            {currentView === 'Dashboard' && <Dashboard expenses={visibleExpenses} incomes={visibleIncomes} wealthItems={visibleWealth} budgetItems={visibleBudgetItems} bills={visibleBills} settings={settings} user={user} onCategorizeClick={() => setIsCategorizing(true)} onConfirmExpense={() => {}} onSmartAdd={() => {}} onNavigate={(v, f) => { setViewFilter(f || null); setCurrentView(v); }} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={() => {}} onAffordabilityCheck={() => setIsShowingAskMe(true)} />}
            {currentView === 'Ledger' && <Ledger expenses={visibleExpenses} incomes={visibleIncomes} wealthItems={visibleWealth} bills={visibleBills} rules={rules} budgetItems={visibleBudgetItems} settings={settings} onDeleteExpense={(id) => handleBulkDelete([id], 'expense')} onDeleteIncome={(id) => handleBulkDelete([id], 'income')} onUpdateExpense={handleUpdateExpense} onBulkUpdateExpense={handleBulkUpdateExpense} onBulkDelete={handleBulkDelete} onEditRecord={(r) => setEditingRecord(r)} onAddRecord={() => setIsAddingExpense(true)} onAddIncome={() => setIsAddingIncome(true)} onAddBulk={handleAddBulkToLedger} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} addNotification={addNotification} showToast={showToast} onDeleteWealth={() => {}} onConfirm={() => {}} onGoToDate={() => {}} onImport={handleCSVImport} onDeduplicate={handleDeduplicate} initialFilter={viewFilter} />}
            {currentView === 'Budget' && <BudgetPlanner budgetItems={visibleBudgetItems} recurringItems={visibleRecurringItems} expenses={visibleExpenses} bills={visibleBills} wealthItems={visibleWealth} settings={settings} onAddBudget={() => setIsAddingBudget(true)} onEditBudget={(b) => setEditingBudget(b)} onUpdateBudget={(id, updates) => setBudgetItems(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))} onDeleteBudget={(id) => setBudgetItems(prev => prev.filter(b => b.id !== id))} onPayBill={(b) => setSettlingBill(b)} onDeleteBill={(id) => setBills(p => p.filter(b => b.id !== id))} onEditBill={(b) => setEditingRecord(b)} onEditExpense={(e) => setEditingRecord(e)} onAddBillClick={() => setIsAddingBill(true)} onAddRecurringClick={() => setIsAddingExpense(true)} onEditRecurring={(r) => setEditingRecord(r)} onNavigate={(v, f) => { setViewFilter(f || null); setCurrentView(v); }} viewDate={viewDate} initialTab={viewFilter as any} />}
            {currentView === 'Accounts' && <Accounts wealthItems={visibleWealth} expenses={visibleExpenses} incomes={visibleIncomes} bills={visibleBills} settings={settings} onUpdateWealth={(id, updates) => setWealthItems(p => p.map(w => {
              if (w.id === id) {
                const newItem = { ...w, ...updates };
                if (updates.value !== undefined && updates.value !== w.value) {
                  const history = w.history || [];
                  newItem.history = [...history, { date: new Date().toISOString(), value: updates.value }];
                }
                return newItem;
              }
              return w;
            }))} onDeleteWealth={(id) => setWealthItems(p => p.filter(w => w.id !== id))} onAddWealth={() => {}} onEditAccount={(a) => setEditingRecord({...a, mode: 'Account'})} onAddAccountClick={() => setIsAddingAccount(true)} onOpenCategoryManager={() => setIsShowingCategoryManager(true)} onAddTransferClick={() => setIsAddingTransfer(true)} onDeleteExpense={(id) => setExpenses(p => p.filter(e => e.id !== id))} onDeleteIncome={(id) => setIncomes(p => p.filter(i => i.id !== id))} onAddStatementTransactions={(accId, txs) => {
              const enriched = txs.map(t => ({
                ...t,
                id: Math.random().toString(36).substring(2, 11),
                sourceAccountId: accId,
                isConfirmed: true,
                isImported: true,
                isStatementTransaction: true
              }));
              setExpenses(prev => [...prev, ...enriched]);
              showToast(`${txs.length} transactions imported from statement.`, 'success');
            }} />}
            {currentView === 'Rules' && <RulesEngine rules={rules.filter(r => settings.dataFilter === 'user' ? !r.isMock : settings.dataFilter === 'mock' ? r.isMock : true)} settings={settings} onAddRule={() => setIsAddingRule(true)} onEditRule={(r) => setEditingRule(r)} onDeleteRule={(id) => setRules(p => p.filter(r => r.id !== id))} />}
            {currentView === 'Notifications' && <NotificationPane notifications={notifications} onClose={() => setCurrentView('Dashboard')} onClear={() => setNotifications([])} isPage={true} />}
            {currentView === 'Profile' && <Settings settings={settings} user={user} onLogout={() => setIsAuthenticated(false)} onReset={handleReset} onUpdateAppTheme={(t) => setSettings(s => ({ ...s, appTheme: t }))} onUpdateCurrency={(c) => setSettings(s => ({ ...s, currency: c }))} onUpdateBaseIncome={(income) => setSettings(s => ({ ...s, monthlyIncome: income }))} onUpdateSplit={(split) => setSettings(s => ({ ...s, split }))} onExport={handleExport} onRestore={handleRestore} onAddBulk={() => {}} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onPurgeMockData={handlePurgeMockData} onUpdateDensity={(d) => setSettings(s => ({ ...s, density: d }))} onOpenCategoryManager={() => setIsShowingCategoryManager(true)} onToggleTheme={() => {}} onSync={() => {}} />}
          </div>
          <Footer />
        </div>
      </main>

      {toast && <Toast {...toast} theme={settings.appTheme || 'Batman'} onClose={() => setToast(null)} />}
      <Navbar currentView={currentView} remainingPercentage={globalMetrics.remainingPercentage} netWorth={globalMetrics.netWorth} totalAssets={globalMetrics.totalAssets} totalLiabilities={globalMetrics.totalLiabilities} categoryPercentages={globalMetrics.categoryPercentages} onViewChange={handleNavbarViewChange} />
      {(isAddingExpense || (editingRecord && !editingRecord.mode && !editingRecord.recordType?.includes('income') && !editingRecord.dueDate)) && <AddExpense settings={settings} wealthItems={wealthItems} initialData={editingRecord} onRegisterCategory={handleRegisterCategory} onAdd={(e, freq) => { 
        const id = Math.random().toString(36).substring(2, 11); 
        const enriched = categorizeWithAvoids(e);
        setExpenses(p => [{ ...enriched, id } as Expense, ...p]); 
        if (freq && freq !== 'None') { 
          const recId = Math.random().toString(36).substring(2, 11); 
          setRecurringItems(p => [{ id: recId, amount: e.amount, bucket: e.category, category: e.mainCategory, subCategory: e.subCategory, note: e.note || '', merchant: e.merchant, frequency: freq, nextDueDate: e.date, accountId: e.sourceAccountId, isMock: false }, ...p]); 
        } 
        setIsAddingExpense(false); 
        showToast(freq !== 'None' ? "Subscription tracked." : "Expense logged.", 'success'); 
      }} onUpdate={(id, updates, freq) => { handleUpdateExpense(id, updates, freq); setEditingRecord(null); }} onDelete={(id) => { const isRec = recurringItems.some(r => r.id === id); if (isRec) handleBulkDelete([id], 'recurring'); else handleBulkDelete([id], 'expense'); setEditingRecord(null); }} onCancel={() => { setIsAddingExpense(false); setEditingRecord(null); }} />}
      {(isAddingIncome || (editingRecord && editingRecord.recordType === 'income')) && <AddIncome settings={settings} wealthItems={wealthItems} initialData={editingRecord} onRegisterIncomeType={(type) => handleRegisterCategory('Uncategorized', 'Inflow', type)} onAdd={(i) => { setIncomes(p => [{ ...i, id: Math.random().toString(36).substring(2, 11) }, ...p]); setIsAddingIncome(false); showToast("Inflow recorded.", 'success'); }} onUpdate={(id, updates) => { setIncomes(p => p.map(i => i.id === id ? { ...i, ...updates } : i)); setEditingRecord(null); showToast("Income updated.", 'success'); }} onDelete={(id) => { setIncomes(p => p.filter(i => i.id !== id)); setEditingRecord(null); }} onCancel={() => { setIsAddingIncome(false); setEditingRecord(null); }} />}
      {(isAddingBill || (editingRecord && editingRecord.dueDate)) && <AddBill settings={settings} wealthItems={wealthItems} initialData={editingRecord} onAddBills={(newBills) => { setBills(p => [...p, ...newBills]); setIsAddingBill(false); showToast("Obligation added.", 'success'); }} onUpdate={(id, updates) => { setBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b)); setEditingRecord(null); }} onDelete={(id) => { setBills(p => p.filter(b => b.id !== id)); setEditingRecord(null); }} onCancel={() => { setIsAddingBill(false); setEditingRecord(null); }} />}
      {(isAddingAccount || (editingRecord && editingRecord.mode === 'Account')) && <AddAccount settings={settings} initialData={editingRecord} onSave={(a) => { 
        const newAccount = { 
          ...a, 
          id: Math.random().toString(36).substring(2, 11),
          history: [{ date: new Date().toISOString(), value: a.value }]
        };
        setWealthItems(p => [...p, newAccount]); 
        setIsAddingAccount(false); 
        showToast("Account registered.", 'success'); 
      }} onUpdate={(id, updates) => { 
        setWealthItems(p => p.map(w => {
          if (w.id === id) {
            const newItem = { ...w, ...updates };
            if (updates.value !== undefined && updates.value !== w.value) {
              const history = w.history || [];
              newItem.history = [...history, { date: new Date().toISOString(), value: updates.value }];
            }
            return newItem;
          }
          return w;
        }));
        setEditingRecord(null); 
        setIsAddingAccount(false); 
        showToast("Account updated.", 'success'); 
      }} onDelete={(id) => { setWealthItems(p => p.filter(w => w.id !== id)); setEditingRecord(null); setIsAddingAccount(false); }} onCancel={() => { setIsAddingAccount(false); setEditingRecord(null); }} onAddStatementTransactions={(accId, txs) => {
        const enriched = txs.map(t => ({
          ...t,
          id: Math.random().toString(36).substring(2, 11),
          sourceAccountId: accId,
          isConfirmed: true,
          isImported: true,
          isStatementTransaction: true
        }));
        setExpenses(prev => [...prev, ...enriched as Expense[]]);
        showToast(`${txs.length} transactions imported from statement.`, 'success');
      }} />}
      {(isAddingRule || editingRule) && <AddRule settings={settings} initialData={editingRule} onAdd={(r) => { 
        const newRule = { ...r, id: Math.random().toString(36).substring(2, 11) };
        setRules(p => [...p, newRule]); 
        if ((r as any).applyToAll) {
          applyRuleToExpenses(newRule);
        }
        setIsAddingRule(false); 
        showToast("Neural logic registered.", 'success'); 
      }} onUpdate={(id, updates) => { 
        const updatedRule = { ...rules.find(r => r.id === id), ...updates } as BudgetRule;
        setRules(p => p.map(r => r.id === id ? { ...r, ...updates } : r)); 
        if ((updates as any).applyToAll) {
          applyRuleToExpenses(updatedRule);
        }
        setEditingRule(null); 
        showToast("Neural logic recalibrated.", 'success'); 
      }} onDelete={(id) => { setRules(p => p.filter(r => r.id !== id)); setEditingRule(null); }} onCancel={() => { setIsAddingRule(false); setEditingRule(null); }} />}
      {isAddingTransfer && <AddTransfer settings={settings} wealthItems={wealthItems} onTransfer={(fromId, toId, amount, date, note) => { 
        const id1 = Math.random().toString(36).substring(2, 11);
        const id2 = Math.random().toString(36).substring(2, 11);
        const tDate = date || new Date().toISOString().split('T')[0];
        setExpenses(p => [
          { id: id1, amount, date: tDate, category: 'Uncategorized', mainCategory: 'Internal', subCategory: 'Transfer', merchant: 'Internal Transfer', note: `To: ${wealthItems.find(w => w.id === toId)?.alias || 'Unknown'} - ${note}`, isConfirmed: true, sourceAccountId: fromId },
          ...p
        ]);
        setIncomes(p => [
          { id: id2, amount, date: tDate, type: 'Other', note: `From: ${wealthItems.find(w => w.id === fromId)?.alias || 'Unknown'} - ${note}`, targetAccountId: toId },
          ...p
        ]);
        setWealthItems(p => p.map(w => {
          if (w.id === fromId) return { ...w, value: w.value - amount };
          if (w.id === toId) return { ...w, value: w.value + amount };
          return w;
        }));
        showToast("Capital rebalanced.", 'success');
      }} onCancel={() => setIsAddingTransfer(false)} />}
      {(isAddingBudget || editingBudget) && <BudgetGoalModal settings={settings} expenses={expenses} initialData={editingBudget} viewDate={viewDate} onSave={(b) => { setBudgetItems(p => [...p, { ...b, id: Math.random().toString(36).substring(2, 11) }]); setIsAddingBudget(false); }} onUpdate={(id, updates) => { setBudgetItems(p => p.map(b => b.id === id ? { ...b, ...updates } : b)); setEditingBudget(null); }} onDelete={(id) => { setBudgetItems(p => p.filter(b => b.id !== id)); setEditingBudget(null); }} onCancel={() => { setIsAddingBudget(false); setEditingBudget(null); }} />}
      {isShowingAskMe && <AskMe settings={settings} wealthItems={wealthItems} expenses={expenses} onCancel={() => setIsShowingAskMe(false)} />}
      {isShowingVersionLog && <VersionLog onClose={() => setIsShowingVersionLog(false)} />}
      {isCategorizing && <CategorizationModal settings={settings} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={handleUpdateExpense} onClose={() => setIsCategorizing(false)} />}
      {isShowingCategoryManager && <CategoryManager settings={settings} onUpdateCustomCategories={handleUpdateCustomCategories} onClose={() => setIsShowingCategoryManager(false)} />}
      {stagedImportItems && <ImportReviewModal stagedItems={stagedImportItems} wealthItems={wealthItems} settings={settings} onConfirm={finalizeImport} onCancel={() => setStagedImportItems(null)} showToast={showToast} />}
      {settlingBill && <BillPayModal bill={settlingBill} wealthItems={wealthItems} settings={settings} onConfirm={(accId) => executeBillSettlement(settlingBill, accId)} onCancel={() => setSettlingBill(null)} />}
    </div>
  );
};

export default App;