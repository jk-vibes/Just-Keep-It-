
import React, { useState } from 'react';
import { WealthItem, WealthType, WealthCategory, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, Wallet, Landmark, CreditCard, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AccountFormProps {
  settings: UserSettings;
  onSave: (item: Omit<WealthItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WealthItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: WealthItem | null;
}

const DEBIT_CATEGORIES: WealthCategory[] = ['Savings', 'Overdraft', 'Cash', 'Investment'];
// Fixed: Replaced 'Card' and 'Loan' with 'Credit Card' and 'Personal Loan' to match WealthCategory type
const CREDIT_CATEGORIES: WealthCategory[] = ['Credit Card', 'Personal Loan', 'Other'];

const AccountForm: React.FC<AccountFormProps> = ({ settings, onSave, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const [type, setType] = useState<WealthType>(initialData?.type || 'Investment');
  const [category, setCategory] = useState<WealthCategory>(initialData?.category || 'Savings');
  const [name, setName] = useState(initialData?.name || '');
  const [alias, setAlias] = useState(initialData?.alias || '');
  const [value, setValue] = useState(initialData && initialData.value !== 0 ? Math.round(initialData.value).toString() : '');
  const [limit, setLimit] = useState(initialData?.limit && initialData.limit !== 0 ? Math.round(initialData.limit).toString() : '');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleSubmit = () => {
    if (!name || !value) return;
    triggerHaptic(20);
    const payload: Omit<WealthItem, 'id'> = {
      type, category, name: name.trim(), alias: (alias || name).trim(),
      value: Math.round(parseFloat(value) || 0),
      date: new Date().toISOString()
    };
    if (category === 'Credit Card' && limit) payload.limit = Math.round(parseFloat(limit) || 0);

    if (isEditing && onUpdate && initialData?.id) onUpdate(initialData.id, payload);
    else onSave(payload);
  };

  const selectClasses = "w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-[11px] font-black outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-brand-primary/50 transition-colors";
  const inputLabelClass = "text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1 mb-1";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up border border-white/5 overflow-hidden">
        
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary">
              <Landmark size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white">
              {isEditing ? 'Update Account' : 'Add Account'}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 active:scale-90"><X size={16} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          
          <div className="space-y-0.5">
             <span className={inputLabelClass}>Current Balance</span>
             <div className="relative border-b border-slate-100 dark:border-slate-800/60 pb-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">{currencySymbol}</span>
                <input
                  autoFocus
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 py-1 text-3xl font-black border-none outline-none focus:ring-0 placeholder-slate-100 bg-transparent text-slate-900 dark:text-white tracking-tighter"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-0.5">
                <span className={inputLabelClass}>Wealth Type</span>
                <div className="relative">
                  <select 
                    value={type} 
                    onChange={(e) => {
                      const newType = e.target.value as WealthType;
                      setType(newType);
                      setCategory(newType === 'Investment' ? 'Savings' : 'Credit Card');
                    }} 
                    className={selectClasses}
                  >
                    <option value="Investment">Asset</option>
                    <option value="Liability">Debt</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="space-y-0.5">
                <span className={inputLabelClass}>Classification</span>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value as WealthCategory)} 
                    className={selectClasses} 
                  >
                    {(type === 'Investment' ? DEBIT_CATEGORIES : CREDIT_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className="space-y-0.5">
            <span className={inputLabelClass}><Wallet size={8}/> Display Name</span>
            <input 
              type="text" 
              value={alias} 
              onChange={(e) => setAlias(e.target.value)} 
              placeholder="e.g. Primary Bank" 
              className={selectClasses} 
            />
          </div>

          <div className="space-y-0.5">
            <span className={inputLabelClass}><CreditCard size={8}/> Registry Label</span>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Internal ID" 
              className={selectClasses} 
            />
          </div>

          {category === 'Credit Card' && (
            <div className="space-y-0.5 animate-kick">
              <span className={inputLabelClass}>Credit Limit</span>
              <input 
                type="number" 
                value={limit} 
                onChange={(e) => setLimit(e.target.value)} 
                placeholder="0" 
                className={selectClasses} 
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex gap-2">
             {isEditing && onDelete && (
               <button onClick={() => { triggerHaptic(); if(window.confirm('Delete this account?')) onDelete(initialData!.id); }} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90">
                  <Trash2 size={18} />
               </button>
             )}
             <button onClick={handleSubmit} disabled={!name || !value} className="flex-1 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
               <Check size={16} strokeWidth={4} /> {isEditing ? 'Update' : 'Register Account'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;
