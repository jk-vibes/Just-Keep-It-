import React, { useState, useMemo, useEffect } from 'react';
import { BudgetItem, Category, UserSettings, Expense } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS } from '../constants';
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
  const [mainCategory, setMainCategory] = useState(initialData?.category || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || 'General');

  // Derive master list of categories from all buckets
  const allCategories = useMemo(() => {
    const list: { name: string; bucket: Category; subs: string[] }[] = [];
    if (!settings.customCategories) return list;
    Object.entries(settings.customCategories).forEach(([bucket, cats]) => {
      Object.entries(cats).forEach(([catName, subs]) => {
        list.push({ name: catName, bucket: bucket as Category, subs });
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [settings.customCategories]);

  const selectedCategoryData = useMemo(() => {
    return allCategories.find(c => c.name === mainCategory) || allCategories[0];
  }, [allCategories, mainCategory]);

  const subCategoriesInCat = useMemo(() => {
    return selectedCategoryData?.subs || ['General'];
  }, [selectedCategoryData]);

  // Initial Sync
  useEffect(() => {
    if (!mainCategory && allCategories.length > 0) {
      setMainCategory(allCategories[0].name);
    }
  }, [allCategories, mainCategory]);

  useEffect(() => {
    if (!subCategory || !subCategoriesInCat.includes(subCategory)) {
        setSubCategory(subCategoriesInCat[0] || 'General');
    }
  }, [mainCategory, subCategoriesInCat, subCategory]);

  const spentContext = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const bucket = selectedCategoryData?.bucket || 'Needs';
    
    const currentMonthExps = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    
    const subCategoryTotal = currentMonthExps.filter(e => {
        const isMatchingBucket = e.category === bucket;
        if (!isMatchingBucket) return false;
        
        const isMatchingMain = e.mainCategory === mainCategory;
        const isMatchingSub = e.subCategory === subCategory;
        
        const hierarchyMatch = isMatchingMain && (isMatchingSub || subCategory === 'General');
        const nameMatch = name && (e.merchant?.toLowerCase().includes(name.toLowerCase()) || 
                                  e.note?.toLowerCase().includes(name.toLowerCase()));
        
        return hierarchyMatch || nameMatch;
    }).reduce((sum, e) => sum + e.amount, 0);
    
    return { subCategoryTotal };
  }, [expenses, selectedCategoryData, mainCategory, subCategory, name, viewDate]);

  const handleSubmit = () => {
    if (!name || !amount) return;
    triggerHaptic(20);
    const payload = {
      name: name.trim(),
      amount: Math.round(parseFloat(amount) || 0),
      bucket: selectedCategoryData?.bucket || 'Needs',
      category: mainCategory,
      subCategory
    };

    if (isEditing && onUpdate && initialData?.id) onUpdate(initialData.id, payload as any);
    else onSave(payload as any);
    onCancel();
  };

  const utilizationPercentage = useMemo(() => {
    const target = parseFloat(amount);
    if (!target || target <= 0) return 0;
    return (spentContext.subCategoryTotal / target) * 100;
  }, [amount, spentContext.subCategoryTotal]);

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black border border-brand-border text-brand-text appearance-none transition-all focus:border-brand-primary/30 outline-none truncate";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-md">
              <Target size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">Budget Goal</h3>
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
            <p className={labelClass + " mt-1"}>Target Limit</p>
          </div>

          <div className="bg-brand-accent/50 p-3 rounded-xl border border-brand-border">
            <div className="flex justify-between items-center">
               <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">Status ({viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()})</p>
               <div className="text-right leading-none">
                  <span className="text-[10px] font-black text-brand-text">{currencySymbol}{spentContext.subCategoryTotal.toLocaleString()}</span>
                  {parseFloat(amount) > 0 && (
                    <span className={`text-[7px] font-black uppercase ml-2 ${utilizationPercentage > 100 ? 'text-rose-500' : 'text-slate-500'}`}>
                      {Math.round(utilizationPercentage)}% load
                    </span>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Goal Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Housing, Dining" className={selectClasses} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Category</span>
              <div className="relative">
                <select value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} className={selectClasses}>
                  {allCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Sub-Category</span>
              <div className="relative">
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={selectClasses}>
                  {subCategoriesInCat.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-2">
            {isEditing && (
              <button onClick={() => { triggerHaptic(); if(onDelete) onDelete(initialData!.id); }} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!amount || !name}
              className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
            >
              <Check size={16} strokeWidth={4} /> Register Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetGoalModal;