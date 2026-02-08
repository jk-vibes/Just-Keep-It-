import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bill, UserSettings, WealthItem, Category, Frequency } from '../types';
import { getCurrencySymbol } from '../constants';
import { X, Check, Calendar, Wallet, FileText, ChevronDown, Trash2, Search } from 'lucide-react';
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
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card'].includes(i.category));

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'Monthly');

  const handleSubmit = () => {
    if (!amount || !merchant) return;
    triggerHaptic(20);
    const payload = {
      amount: Math.round(parseFloat(amount)),
      dueDate,
      merchant: merchant.trim(),
      category: (initialData?.category || 'Needs') as Category,
      mainCategory: initialData?.mainCategory || 'Obligations',
      isPaid: initialData?.isPaid || false,
      frequency,
      note: note.trim(),
      accountId
    };

    if (isEditing && onUpdate && initialData) onUpdate(initialData.id, payload);
    else onAddBills([{ ...payload, id: Math.random().toString(36).substring(2, 11) }]);
    onCancel();
  };

  const menuButtonClass = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left shadow-inner";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        
        {/* DESIGNER GRADIENT HEADER - Standardized Style */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 flex justify-between items-center shrink-0 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg shadow-inner">
              <Calendar size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{isEditing ? 'Modify Bill' : 'Add Bill'}</h3>
              <p className="text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Registry Node</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/5"><X size={16} strokeWidth={3} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-8">
          
          {/* LEFT-ALIGNED AMOUNT FIELD */}
          <div className="space-y-1.5">
            <span className={labelClass}>Obligation Amount</span>
            <div className="flex items-center gap-3 bg-brand-accent p-3 rounded-[22px] border border-brand-border shadow-inner group">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-slate-400 group-focus-within:text-brand-primary transition-colors">{currencySymbol}</span>
                <input
                  autoFocus={!isEditing}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-2xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className={labelClass}>Due Date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Recurrence</span>
              <div className="relative">
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={menuButtonClass}>
                    <option value="None">Once-off</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Annual</option>
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Payee / Merchant</span>
            <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Electricity Board" className={menuButtonClass} />
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Linked Account</span>
            <div className="relative">
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={menuButtonClass}>
                <option value="">No Default</option>
                {liquidAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="space-y-0.5">
            <span className={labelClass}>Note</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Confirmation ID" className={menuButtonClass} />
          </div>
        </div>

        <div className="p-5 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-3">
            {isEditing && onDelete && (
              <button onClick={() => { triggerHaptic(); onDelete(initialData.id); }} className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl active:scale-90 transition-all border border-rose-500/10">
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!amount || !merchant}
              className="flex-1 py-4 bg-brand-primary text-brand-headerText font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-[10px] disabled:opacity-50"
            >
              <Check size={18} strokeWidth={4} /> {isEditing ? 'Update Entry' : 'Register Bill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBill;