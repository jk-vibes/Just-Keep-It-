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

  const menuButtonClass = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left shadow-inner";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        
        {/* DESIGNER GRADIENT HEADER - Standardized Style */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 flex justify-between items-center shrink-0 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg shadow-inner">
              <ArrowRightLeft size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Internal Transfer</h3>
              <p className="text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Capital Rebalancing</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/5"><X size={16} strokeWidth={3} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-8">
          
          {/* LEFT-ALIGNED AMOUNT FIELD */}
          <div className="space-y-1.5">
            <span className={labelClass}>Transfer Amount</span>
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
                <span className={labelClass}>Source Ledger</span>
                <div className="relative">
                  <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={menuButtonClass}>
                      <option value="">Select source...</option>
                      {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                  </select>
                  <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="space-y-0.5">
                <span className={labelClass}>Destination Ledger</span>
                <div className="relative">
                  <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={menuButtonClass}>
                      <option value="">Select target...</option>
                      {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                  </select>
                  <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Registry Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={menuButtonClass} />
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Context Note</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Fund rebalancing" className={menuButtonClass} />
          </div>
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <button 
            onClick={handleSubmit} 
            disabled={!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId} 
            className="w-full py-4 bg-brand-primary text-brand-headerText font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[11px]"
          >
            <Check size={18} strokeWidth={4} /> {isEditing ? 'Update Transfer' : 'Authorize Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransfer;