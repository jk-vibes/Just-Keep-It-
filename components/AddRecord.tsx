import React, { useState } from 'react';
import { 
  Category, Expense, UserSettings, Frequency, 
  Income, IncomeType, WealthItem, PaymentMethod, Bill, BudgetRule, RecurringItem 
} from '../types';
import { getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { 
  Check, X, Trash2, ChevronDown, RefreshCw
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddRecordProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  expenses?: Expense[];
  rules?: BudgetRule[];
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onAddBill?: (bill: Omit<Bill, 'id'>) => void;
  onUpdateBill?: (id: string, updates: Partial<Bill>) => void;
  onAddRecurring?: (item: Omit<RecurringItem, 'id'>) => void;
  onUpdateRecurring?: (id: string, updates: Partial<RecurringItem>) => void;
  onAddRule?: (rule: Omit<BudgetRule, 'id'>) => void;
  onTransfer?: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onOpenBulkImport?: () => void;
  initialData?: Expense | Income | RecurringItem | any | null;
}

const AddRecord: React.FC<AddRecordProps> = ({ 
  settings, wealthItems, onAdd, onAddIncome, onAddBill, onUpdateBill, 
  onAddRecurring, onUpdateRecurring, onTransfer, onUpdateExpense, onUpdateIncome, onDelete, onCancel, initialData
}) => {
  const isEditing = !!(initialData && initialData.id);
  
  const getInitialMode = () => {
    if (initialData?.mode === 'Affordability') return 'Expense';
    if (initialData?.mode) return initialData.mode;
    if (initialData?.recordType === 'income') return 'Income';
    if (initialData?.recordType === 'expense') return 'Expense';
    if (initialData?.frequency && !initialData.dueDate && !('isPaid' in initialData)) return 'Recurring';
    if (initialData?.subCategory === 'Transfer' || initialData?.recordType === 'transfer') return 'Transfer';
    if (initialData?.type && ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'].includes(initialData.type)) return 'Income';
    if (initialData?.dueDate || ('isPaid' in (initialData || {}))) return 'Bill';
    return 'Expense';
  };

  const [mode, setMode] = useState<'Expense' | 'Income' | 'Transfer' | 'Bill' | 'Recurring'>(getInitialMode());
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || initialData?.dueDate || initialData?.nextDueDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'UPI');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Needs');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || 'General');
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'None');
  const [targetWealthId, setTargetWealthId] = useState<string>(initialData?.targetAccountId || '');
  const [sourceWealthId, setSourceWealthId] = useState<string>(initialData?.sourceAccountId || initialData?.accountId || '');
  const [incomeType, setIncomeType] = useState<IncomeType>(initialData?.type || 'Salary');

  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card', 'Personal Loan', 'Home Loan'].includes(i.category));
  const isModeLocked = !!(initialData?.mode || isEditing);

  const handleInternalSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const roundedAmount = Math.round(parseFloat(amount) || 0);
    if (mode === 'Expense') {
      const payload = { amount: roundedAmount, date, category, subCategory, note, merchant: merchant || note, paymentMethod, sourceAccountId: sourceWealthId, isConfirmed: true };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload);
      else onAdd(payload, frequency);
    } else if (mode === 'Income') {
      const payload = { amount: roundedAmount, date, type: incomeType, note, paymentMethod, targetAccountId: targetWealthId };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    } else if (mode === 'Bill') {
      const payload = { amount: roundedAmount, dueDate: date, merchant: merchant || note, category: 'Uncategorized' as Category, isPaid: initialData?.isPaid || false, note, frequency: 'None' as Frequency, accountId: sourceWealthId };
      if (isEditing && onUpdateBill) onUpdateBill(initialData.id, payload);
      else if (onAddBill) onAddBill(payload);
    } else if (mode === 'Recurring') {
        const payload = { amount: roundedAmount, nextDueDate: date, merchant: merchant || note, category, subCategory, note, frequency: frequency === 'None' ? 'Monthly' : frequency };
        if (isEditing && onUpdateRecurring) onUpdateRecurring(initialData.id, payload);
        else if (onAddRecurring) onAddRecurring(payload);
    } else if (mode === 'Transfer' && onTransfer) {
      if (sourceWealthId && targetWealthId) onTransfer(sourceWealthId, targetWealthId, roundedAmount, date, note);
    }
    onCancel();
  };

  const selectClasses = "w-full bg-black/5 dark:bg-slate-900 p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 pt-10 no-scrollbar">
      <div className="bg-brand-surface w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary text-brand-headerText rounded-lg">
               {mode === 'Recurring' ? <RefreshCw size={12} /> : <Check size={12} />}
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-brand-text">
              {isEditing ? `Edit ${mode}` : `Add ${mode}`}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          {!isModeLocked && (
            <div className="relative">
              <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full bg-black/5 dark:bg-slate-900 p-2 rounded-xl text-[8px] font-black uppercase tracking-widest appearance-none text-slate-500 border border-brand-border">
                {(['Expense', 'Income', 'Bill', 'Transfer', 'Recurring'] as const).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          <div className="text-center">
             <div className="relative border-b border-brand-border pb-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-600">{currencySymbol}</span>
                <input
                  autoFocus
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 text-3xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-1">
                <span className={labelClass}>{mode === 'Recurring' ? 'Next Due' : 'Date'}</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClasses} />
             </div>
             <div className="space-y-1">
                <span className={labelClass}>{mode === 'Recurring' ? 'Cycle' : 'Description'}</span>
                {mode === 'Recurring' ? (
                   <div className="relative">
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={selectClasses}>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="..." className={selectClasses} />
                )}
             </div>
          </div>

          {(mode === 'Expense' || mode === 'Recurring') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className={labelClass}>Bucket</span>
                <select value={category} onChange={(e) => { setCategory(e.target.value as Category); setSubCategory(SUB_CATEGORIES[e.target.value as Category][0]); }} className={selectClasses}>
                  {['Needs', 'Wants', 'Savings', 'Avoids'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <span className={labelClass}>Label</span>
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={selectClasses}>
                  {SUB_CATEGORIES[category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>
          )}

          {mode === 'Recurring' && (
             <div className="space-y-1">
              <span className={labelClass}>Label / Merchant</span>
              <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Netflix" className={selectClasses} />
            </div>
          )}

          {mode === 'Transfer' ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className={labelClass}>From</span>
                <select value={sourceWealthId} onChange={(e) => setSourceWealthId(e.target.value)} className={selectClasses}>
                  <option value="">Source...</option>
                  {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <span className={labelClass}>To</span>
                <select value={targetWealthId} onChange={(e) => setTargetWealthId(e.target.value)} className={selectClasses}>
                  <option value="">Target...</option>
                  {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className={labelClass}>Link Account</span>
              <select value={mode === 'Income' ? targetWealthId : sourceWealthId} onChange={(e) => mode === 'Income' ? setTargetWealthId(e.target.value) : setSourceWealthId(e.target.value)} className={selectClasses}>
                <option value="">Unbound</option>
                {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
             {isEditing && (
               <button onClick={onDelete} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl"><Trash2 size={16} /></button>
             )}
             <button onClick={handleInternalSubmit} disabled={!amount} className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md">
               <Check size={14} strokeWidth={4} /> SAVE
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;