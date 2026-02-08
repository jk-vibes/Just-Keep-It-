import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Expense, UserSettings, WealthItem, PaymentMethod, Frequency } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ShoppingBag, Trash2, Sparkles, Loader2, ChevronDown, Search, Wand2, Command } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { generateQuickNote, parseTransactionText } from '../services/geminiService';

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
  const inputClass = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text transition-all focus:border-brand-primary/30 truncate shadow-inner";

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
  
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

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

  const handleAiCapture = async () => {
    if (!aiPrompt.trim() || isAiProcessing) return;
    triggerHaptic(50);
    setIsAiProcessing(true);
    try {
      const result = await parseTransactionText(aiPrompt, settings.currency);
      if (result) {
        setAmount(result.amount.toString());
        setMerchant(result.merchant);
        setMainCategory(result.category === 'Uncategorized' ? '' : result.category);
        setSubCategory(result.subCategory);
        setDate(result.date);
        setNote(aiPrompt);
        setIsAiMode(false);
        setAiPrompt('');
        triggerHaptic(40);
      }
    } catch (e) {
      alert("AI failed to parse the signal. Please try a different description.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (!amount || !mainCategory) return;
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

  const menuButtonClass = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left shadow-inner";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        
        {/* DESIGNER GRADIENT HEADER */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 flex justify-between items-center shrink-0 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg shadow-inner">
              <ShoppingBag size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{isEditing ? 'Modify Expense' : 'Add Expense'}</h3>
              <p className="text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Registry Protocol</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/5">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-8">
          
          {/* LEFT-ALIGNED AMOUNT FIELD WITH AI ICON */}
          <div className="space-y-1">
            <span className={labelClass}>Transaction Amount</span>
            <div className="flex items-center gap-2 bg-brand-accent p-3 rounded-[22px] border border-brand-border shadow-inner group">
              <div className="flex items-baseline gap-1 shrink-0 flex-1 pl-1">
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
              <button 
                onClick={() => { triggerHaptic(); setIsAiMode(!isAiMode); }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 ${isAiMode ? 'bg-brand-primary text-brand-headerText shadow-md' : 'bg-brand-surface text-brand-primary border border-brand-border'}`}
              >
                <Wand2 size={14} strokeWidth={2.5} className={isAiMode ? 'animate-pulse' : ''} />
                <span className="text-[8px] font-black uppercase tracking-widest">Neural</span>
              </button>
            </div>
          </div>

          {/* AI COMMAND INTERFACE */}
          {isAiMode && (
            <div className="bg-indigo-600 rounded-[22px] p-4 shadow-xl border border-indigo-400/30 animate-kick space-y-3">
              <div className="flex items-center gap-2">
                 <Command size={10} className="text-white opacity-70" />
                 <span className="text-[7px] font-black text-white uppercase tracking-widest">Natural Language Capture</span>
              </div>
              <textarea 
                autoFocus
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. 1500 for Starbucks coffee yesterday"
                className="w-full bg-white/10 text-white placeholder-white/40 p-3 rounded-xl text-[10px] font-bold border border-white/10 outline-none focus:bg-white/20 transition-all resize-none h-16"
              />
              <button 
                onClick={handleAiCapture}
                disabled={!aiPrompt.trim() || isAiProcessing}
                className="w-full bg-white text-indigo-600 font-black py-2 rounded-xl text-[8px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAiProcessing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                Process Signal
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className={labelClass}>Registry Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Target Account</span>
              <div className="relative">
                <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className={menuButtonClass}>
                  <option value="">None Bound</option>
                  {liquidAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Typeahead
              label="Primary Category"
              value={mainCategory}
              onChange={setMainCategory}
              suggestions={allMainCategories}
              placeholder="e.g. Housing"
            />
            <Typeahead
              label="Sub-Node"
              value={subCategory}
              onChange={setSubCategory}
              suggestions={currentSubCategories}
              placeholder="e.g. Rent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className={labelClass}>Vendor / Merchant</span>
              <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Amazon" className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
               <span className={labelClass}>Recurrence</span>
               <div className="relative">
                 <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={menuButtonClass}>
                    <option value="None">Once-off</option>
                    <option value="Weekly">Weekly Cycle</option>
                    <option value="Monthly">Monthly Cycle</option>
                    <option value="Yearly">Annual Cycle</option>
                 </select>
                 <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
               </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex justify-between items-center pr-1">
               <span className={labelClass}>Source Context</span>
               <button 
                 onClick={handleGenerateNote}
                 disabled={isGeneratingNote}
                 className="mb-1 text-indigo-500 active:scale-90 transition-transform disabled:opacity-50"
               >
                 {isGeneratingNote ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
               </button>
            </div>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="e.g. Monthly cloud subscription" 
              className={menuButtonClass} 
            />
          </div>
        </div>

        <div className="p-5 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-3">
            {isEditing && onDelete && (
              <button onClick={() => { triggerHaptic(); onDelete(initialData.id); }} className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl active:scale-90 transition-all border border-rose-500/10">
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!amount || !mainCategory}
              className="flex-1 py-4 bg-brand-primary text-brand-headerText font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-[10px] disabled:opacity-50"
            >
              <Check size={18} strokeWidth={4} /> {isEditing ? 'Update Entry' : 'Lock Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;
