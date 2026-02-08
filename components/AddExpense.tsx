import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Expense, UserSettings, WealthItem, PaymentMethod, Frequency } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ShoppingBag, Trash2, Sparkles, Loader2, ChevronDown, Search } from 'lucide-react';
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

const Typeahead: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  icon?: React.ReactNode;
}> = ({ label, value, onChange, suggestions, placeholder, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.toLowerCase();
    // Allow showing same-prefix suggestions even if the exact match exists to allow easy changing
    return suggestions.filter(s => s.toLowerCase().includes(q));
  }, [suggestions, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";
  const inputClass = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text transition-all focus:border-brand-primary/30 truncate";

  return (
    <div className="relative" ref={containerRef}>
      <span className={labelClass}>{label}</span>
      <div className="relative group">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={inputClass}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-brand-primary transition-colors">
          {icon || <Search size={10} />}
        </div>
      </div>
      
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[300] left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto no-scrollbar animate-slide-up">
          {filtered.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setIsOpen(false); triggerHaptic(5); }}
              className={`w-full px-3 py-2 text-left text-[10px] font-bold transition-colors border-b border-brand-border last:border-0 ${value === s ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text hover:bg-brand-accent'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AddExpense: React.FC<AddExpenseProps> = ({ settings, wealthItems, onAdd, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => i.type === 'Investment' || i.category === 'Credit Card');

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [mainCategory, setMainCategory] = useState(initialData?.mainCategory || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  const [sourceAccountId, setSourceAccountId] = useState(initialData?.sourceAccountId || '');
  const [frequency, setFrequency] = useState<Frequency>('None');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  // Bucket detection logic based on typed mainCategory
  const detectedBucket = useMemo(() => {
    if (!settings.customCategories) return 'Needs';
    for (const [bucket, cats] of Object.entries(settings.customCategories)) {
      if (Object.keys(cats).includes(mainCategory)) return bucket as Category;
    }
    return 'Needs';
  }, [mainCategory, settings.customCategories]);

  const allMainCategories = useMemo(() => {
    const list: string[] = [];
    if (!settings.customCategories) return list;
    Object.values(settings.customCategories).forEach(cats => {
      list.push(...Object.keys(cats));
    });
    return Array.from(new Set(list)).sort();
  }, [settings.customCategories]);

  const currentSubCategories = useMemo(() => {
    if (!settings.customCategories) return ['General'];
    for (const bucket of Object.values(settings.customCategories)) {
      if (bucket[mainCategory]) return bucket[mainCategory].sort();
    }
    return ['General'];
  }, [mainCategory, settings.customCategories]);

  const handleGenerateNote = async () => {
    if (isGeneratingNote) return;
    triggerHaptic(30);
    setIsGeneratingNote(true);
    try {
      const gNote = await generateQuickNote(
        merchant.trim() || 'General Merchant', 
        mainCategory || 'General', 
        subCategory || 'General'
      );
      setNote(gNote);
    } catch (e) {
      setNote(`${merchant.trim() || 'General'}: ${subCategory || 'General'}`);
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleSubmit = () => {
    if (!amount || !mainCategory) return;

    const isNewCategory = !allMainCategories.includes(mainCategory);
    const isNewSubCategory = subCategory && !currentSubCategories.includes(subCategory);

    if (isNewCategory || isNewSubCategory) {
      const confirmationMsg = `Confirm new taxonomy:\n${isNewCategory ? `• Category: ${mainCategory}\n` : ''}${isNewSubCategory ? `• Sub-Category: ${subCategory}` : ''}\n\nThis will be added to your registry. Continue?`;
      if (!window.confirm(confirmationMsg)) return;
    }

    triggerHaptic(20);
    
    const payload = {
      amount: Math.round(parseFloat(amount)),
      date,
      category: detectedBucket,
      mainCategory: mainCategory.trim(),
      subCategory: (subCategory || 'General').trim(),
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

        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4 pb-8">
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
            <Typeahead
              label="Category"
              value={mainCategory}
              onChange={setMainCategory}
              suggestions={allMainCategories}
              placeholder="e.g. Housing"
            />
            <Typeahead
              label="Sub-Category"
              value={subCategory}
              onChange={setSubCategory}
              suggestions={currentSubCategories}
              placeholder="e.g. Rent"
            />
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
              disabled={!amount || !mainCategory}
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