import React, { useState } from 'react';
import { Bill, WealthItem, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { X, Check, Landmark, ChevronDown } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface BillPayModalProps {
  bill: Bill;
  wealthItems: WealthItem[];
  settings: UserSettings;
  onConfirm: (accountId: string) => void;
  onCancel: () => void;
}

const BillPayModal: React.FC<BillPayModalProps> = ({ bill, wealthItems, settings, onConfirm, onCancel }) => {
  const [selectedId, setSelectedId] = useState(bill.accountId || '');
  const currencySymbol = getCurrencySymbol(settings.currency);

  const liquidAccounts = wealthItems.filter(i => 
    i.type === 'Investment' || i.category === 'Credit Card' || i.category === 'Cash' || i.category === 'Savings'
  );

  const handleSettle = () => {
    if (!selectedId) return;
    triggerHaptic(50);
    onConfirm(selectedId);
  };

  const selectClasses = "w-full bg-black/5 dark:bg-slate-900 p-3 rounded-xl text-[10px] font-black border border-brand-border text-brand-text appearance-none cursor-pointer";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 pt-10 no-scrollbar">
      <div className="bg-brand-surface w-full max-w-sm rounded-[24px] shadow-2xl border border-brand-border flex flex-col animate-slide-up overflow-hidden">
        <div className="px-4 py-2.5 border-b border-brand-border flex justify-between items-center shrink-0">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-brand-text">Settle Signal</h3>
          <button onClick={onCancel} className="p-1.5 text-slate-400"><X size={16} /></button>
        </div>

        <div className="p-4 flex flex-col items-center">
          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400 mb-3">
            <Landmark size={24} />
          </div>
          <h2 className="text-sm font-black text-brand-text tracking-tighter text-center uppercase">{bill.merchant}</h2>
          <div className="text-3xl font-black text-brand-text mt-1 tracking-tighter">
            <span className="text-lg opacity-40 mr-1">{currencySymbol}</span>
            {Math.round(bill.amount).toLocaleString()}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>Target Account</label>
            <div className="relative">
              <select 
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={selectClasses}
              >
                <option value="" disabled>Select Source</option>
                {liquidAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.alias || acc.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={handleSettle}
            disabled={!selectedId}
            className="w-full bg-brand-primary text-brand-headerText font-black py-3.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
          >
            <Check size={16} strokeWidth={4} /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillPayModal;