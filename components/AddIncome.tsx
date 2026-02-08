import React, { useState } from 'react';
import { Income, UserSettings, WealthItem, PaymentMethod, IncomeType } from '../types';
import { getCurrencySymbol } from '../constants';
import { X, Check, Landmark, ChevronDown, Trash2, Banknote, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { parseTransactionText } from '../services/geminiService';

interface AddIncomeProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (income: Omit<Income, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<Income>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: Income | null;
}

const AddIncome: React.FC<AddIncomeProps> = ({ settings, wealthItems, onAdd, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => i.type === 'Investment' && ['Savings', 'Cash'].includes(i.category));

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<IncomeType>(initialData?.type || 'Salary');
  const [note, setNote] = useState(initialData?.note || '');
  const [targetAccountId, setTargetAccountId] = useState(initialData?.targetAccountId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'Net Banking');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const payload = {
      amount: Math.round(parseFloat(amount)),
      date,
      type,
      note,
      paymentMethod,
      targetAccountId
    };

    if (isEditing && onUpdate && initialData) onUpdate(initialData.id, payload);
    else onAdd(payload);
    onCancel();
  };

  const handleAiCapture = async () => {
    const prompt = window.prompt("Enter inflow details (e.g. 50000 salary from Google today):");
    if (!prompt || isAiProcessing) return;
    triggerHaptic(50);
    setIsAiProcessing(true);
    try {
      const result = await parseTransactionText(prompt, settings.currency);
      if (result && result.entryType === 'Income') {
        setAmount(result.amount.toString());
        setType(result.incomeType as IncomeType || 'Salary');
        setDate(result.date);
        setNote(prompt);
        triggerHaptic(40);
      }
    } catch (e) {
      alert("AI failed to parse the inflow signal.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const menuButtonClass = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate text-left shadow-inner";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        
        {/* DESIGNER GRADIENT HEADER - Standardized Style */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 flex justify-between items-center shrink-0 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg shadow-inner">
              <Banknote size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{isEditing ? 'Modify Inflow' : 'Record Inflow'}</h3>
              <p className="text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Capital Registry</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/5"><X size={16} strokeWidth={3} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-8">
          
          {/* LEFT-ALIGNED AMOUNT FIELD */}
          <div className="space-y-1.5">
            <span className={labelClass}>Credit Amount</span>
            <div className="flex items-center gap-3 bg-brand-accent p-3 rounded-[22px] border border-brand-border shadow-inner group">
              <div className="flex items-baseline gap-1 flex-1">
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
                onClick={() => { triggerHaptic(); handleAiCapture(); }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 bg-brand-surface text-brand-primary border border-brand-border"
              >
                {isAiProcessing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} strokeWidth={2.5} />}
                <span className="text-[8px] font-black uppercase tracking-widest">Neural</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className={labelClass}>Registry Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={menuButtonClass} />
            </div>
            <div className="space-y-0.5">
              <span className={labelClass}>Source Classification</span>
              <div className="relative">
                <select value={type} onChange={(e) => setType(e.target.value as IncomeType)} className={menuButtonClass}>
                    <option value="Salary">Primary Salary</option>
                    <option value="Freelance">Gig Inflow</option>
                    <option value="Investment">Asset Yield</option>
                    <option value="Gift">Personal Gift</option>
                    <option value="Other">Miscellaneous</option>
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className={labelClass}>Vault Destination</span>
            <div className="relative">
              <select value={targetAccountId} onChange={(e) => setTargetAccountId(e.target.value)} className={menuButtonClass}>
                <option value="">None Bound</option>
                {liquidAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="space-y-0.5">
            <span className={labelClass}>Source Context / Notes</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bonus for Project Alpha" className={menuButtonClass} />
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
              disabled={!amount}
              className="flex-1 py-4 bg-brand-primary text-brand-headerText font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-[10px] disabled:opacity-50"
            >
              <Check size={18} strokeWidth={4} /> {isEditing ? 'Update Entry' : 'Confirm Inflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddIncome;