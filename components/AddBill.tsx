import React, { useState } from 'react';
import { Bill, UserSettings, WealthItem, Category, Frequency } from '../types';
import { getCurrencySymbol } from '../constants';
import { X, Check, Calendar, Wallet, FileText, ChevronDown, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddBillProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAddBills: (bills: Bill[]) => void;
  onUpdate?: (id: string, updates: Partial<Bill>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: Bill | null;
}

const AddBill: React.FC<AddBillProps> = ({ settings, wealthItems, onAddBills, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const sourceAccounts = wealthItems.filter(i => 
    i.type === 'Liability' || i.category === 'Savings' || i.category === 'Cash'
  );

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.merchant || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(initialData?.accountId || (sourceAccounts.length === 1 ? sourceAccounts[0].id : ''));

  const handleSubmit = () => {
    if (!amount || !description || !accountId) return;

    const payload = {
      amount: Math.round(parseFloat(amount)),
      dueDate: dueDate,
      merchant: description.trim(),
      category: 'Uncategorized' as Category,
      isPaid: initialData?.isPaid || false,
      frequency: 'None' as Frequency,
      accountId: accountId,
      note: description.trim()
    };

    triggerHaptic(50);
    if (isEditing && onUpdate && initialData) onUpdate(initialData.id, payload);
    else onAddBills([{ ...payload, id: Math.random().toString(36).substring(2, 11) }]);
    onCancel();
  };

  const menuButtonClass = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left";
  const labelClass = "text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary text-brand-headerText rounded-lg shadow-md">
              <FileText size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">{isEditing ? 'Edit Bill' : 'Add Bill'}</h3>
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

          <div className="space-y-0.5">
            <span className={labelClass}>Description</span>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Electricity..." 
              className={menuButtonClass} 
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Due Date</span>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className={menuButtonClass} 
              />
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Link Account</span>
              <div className="relative">
                <select 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)} 
                  className={menuButtonClass}
                >
                  <option value="" disabled>Select Source</option>
                  {sourceAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
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
              disabled={!amount || !description || !accountId}
              className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
            >
              <Check size={16} strokeWidth={4} /> {isEditing ? 'Update Bill' : 'Save Bill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBill;