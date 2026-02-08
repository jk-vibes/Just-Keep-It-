import React, { useState } from 'react';
import { WealthItem, WealthType, WealthCategory, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, Landmark, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddAccountProps {
  settings: UserSettings;
  onSave: (item: Omit<WealthItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WealthItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: WealthItem | null;
}

const ASSET_CATEGORIES: WealthCategory[] = ['Savings', 'Pension', 'Gold', 'Investment', 'Cash', 'Other'];
const LIABILITY_CATEGORIES: WealthCategory[] = ['Credit Card', 'Personal Loan', 'Home Loan', 'Overdraft', 'Gold Loan', 'Other'];

const AddAccount: React.FC<AddAccountProps> = ({ settings, onSave, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const [type, setType] = useState<WealthType>(initialData?.type || 'Investment');
  const [category, setCategory] = useState<WealthCategory>(initialData?.category || 'Savings');
  const [groupName, setGroupName] = useState(initialData?.group || '');
  const [name, setName] = useState(initialData?.name || '');
  const [alias, setAlias] = useState(initialData?.alias || '');
  const [value, setValue] = useState(initialData ? initialData.value.toString() : '0');
  const [limit, setLimit] = useState(initialData?.limit ? Math.round(initialData.limit).toString() : '0');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleSubmit = () => {
    if (!name) return;
    triggerHaptic(20);
    const payload: Omit<WealthItem, 'id'> = {
      type, 
      category, 
      group: groupName.trim() || category, 
      name: name.trim(), 
      alias: (alias || name).trim(),
      value: Math.round(parseFloat(value) || 0),
      date: new Date().toISOString()
    };
    if (category === 'Credit Card') payload.limit = Math.round(parseFloat(limit) || 0);

    if (isEditing && onUpdate && initialData?.id) onUpdate(initialData.id, payload);
    else onSave(payload);
    onCancel();
  };

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black border border-brand-border text-brand-text appearance-none transition-all outline-none focus:ring-1 focus:ring-brand-primary/20 truncate";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary">
              <Landmark size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">{isEditing ? 'Edit Account' : 'Add Account'}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-8">
          <div className="text-center py-1">
             <div className="relative border-b-2 border-brand-border pb-1 mx-auto max-w-[180px]">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-600">{currencySymbol}</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 text-3xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter text-center"
                />
             </div>
             <p className={labelClass + " mt-1"}>
               {type === 'Liability' ? 'Outstanding Amount' : 'Current Balance'}
             </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-0.5">
                <span className={labelClass}>Account Type</span>
                <select value={type} onChange={(e) => { const nt = e.target.value as WealthType; setType(nt); setCategory(nt === 'Investment' ? 'Savings' : 'Credit Card'); }} className={selectClasses}>
                    <option value="Investment">Asset</option>
                    <option value="Liability">Liability</option>
                </select>
             </div>
             <div className="space-y-0.5">
                <span className={labelClass}>Classification</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as WealthCategory)} className={selectClasses}>
                    {(type === 'Investment' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
             </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Account Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AMEX Platinum" className={selectClasses} />
          </div>

          {category === 'Credit Card' && (
            <div className="space-y-0.5 animate-kick">
              <span className={labelClass}>Credit Limit</span>
              <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" className={selectClasses} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-2">
             {isEditing && onDelete && (
               <button onClick={() => { triggerHaptic(); if(window.confirm('Delete this account?')) onDelete(initialData!.id); }} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                  <Trash2 size={18} />
               </button>
             )}
             <button onClick={handleSubmit} disabled={!name} className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-[10px]">
               <Check size={16} strokeWidth={4} /> Save Account
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccount;