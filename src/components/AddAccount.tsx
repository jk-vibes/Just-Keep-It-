import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WealthItem, WealthType, WealthCategory, UserSettings, Expense } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, Landmark, Trash2, Search, Hash, Plus, Minus, Calculator, TrendingUp, Upload, FileText, AlertTriangle, Loader2, Clock, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzeBankStatement } from '../services/geminiService';

interface AddAccountProps {
  settings: UserSettings;
  onSave: (item: Omit<WealthItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WealthItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: WealthItem | null;
  onAddStatementTransactions?: (accId: string, txs: Partial<Expense>[]) => void;
}

const ASSET_CATEGORIES = ['Savings', 'Pension', 'Gold', 'Investment', 'Cash', 'Other'];
const LIABILITY_CATEGORIES = ['Credit Card', 'Personal Loan', 'Home Loan', 'Overdraft', 'Gold Loan', 'Other'];

const MiniCalculator: React.FC<{ 
  value: string; 
  onChange: (val: string) => void;
  currencySymbol: string;
}> = ({ value, onChange, currencySymbol }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calcValue, setCalcValue] = useState('');
  
  const handleAdd = () => {
    const current = parseFloat(value) || 0;
    const add = parseFloat(calcValue) || 0;
    onChange((current + add).toString());
    setCalcValue('');
    setIsOpen(false);
    triggerHaptic(10);
  };

  const handleSubtract = () => {
    const current = parseFloat(value) || 0;
    const sub = parseFloat(calcValue) || 0;
    onChange((current - sub).toString());
    setCalcValue('');
    setIsOpen(false);
    triggerHaptic(10);
  };

  if (!isOpen) {
    return (
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-brand-accent hover:bg-brand-primary/10 rounded-lg text-slate-400 hover:text-brand-primary transition-all"
        title="Quick Calculator"
      >
        <Calculator size={12} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-brand-surface border border-brand-border p-1 rounded-xl shadow-lg animate-in fade-in zoom-in duration-200">
      <input 
        type="number" 
        value={calcValue}
        onChange={(e) => setCalcValue(e.target.value)}
        placeholder="Amount"
        className="w-16 bg-brand-accent p-1 rounded-lg text-[10px] font-bold outline-none border border-brand-border text-brand-text"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setIsOpen(false);
        }}
      />
      <button type="button" onClick={handleAdd} className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"><Plus size={10} /></button>
      <button type="button" onClick={handleSubtract} className="p-1 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-colors"><Minus size={10} /></button>
      <button type="button" onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-brand-text transition-colors"><X size={10} /></button>
    </div>
  );
};

const Typeahead: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  canCreate?: boolean;
}> = ({ label, value, onChange, suggestions, placeholder, canCreate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q));
  }, [suggestions, value]);

  const exactMatch = useMemo(() => {
    return suggestions.some(s => s.toLowerCase() === value.toLowerCase().trim());
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
  const inputClass = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none transition-all focus:border-brand-primary/30 truncate shadow-inner";

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
          <Search size={10} />
        </div>
      </div>
      
      {isOpen && (filtered.length > 0 || (canCreate && value.trim() && !exactMatch)) && (
        <div className="absolute z-[300] left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto no-scrollbar animate-slide-up">
          {canCreate && value.trim() && !exactMatch && (
            <button
              onClick={() => { onChange(value); setIsOpen(false); triggerHaptic(20); }}
              className="w-full px-3 py-2 text-left text-[10px] font-black transition-colors border-b border-brand-border bg-indigo-500/10 text-indigo-400 flex items-center gap-2"
            >
              <Plus size={10} strokeWidth={4} /> Register "{value}"
            </button>
          )}
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

const AddAccount: React.FC<AddAccountProps> = ({ settings, onSave, onUpdate, onDelete, onCancel, initialData, onAddStatementTransactions }) => {
  const isEditing = !!(initialData && initialData.id);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'upload'>('details');
  const [type, setType] = useState<WealthType>(initialData?.type || 'Investment');
  // ... rest of state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ transactions: any[], hiddenCharges: any[], summary: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const historyData = useMemo(() => {
    if (!initialData?.history) return [];
    return initialData.history.map(h => ({
      ...h,
      formattedDate: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [initialData?.history]);
  const [categoryText, setCategoryText] = useState<string>(initialData?.category || '');
  const [groupName, setGroupName] = useState(initialData?.group || '');
  const [name, setName] = useState(initialData?.name || '');
  const [alias, setAlias] = useState(initialData?.alias || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [value, setValue] = useState(initialData ? initialData.value.toString() : '0');
  const [limit, setLimit] = useState(initialData?.limit ? Math.round(initialData.limit).toString() : '0');
  const [emiAmount, setEmiAmount] = useState(initialData?.emiAmount ? Math.round(initialData.emiAmount).toString() : '0');
  const [maturityDate, setMaturityDate] = useState(initialData?.maturityDate || '');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    triggerHaptic(20);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        try {
          const result = await analyzeBankStatement(base64, file.type, settings.currency);
          setAnalysisResult(result);
          setIsAnalyzing(false);
          triggerHaptic(50);
        } catch (err) {
          console.error(err);
          alert("Failed to analyze statement. Please try again.");
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  const handleImportTransactions = () => {
    if (!analysisResult || !initialData?.id || !onAddStatementTransactions) return;
    onAddStatementTransactions(initialData.id, analysisResult.transactions);
    setAnalysisResult(null);
    setActiveTab('details');
  };

  const handleSubmit = () => {
    const cleanName = (name || '').trim();
    const cleanCategory = (categoryText || '').trim();
    
    if (!cleanName || !cleanCategory) return;

    triggerHaptic(20);
    
    const parsedValue = Math.round(parseFloat(value) || 0);
    const parsedLimit = Math.round(parseFloat(limit) || 0);
    const parsedEmi = Math.round(parseFloat(emiAmount) || 0);

    const payload: Omit<WealthItem, 'id'> = {
      type, 
      category: cleanCategory as WealthCategory, 
      group: (groupName || '').trim() || cleanCategory, 
      name: cleanName, 
      alias: (alias || '').trim(),
      accountNumber: (accountNumber || '').trim(),
      value: parsedValue,
      date: new Date().toISOString(),
      limit: cleanCategory === 'Credit Card' ? parsedLimit : undefined,
      emiAmount: type === 'Liability' ? parsedEmi : undefined,
      maturityDate: type === 'Liability' ? maturityDate : undefined,
    };

    if (isEditing && onUpdate && initialData?.id) {
      onUpdate(initialData.id, payload);
    } else {
      onSave(payload);
    }
    onCancel();
  };

  const handleDelete = () => {
    if (!isEditing || !onDelete || !initialData?.id) return;
    if (window.confirm('Delete this account?')) {
      triggerHaptic(30);
      onDelete(initialData.id);
      onCancel();
    }
  };

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black border border-brand-border text-brand-text appearance-none transition-all outline-none focus:ring-1 focus:ring-brand-primary/20 truncate shadow-inner";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        
        {/* DESIGNER GRADIENT HEADER */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 flex justify-between items-center shrink-0 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg shadow-inner">
              <Landmark size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{isEditing ? 'Account Details' : 'Add Account'}</h3>
              <p className="text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Registry Point</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/5"><X size={16} strokeWidth={3} /></button>
        </div>

        {isEditing && (
          <div className="flex border-b border-brand-border bg-brand-surface shrink-0">
            <button 
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-400'}`}
            >
              Details
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-400'}`}
            >
              History
            </button>
            <button 
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-400'}`}
            >
              Statement
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-8">
          {activeTab === 'details' ? (
            <>
              {/* LEFT-ALIGNED AMOUNT FIELD */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={labelClass}>{type === 'Liability' ? 'Outstanding Amount' : 'Current Balance'}</span>
                  <MiniCalculator value={value} onChange={setValue} currencySymbol={currencySymbol} />
                </div>
                <div className="flex items-center gap-3 bg-brand-accent p-3 rounded-[22px] border border-brand-border shadow-inner group">
                  <div className="flex items-baseline gap-1 w-full">
                    <span className="text-sm font-black text-slate-400 group-focus-within:text-brand-primary transition-colors">{currencySymbol}</span>
                    <input
                      autoFocus={!isEditing}
                      type="number"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0"
                      className="w-full text-2xl font-black border-none outline-none focus:ring-0 bg-transparent text-brand-text tracking-tighter"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-0.5">
                    <span className={labelClass}>Account Type</span>
                    <select value={type} onChange={(e) => { const nt = e.target.value as WealthType; setType(nt); }} className={selectClasses}>
                        <option value="Investment">Asset</option>
                        <option value="Liability">Liability</option>
                    </select>
                 </div>
                 <Typeahead
                    label="Classification"
                    value={categoryText}
                    onChange={(val) => {
                      const oldVal = categoryText;
                      setCategoryText(val);
                      if (!groupName || groupName === oldVal) setGroupName(val);
                    }}
                    suggestions={type === 'Investment' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES}
                    placeholder="e.g. Savings"
                    canCreate={true}
                 />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <span className={labelClass}>Portfolio / Group</span>
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Retirement" className={selectClasses} />
                </div>
                <div className="space-y-0.5">
                  <span className={labelClass}>Display Alias</span>
                  <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. My Main Bank" className={selectClasses} />
                </div>
              </div>

              <div className="space-y-0.5">
                <span className={labelClass}>Account Name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AMEX Platinum" className={selectClasses} />
              </div>

              <div className="space-y-0.5">
                <span className={labelClass}>Account Number / ID</span>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={accountNumber} 
                    onChange={(e) => setAccountNumber(e.target.value)} 
                    placeholder="e.g. 1234 XXXX 5678" 
                    className={selectClasses} 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 opacity-40 group-focus-within:text-brand-primary transition-colors">
                    <Hash size={12} />
                  </div>
                </div>
              </div>

              {categoryText === 'Credit Card' && (
                <div className="space-y-0.5 animate-kick">
                  <div className="flex justify-between items-center">
                    <span className={labelClass}>Credit Limit</span>
                    <MiniCalculator value={limit} onChange={setLimit} currencySymbol={currencySymbol} />
                  </div>
                  <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" className={selectClasses} />
                </div>
              )}

              {type === 'Liability' && categoryText !== 'Credit Card' && (
                <div className="grid grid-cols-2 gap-3 animate-kick">
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className={labelClass}>EMI Amount</span>
                      <MiniCalculator value={emiAmount} onChange={setEmiAmount} currencySymbol={currencySymbol} />
                    </div>
                    <input type="number" value={emiAmount} onChange={(e) => setEmiAmount(e.target.value)} placeholder="0" className={selectClasses} />
                  </div>
                  <div className="space-y-0.5">
                    <span className={labelClass}>Maturity Date</span>
                    <input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} className={selectClasses} />
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'history' ? (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">Balance Trend</span>
              </div>
              
              {historyData.length > 0 ? (
                <div className="h-48 w-full bg-brand-accent/30 rounded-2xl p-2 border border-brand-border">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="formattedDate" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} 
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '12px', fontSize: '10px' }}
                        formatter={(val: number) => [`${currencySymbol}${val.toLocaleString()}`, 'Balance']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--brand-primary)" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2 bg-brand-accent/20 rounded-2xl border border-dashed border-brand-border">
                  <Clock size={24} className="opacity-20" />
                  <p className="text-[9px] font-bold uppercase tracking-widest">No history recorded yet</p>
                </div>
              )}

              <div className="space-y-2">
                <span className={labelClass}>Recent Snapshots</span>
                <div className="space-y-1">
                  {[...historyData].reverse().slice(0, 5).map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-brand-accent rounded-xl border border-brand-border">
                      <span className="text-[9px] font-bold text-slate-500">{new Date(h.date).toLocaleString()}</span>
                      <span className="text-[10px] font-black text-brand-text">{currencySymbol}{h.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <Upload size={14} className="text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">Bank Statement Analysis</span>
              </div>

              {!analysisResult ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${isAnalyzing ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border hover:border-brand-primary/50 bg-brand-accent/20'}`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={32} className="text-brand-primary animate-spin" />
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">AI is analyzing...</p>
                        <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Identifying hidden charges & transactions</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-brand-primary/10 rounded-full text-brand-primary">
                        <FileText size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text">Upload Bank Statement</p>
                        <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-widest">PDF, PNG, or JPG supported</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={12} className="text-indigo-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Auditor Summary</span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {analysisResult.hiddenCharges.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-rose-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Hidden Charges Detected</span>
                      </div>
                      <div className="space-y-1">
                        {analysisResult.hiddenCharges.map((c, i) => (
                          <div key={i} className="p-2 bg-rose-500/5 rounded-xl border border-rose-500/10 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-rose-500 uppercase">{c.merchant}</span>
                              <span className="text-[10px] font-black text-rose-500">{currencySymbol}{c.amount.toLocaleString()}</span>
                            </div>
                            <p className="text-[7px] font-bold text-rose-400/80 uppercase tracking-tight">{c.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className={labelClass}>Extracted Transactions ({analysisResult.transactions.length})</span>
                    <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1 pr-1">
                      {analysisResult.transactions.map((t, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-brand-accent rounded-xl border border-brand-border">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-brand-text truncate max-w-[120px]">{t.merchant}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">{t.date} • {t.subCategory}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-brand-text">{currencySymbol}{t.amount.toLocaleString()}</span>
                            <span className={`text-[6px] font-black uppercase px-1 rounded ${t.isHiddenCharge ? 'bg-rose-500/10 text-rose-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                              {t.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setAnalysisResult(null)}
                      className="flex-1 py-2.5 bg-brand-accent text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleImportTransactions}
                      className="flex-[2] py-2.5 bg-indigo-500 text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={14} strokeWidth={3} /> Import to Ledger
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-2">
             {isEditing && onDelete && activeTab === 'details' && (
               <button onClick={handleDelete} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                  <Trash2 size={18} />
               </button>
             )}
             {activeTab === 'details' && (
               <button onClick={handleSubmit} disabled={!name.trim() || !categoryText.trim()} className="flex-1 py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-[10px] disabled:opacity-50">
                 <Check size={16} strokeWidth={4} /> Save Account
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccount;