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

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black border border-brand-border text-brand-text appearance-none cursor-pointer transition-all focus:border-brand-primary/30 truncate";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl border border-brand-border flex flex-col animate-slide-up max-h-[90vh] overflow-hidden">
        <div className="px-4 py-2 border-b border-brand-border flex justify-between items-center shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">Pay Bill</h3>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <div className="py-4 flex flex-col items-center">
            <div className="bg-indigo-500/10 p-4 rounded-xl text-indigo-400 mb-3 shadow-inner">
              <Landmark size={24} />
            </div>
            <h2 className="text-sm font-black text-brand-text tracking-[0.05em] text-center uppercase truncate w-full px-2">{bill.merchant}</h2>
            <div className="text-4xl font-black text-brand-text mt-2 tracking-tighter">
              <span className="text-lg opacity-40 mr-0.5 font-bold">{currencySymbol}</span>
              {Math.round(bill.amount).toLocaleString()}
            </div>
          </div>

          <div className="space-y-4 pb-4">
            <div className="space-y-0.5">
              <label className={labelClass}>Pay From</label>
              <select 
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={selectClasses}
              >
                <option value="" disabled>Select Account</option>
                {liquidAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.alias || acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <button 
            onClick={handleSettle}
            disabled={!selectedId}
            className="w-full bg-brand-primary text-brand-headerText font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.1em] active:scale-95 transition-all disabled:opacity-50"
          >
            <Check size={16} strokeWidth={4} /> Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillPayModal;