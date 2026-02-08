import React, { useState, useMemo, useEffect } from 'react';
import { Category, Expense, UserSettings, WealthItem, PaymentMethod, Frequency } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, ShoppingBag, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { generateQuickNote } from '../services/geminiService';

interface AddExpenseProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (expense: Omit<Expense, 'id'>, frequency?: Frequency) => void;
  onUpdate?: (id: string, updates: Partial<Expense>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: Expense | null;
}

const AddExpense: React.FC<AddExpenseProps> = ({ settings, wealthItems, onAdd, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => i.type === 'Investment' || i.category === 'Credit Card');

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [mainCategory, setMainCategory] = useState(initialData?.mainCategory || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || 'General');
  const [sourceAccountId, setSourceAccountId] = useState(initialData?.sourceAccountId || '');
  const [frequency, setFrequency] = useState<Frequency>('None');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

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

  const handleGenerateNote = async () => {
    if (isGeneratingNote) return;
    triggerHaptic(30);
    setIsGeneratingNote(true);
    try {
      const gNote = await generateQuickNote(
        merchant.trim() || 'General Merchant', 
        mainCategory, 
        subCategory
      );
      setNote(gNote);
    } catch (e) {
      setNote(`${merchant.trim() || 'General'}: ${subCategory}`);
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    
    const payload = {
      amount: Math.round(parseFloat(amount)),
      date,
      category: selectedCategoryData?.bucket || 'Needs',
      mainCategory,
      subCategory,
      merchant: merchant.trim() || 'General',
      note: note.trim() || merchant.trim() || 'General',
      paymentMethod: 'UPI' as PaymentMethod,
      sourceAccountId,
      isConfirmed: true
    };

    if (isEditing && onUpdate && initialData) onUpdate(initialData.id, payload);
    else onAdd(payload, frequency);
    onCancel();
  };

  const menuButtonClass = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500 text-white rounded-lg shadow-md">
              <ShoppingBag size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">{isEditing ? 'Edit Expense' : 'Add Expense'}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3 pb-8">
          <div className="text-center">
            <div className="relative border-b-2 border-brand-border pb-1 mx-auto max-w-[140px]">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-600">{currencySymbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-6 text-2xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Account</span>
              <div className="relative">
                <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className={menuButtonClass}>
                  <option value="">None</option>
                  {liquidAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Category</span>
              <div className="relative">
                <select value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} className={menuButtonClass}>
                  {allCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Sub-Category</span>
              <div className="relative">
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={menuButtonClass}>
                  {subCategoriesInCat.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Merchant</span>
              <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Uber..." className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
               <span className={labelClass}>Repeat?</span>
               <div className="relative">
                 <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={menuButtonClass}>
                    <option value="None">Once</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                 </select>
                 <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
               </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex justify-between items-center pr-1">
               <span className={labelClass}>Description / Notes</span>
               <button 
                 onClick={handleGenerateNote}
                 disabled={isGeneratingNote}
                 className="mb-1 text-indigo-500 active:scale-90 transition-transform disabled:opacity-50"
               >
                 {isGeneratingNote ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
               </button>
            </div>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="e.g. Weekly Grocery Run" 
              className={menuButtonClass} 
            />
          </div>
        </div>

        <div className="p-3 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-2">
            {isEditing && onDelete && (
              <button onClick={() => { triggerHaptic(); onDelete(initialData.id); }} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                <Trash2 size={16} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!amount}
              className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
            >
              <Check size={16} strokeWidth={4} /> {isEditing ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;