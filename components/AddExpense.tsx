import React, { useState } from 'react';
import { Category, Expense, UserSettings, WealthItem, PaymentMethod } from '../types';
import { getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { Check, X, ChevronDown, ShoppingBag } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddExpenseProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

const AddExpense: React.FC<AddExpenseProps> = ({ settings, wealthItems, onAdd, onCancel }) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => i.type === 'Investment' || i.category === 'Credit Card');

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  const [subCategory, setSubCategory] = useState(SUB_CATEGORIES['Needs'][0]);
  const [sourceAccountId, setSourceAccountId] = useState('');

  const handleSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    onAdd({
      amount: Math.round(parseFloat(amount)),
      date,
      category,
      subCategory,
      merchant,
      note: merchant,
      paymentMethod: 'UPI' as PaymentMethod,
      sourceAccountId,
      isConfirmed: true
    });
  };

  const selectClasses = "w-full bg-black/5 dark:bg-slate-900 p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 pt-10 no-scrollbar">
      <div className="bg-brand-surface w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500 text-white rounded-lg">
              <ShoppingBag size={12} />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-brand-text">Add Expense</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
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
              <span className={labelClass}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClasses} />
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Account</span>
              <div className="relative">
                <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className={selectClasses}>
                  <option value="">Unbound</option>
                  {liquidAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className={labelClass}>Bucket</span>
              <div className="relative">
                <select 
                  value={category} 
                  onChange={(e) => { 
                    const b = e.target.value as Category;
                    setCategory(b); 
                    setSubCategory(SUB_CATEGORIES[b][0]); 
                  }} 
                  className={selectClasses}
                >
                  {['Needs', 'Wants', 'Savings', 'Avoids'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Label</span>
              <div className="relative">
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={selectClasses}>
                  {SUB_CATEGORIES[category].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className={labelClass}>Merchant</span>
            <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Uber, Starbucks..." className={selectClasses} />
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={!amount}
            className="w-full py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] disabled:opacity-50 mt-1"
          >
            <Check size={14} strokeWidth={4} /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;