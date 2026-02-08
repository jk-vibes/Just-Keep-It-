import React, { useState } from 'react';
import { Bill, UserSettings, WealthItem, Category, Frequency } from '../types';
import { getCurrencySymbol } from '../constants';
import { X, Check, Calendar, Wallet, FileText, ChevronDown } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddBillProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAddBills: (bills: Bill[]) => void;
  onCancel: () => void;
}

const AddBill: React.FC<AddBillProps> = ({ settings, wealthItems, onAddBills, onCancel }) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  const sourceAccounts = wealthItems.filter(i => 
    i.type === 'Liability' || i.category === 'Savings' || i.category === 'Cash'
  );

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(sourceAccounts.length === 1 ? sourceAccounts[0].id : '');

  const handleSubmit = () => {
    if (!amount || !description || !accountId) return;

    const finalBill: Bill = {
      id: Math.random().toString(36).substring(2, 11),
      amount: Math.round(parseFloat(amount)),
      dueDate: dueDate,
      merchant: description.trim(),
      category: 'Uncategorized' as Category,
      isPaid: false,
      frequency: 'None' as Frequency,
      accountId: accountId,
      note: description.trim()
    };

    triggerHaptic(50);
    onAddBills([finalBill]);
  };

  const selectClasses = "w-full bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-[10px] font-black outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer";
  const labelClass = "text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 pt-10 no-scrollbar">
      <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col border border-white/5 overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center px-4 py-2.5 border-b dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 text-white rounded-lg">
              <FileText size={12} />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest dark:text-white">Add Bill</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-center">
            <div className="relative border-b border-slate-100 dark:border-slate-800/60 pb-1">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">{currencySymbol}</span>
              <input
                autoFocus
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-6 text-3xl font-black border-none outline-none focus:ring-0 bg-transparent text-slate-900 dark:text-white tracking-tighter"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className={labelClass}>Description</span>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Rent, Electricity, etc." 
              className={selectClasses} 
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className={labelClass}>Due Date</span>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className={selectClasses} 
              />
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Account</span>
              <div className="relative">
                <select 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)} 
                  className={selectClasses}
                >
                  <option value="" disabled>Bind To</option>
                  {sourceAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={!amount || !description || !accountId}
            className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] disabled:opacity-50 mt-1"
          >
            <Check size={14} strokeWidth={4} /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBill;