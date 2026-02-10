import React, { useState, useMemo, useEffect } from 'react';
import { 
  Category, Expense, UserSettings, Frequency, 
  Income, IncomeType, WealthItem, PaymentMethod, Bill, BudgetRule, RecurringItem 
} from '../types';
import { getCurrencySymbol } from '../constants';
import { 
  Check, X, Trash2, ChevronDown, RefreshCw, FileText
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

  const [mode] = useState<'Expense' | 'Income' | 'Transfer' | 'Bill' | 'Recurring'>(getInitialMode());
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || initialData?.dueDate || initialData?.nextDueDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'UPI');
  const [bucket, setBucket] = useState<Category>(initialData?.category || initialData?.bucket || 'Needs');
  const [mainCategory, setMainCategory] = useState(initialData?.mainCategory || initialData?.category || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || 'General');
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'None');
  const [targetWealthId, setTargetWealthId] = useState<string>(initialData?.targetAccountId || '');
  const [sourceWealthId, setSourceWealthId] = useState<string>(initialData?.sourceAccountId || initialData?.accountId || '');
  const [incomeType, setIncomeType] = useState<IncomeType>(initialData?.type || 'Salary');

  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card', 'Personal Loan', 'Home Loan'].includes(i.category));

  const categoryTree = settings.customCategories || {} as any;
  const categoriesInBucket = useMemo(() => Object.keys(categoryTree[bucket] || {}), [bucket, categoryTree]);
  const subCategoriesInCat = useMemo(() => categoryTree[bucket]?.[mainCategory] || ['General'], [bucket, mainCategory, categoryTree]);

  // FIXED: Changed useMemo to useEffect for state side-effects
  useEffect(() => {
    if (!mainCategory || !categoriesInBucket.includes(mainCategory)) {
        setMainCategory(categoriesInBucket[0] || '');
    }
  }, [bucket, categoriesInBucket, mainCategory]);

  useEffect(() => {
    if (!subCategory || !subCategoriesInCat.includes(subCategory)) {
        setSubCategory(subCategoriesInCat[0] || 'General');
    }
  }, [mainCategory, subCategoriesInCat, subCategory]);

  const handleInternalSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const roundedAmount = Math.round(parseFloat(amount) || 0);
    if (mode === 'Expense') {
      const payload = { amount: roundedAmount, date, category: bucket, mainCategory, subCategory, note: note || merchant, merchant: merchant || note, paymentMethod, sourceAccountId: sourceWealthId, isConfirmed: true };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload as any);
      else onAdd(payload as any, frequency);
    } else if (mode === 'Income') {
      const payload = { amount: roundedAmount, date, type: incomeType, note, paymentMethod, targetAccountId: targetWealthId };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    } else if (mode === 'Bill') {
      const payload = { amount: roundedAmount, dueDate: date, merchant: merchant || note, category: 'Uncategorized' as Category, isPaid: initialData?.isPaid || false, note, frequency: 'None' as Frequency, accountId: sourceWealthId };
      if (isEditing && onUpdateBill) onUpdateBill(initialData.id, payload);
      else if (onAddBill) onAddBill(payload);
    } else if (mode === 'Recurring') {
        const payload = { amount: roundedAmount, nextDueDate: date, merchant: merchant || note, bucket, category: mainCategory, subCategory, note: note || merchant, frequency: frequency === 'None' ? 'Monthly' : frequency };
        if (isEditing && onUpdateRecurring) onUpdateRecurring(initialData.id, payload as any);
        else if (onAddRecurring) onAddRecurring(payload as any);
    } else if (mode === 'Transfer' && onTransfer) {
      if (sourceWealthId && targetWealthId) onTransfer(sourceWealthId, targetWealthId, roundedAmount, date, note);
    }
    onCancel();
  };

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:ring-1 focus:ring-brand-primary/20 transition-all truncate";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-hidden">
      <div className="bg-brand-surface w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="h-1 w-10 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2 mb-0 shrink-0 sm:hidden" />
        
        <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary text-brand-headerText rounded-lg">
               {mode === 'Recurring' ? <RefreshCw size={14} /> : <Check size={14} />}
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">
              {isEditing ? `Edit ${mode}` : `Add ${mode}`}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-8">
          <div className="text-center py-1">
             <div className="relative border-b-2 border-brand-border pb-1 mx-auto max-w-[180px]">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-600">{currencySymbol}</span>
                <input
                  autoFocus
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 text-3xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter text-center"
                />
             </div>
          </div>

          <div className={`grid ${mode === 'Expense' || mode === 'Recurring' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
             <div className="space-y-0.5">
                <span className={labelClass}>{mode === 'Recurring' ? 'Next Due' : mode === 'Bill' ? 'Due Date' : 'Date'}</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClasses} />
             </div>
             {(mode === 'Expense' || mode === 'Recurring') && (
               <div className="space-y-0.5">
                  <span className={labelClass}>Frequency</span>
                  <div className="relative">
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={selectClasses}>
                        <option value="None">Once</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                  </div>
               </div>
             )}
          </div>

          {(mode === 'Expense' || mode === 'Recurring') && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <span className={labelClass}>Bucket</span>
                  <select value={bucket} onChange={(e) => setBucket(e.target.value as Category)} className={selectClasses}>
                    {['Needs', 'Wants', 'Savings', 'Avoids'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-0.5">
                  <span className={labelClass}>Category</span>
                  <select value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} className={selectClasses}>
                    {categoriesInBucket.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-0.5">
                  <span className={labelClass}>Sub-Category</span>
                  <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={selectClasses}>
                    {subCategoriesInCat.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === 'Income' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <span className={labelClass}>Income Source</span>
                <select value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)} className={selectClasses}>
                  {['Salary', 'Freelance', 'Investment', 'Gift', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <span className={labelClass}>Payment Method</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={selectClasses}>
                  {['UPI', 'Net Banking', 'Card', 'Cash', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          ) : null}

          {(mode === 'Expense' || mode === 'Recurring') && (
             <div className="space-y-0.5">
              <span className={labelClass}>Merchant</span>
              <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Netflix, Amazon" className={selectClasses} />
            </div>
          )}

          {mode === 'Transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <span className={labelClass}>From Account</span>
                <select value={sourceWealthId} onChange={(e) => setSourceWealthId(e.target.value)} className={selectClasses}>
                  <option value="">Select source...</option>
                  {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
              </div>
              <div className="space-y-0.5">
                <span className={labelClass}>To Account</span>
                <select value={targetWealthId} onChange={(e) => setTargetWealthId(e.target.value)} className={selectClasses}>
                  <option value="">Select target...</option>
                  {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className={labelClass}>{mode === 'Income' ? 'Deposit To' : 'Linked Account'}</span>
              <select value={mode === 'Income' ? targetWealthId : sourceWealthId} onChange={(e) => mode === 'Income' ? setTargetWealthId(e.target.value) : setSourceWealthId(e.target.value)} className={selectClasses}>
                <option value="">None</option>
                {liquidAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-0.5">
            <span className={labelClass}>Note</span>
            <div className="relative">
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add details..." className={selectClasses} />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-2">
             {isEditing && (
               <button onClick={onDelete} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                  <Trash2 size={18} />
               </button>
             )}
             <button 
               onClick={handleInternalSubmit} 
               disabled={!amount} 
               className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl text-[10px] uppercase tracking-[0.1em] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
             >
               <Check size={16} strokeWidth={4} /> Save Record
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;