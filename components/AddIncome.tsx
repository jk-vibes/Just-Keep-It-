import React, { useState } from 'react';
import { Income, UserSettings, WealthItem, PaymentMethod, IncomeType } from '../types';
import { getCurrencySymbol } from '../constants';
import { X, Check, Landmark, ChevronDown, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddIncomeProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (income: Omit<Income, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<Income>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: Income | null;
}

const AddIncome: React.FC<AddIncomeProps> = ({ settings, wealthItems, onAdd, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => i.type === 'Investment' && ['Savings', 'Cash'].includes(i.category));

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<IncomeType>(initialData?.type || 'Salary');
  const [note, setNote] = useState(initialData?.note || '');
  const [targetAccountId, setTargetAccountId] = useState(initialData?.targetAccountId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'Net Banking');

  const handleSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const payload = {
      amount: Math.round(parseFloat(amount)),
      date,
      type,
      note,
      paymentMethod,
      targetAccountId
    };

    if (isEditing && onUpdate && initialData) onUpdate(initialData.id, payload);
    else onAdd(payload);
    onCancel();
  };

  const menuButtonClass = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-md">
              <Landmark size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">{isEditing ? 'Edit Income' : 'Add Income'}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 pb-8">
          <div className="text-center">
            <div className="relative border-b-2 border-brand-border pb-1 mx-auto max-w-[140px]">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-600">{currencySymbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-6 text-2xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Type</span>
              <div className="relative">
                <select value={type} onChange={(e) => setType(e.target.value as IncomeType)} className={menuButtonClass}>
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investment">Investment</option>
                    <option value="Gift">Gift</option>
                    <option value="Other">Other</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Deposit To</span>
            <div className="relative">
              <select value={targetAccountId} onChange={(e) => setTargetAccountId(e.target.value)} className={menuButtonClass}>
                <option value="">None</option>
                {liquidAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="space-y-0.5">
            <span className={labelClass}>Notes</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Source details..." className={menuButtonClass} />
          </div>
        </div>

        <div className="p-3 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-2">
            {isEditing && onDelete && (
              <button onClick={() => { triggerHaptic(); onDelete(initialData.id); }} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!amount}
              className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
            >
              <Check size={16} strokeWidth={4} /> {isEditing ? 'Update Income' : 'Save Income'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddIncome;