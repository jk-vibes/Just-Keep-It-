import React, { useState } from 'react';
import { UserSettings, WealthItem } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, ArrowRightLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddTransferProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onTransfer: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onCancel: () => void;
}

const AddTransfer: React.FC<AddTransferProps> = ({ settings, wealthItems, onTransfer, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Credit Card'].includes(i.category));

  const handleSubmit = () => {
    if (!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    triggerHaptic(20);
    onTransfer(fromAccountId, toAccountId, Math.round(parseFloat(amount)), date, note);
  };

  const selectClasses = "w-full bg-black/5 dark:bg-slate-900/50 p-2 rounded-xl text-[10px] font-bold outline-none border border-brand-border text-brand-text appearance-none cursor-pointer";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 pt-10 no-scrollbar">
      <div className="bg-brand-surface w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 text-white rounded-lg">
              <ArrowRightLeft size={12} />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-brand-text">Transfer</h3>
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
                <span className={labelClass}>Source</span>
                <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={selectClasses}>
                    <option value="">Select...</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <span className={labelClass}>Target</span>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={selectClasses}>
                    <option value="">Select...</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                </select>
             </div>
          </div>

          <div className="space-y-1">
            <span className={labelClass}>Note</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal..." className={selectClasses} />
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId} 
            className="w-full py-3 bg-brand-primary text-brand-headerText font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={14} strokeWidth={4} /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransfer;