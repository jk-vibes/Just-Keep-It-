import React, { useState, useMemo, useEffect } from 'react';
import { Category, BudgetRule, UserSettings } from '../types';
import { X, Check, Zap, ChevronDown, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddRuleProps {
  settings: UserSettings;
  onAdd: (rule: Omit<BudgetRule, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<BudgetRule>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: BudgetRule | null;
}

const AddRule: React.FC<AddRuleProps> = ({ settings, onAdd, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const [keyword, setKeyword] = useState(initialData?.keyword || '');
  const [bucket, setBucket] = useState<Category>(initialData?.category || 'Needs');
  const [mainCategory, setMainCategory] = useState(initialData?.mainCategory || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || 'General');
  const [applyToAll, setApplyToAll] = useState(false);

  // Filter main categories based on selected bucket
  const mainCategoriesInBucket = useMemo(() => {
    if (!settings.customCategories) return [];
    return Object.keys(settings.customCategories[bucket] || {}).sort();
  }, [settings.customCategories, bucket]);

  const subCategoriesInCat = useMemo(() => {
    if (!settings.customCategories) return ['General'];
    return settings.customCategories[bucket]?.[mainCategory] || ['General'];
  }, [bucket, mainCategory, settings.customCategories]);

  useEffect(() => {
    if (!mainCategory || !mainCategoriesInBucket.includes(mainCategory)) {
      setMainCategory(mainCategoriesInBucket[0] || '');
    }
  }, [mainCategoriesInBucket, mainCategory]);

  useEffect(() => {
    if (!subCategory || !subCategoriesInCat.includes(subCategory)) {
        setSubCategory(subCategoriesInCat[0] || 'General');
    }
  }, [mainCategory, subCategoriesInCat, subCategory]);

  const handleSubmit = () => {
    if (!keyword.trim() || !mainCategory) return;
    triggerHaptic(20);
    const payload = { 
      keyword: keyword.trim(), 
      category: bucket, 
      mainCategory, 
      subCategory,
      isManual: true
    };
    
    // We pass applyToAll as metadata if needed, but the onAdd/onUpdate usually just take the rule.
    // I'll adjust the props to handle applyToAll.
    if (isEditing && onUpdate && initialData) {
      onUpdate(initialData.id, { ...payload, applyToAll } as any);
    } else {
      onAdd({ ...payload, applyToAll } as any);
    }
    onCancel();
  };

  const selectClasses = "w-full bg-brand-accent p-2.5 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate shadow-inner text-left";
  const labelClass = "text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        
        {/* DESIGNER GRADIENT HEADER */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-2.5 flex justify-between items-center shrink-0 shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg shadow-inner">
              <Zap size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{isEditing ? 'Modify Rule' : 'Add Rule'}</h3>
              <p className="text-[6px] font-black text-white/50 uppercase tracking-[0.2em] mt-0.5">Automation Protocol</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 border border-white/5"><X size={16} strokeWidth={3} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-8">
          <div className="space-y-0.5">
            <span className={labelClass}>Detection Keyword</span>
            <input 
              autoFocus={!isEditing}
              type="text" 
              value={keyword} 
              onChange={(e) => setKeyword(e.target.value)} 
              placeholder="e.g. Zomato, Uber, Netflix" 
              className={selectClasses} 
            />
            <p className="text-[6px] font-bold text-slate-500 uppercase tracking-widest ml-1 mt-1">Registry will auto-sort items matching this pattern.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-0.5">
              <span className={labelClass}>Bucket</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map(b => (
                  <button
                    key={b}
                    onClick={() => { triggerHaptic(); setBucket(b); }}
                    className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all ${
                      bucket === b 
                        ? 'bg-brand-primary text-white border-brand-primary shadow-md' 
                        : 'bg-brand-accent text-slate-500 border-brand-border opacity-60'
                    }`}
                  >
                    {b === 'Savings' ? 'Saves' : b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <span className={labelClass}>Category</span>
                <div className="relative">
                  <select value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} className={selectClasses}>
                    {mainCategoriesInBucket.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                  <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => { triggerHaptic(); setApplyToAll(!applyToAll); }}
                className="flex items-center gap-2 group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${applyToAll ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-accent border-brand-border'}`}>
                  {applyToAll && <Check size={10} strokeWidth={4} />}
                </div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover:text-brand-text transition-colors">Apply to all existing records</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-brand-border bg-brand-surface shrink-0">
          <div className="flex gap-3">
            {isEditing && onDelete && (
              <button onClick={() => { triggerHaptic(); onDelete(initialData!.id); }} className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl active:scale-90 transition-all border border-rose-500/10">
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={handleSubmit} 
              disabled={!keyword.trim()} 
              className="flex-1 py-4 bg-brand-primary text-brand-headerText font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-[10px] disabled:opacity-50"
            >
              <Check size={18} strokeWidth={4} /> {isEditing ? 'Update Rule' : 'Authorize Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRule;