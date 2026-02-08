import React, { useState, useMemo } from 'react';
import { BudgetItem, Category, UserSettings, Expense } from '../types';
import { getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { Check, X, Target, Trash2, ChevronDown } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface BudgetGoalModalProps {
  settings: UserSettings;
  expenses: Expense[];
  onSave: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<BudgetItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: BudgetItem | null;
  viewDate: Date;
}

const BudgetGoalModal: React.FC<BudgetGoalModalProps> = ({ 
  settings, expenses, onSave, onUpdate, onDelete, onCancel, initialData, viewDate
}) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);

  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Needs');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || SUB_CATEGORIES['Needs'][0]);

  const spentContext = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const currentMonthExps = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    
    // Preview match should use the same logic as the main planner
    const subCategoryTotal = currentMonthExps.filter(e => {
        const isMatchingCategory = e.category === category;
        if (!isMatchingCategory) return false;
        
        const subMatch = subCategory && e.subCategory === subCategory;
        const nameMatch = name && (e.merchant?.toLowerCase().includes(name.toLowerCase()) || 
                                  e.note?.toLowerCase().includes(name.toLowerCase()));
        
        return subMatch || nameMatch;
    }).reduce((sum, e) => sum + e.amount, 0);
    
    return { subCategoryTotal };
  }, [expenses, category, subCategory, name, viewDate]);

  const handleSubmit = () => {
    if (!name || !amount) return;
    triggerHaptic(20);
    const payload = {
      name: name.trim(),
      amount: Math.round(parseFloat(amount) || 0),
      category,
      subCategory
    };

    if (isEditing && onUpdate && initialData?.id) onUpdate(initialData.id, payload);
    else onSave(payload);
    onCancel();
  };

  const utilizationPercentage = useMemo(() => {
    const target = parseFloat(amount);
    if (!target || target <= 0) return 0;
    return (spentContext.subCategoryTotal / target) * 100;
  }, [amount, spentContext.subCategoryTotal]);

  const selectClasses = "w-full bg-brand-accent/10 p-2.5 rounded-xl text-[10px] font-black border border-brand-border text-brand-text appearance-none";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 pt-10 no-scrollbar">
      <div className="bg-brand-surface w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <Target size={12} />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-brand-text">Budget Goal</h3>
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

          <div className="bg-brand-accent/10 p-2.5 rounded-xl border border-brand-border">
            <div className="flex justify-between items-center">
               <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tight">Spent so far ({viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}):</p>
               <div className="text-right">
                  <p className="text-[9px] font-black text-brand-text leading-none">{currencySymbol}{spentContext.subCategoryTotal.toLocaleString()}</p>
                  {parseFloat(amount) > 0 && (
                    <p className={`text-[6px] font-black uppercase mt-0.5 tracking-tighter ${utilizationPercentage > 100 ? 'text-rose-500' : 'text-slate-500'}`}>
                      {Math.round(utilizationPercentage)}% Utilized
                    </p>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className={labelClass}>Goal Title</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent, Gym, etc." className={selectClasses} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className={labelClass}>Bucket</span>
              <select value={category} onChange={(e) => { setCategory(e.target.value as Category); setSubCategory(SUB_CATEGORIES[e.target.value as Category][0]); }} className={selectClasses}>
                {['Needs', 'Wants', 'Savings'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Sub-Category</span>
              <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={selectClasses}>
                {SUB_CATEGORIES[category].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {isEditing && (
              <button onClick={() => { triggerHaptic(); if(onDelete) onDelete(initialData!.id); }} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                <Trash2 size={16} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!amount || !name}
              className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] disabled:opacity-50"
            >
              <Check size={14} strokeWidth={4} /> SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetGoalModal;