import React, { useState } from 'react';
import { UserSettings, WealthItem } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, ArrowRightLeft, FileText, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddTransferProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onTransfer: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onCancel: () => void;
  initialData?: any | null;
}

const AddTransfer: React.FC<AddTransferProps> = ({ settings, wealthItems, onTransfer, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card'].includes(i.category));

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || '');
  const [fromAccountId, setFromAccountId] = useState(initialData?.sourceAccountId || '');
  const [toAccountId, setToAccountId] = useState(initialData?.targetAccountId || '');

  const handleSubmit = () => {
    if (!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    triggerHaptic(20);
    onTransfer(fromAccountId, toAccountId, Math.round(parseFloat(amount)), date, note);
    onCancel();
  };

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 text-white rounded-lg shadow-md">
              <ArrowRightLeft size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">Transfer Money</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-8">
          <div className="text-center py-1">
             <div className="relative border-b-2 border-brand-border pb-1 mx-auto max-w-[180px]">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-600">{currencySymbol}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 text-3xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter text-center"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-0.5">
                <span className={labelClass}>From Account</span>
                <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={selectClasses}>
                    <option value="">Source...</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
             </div>
             <div className="space-y-0.5">
                <span className={labelClass}>To Account</span>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={selectClasses}>
                    <option value="">Target...</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
             </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClasses} />
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Notes</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Details..." className={selectClasses} />
          </div>
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <button 
            onClick={handleSubmit} 
            disabled={!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId} 
            className="w-full py-3 bg-brand-primary text-brand-headerText font-black rounded-xl text-[10px] uppercase tracking-[0.1em] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={4} /> {isEditing ? 'Update Transfer' : 'Complete Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransfer;