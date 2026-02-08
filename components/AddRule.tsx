import React, { useState, useMemo } from 'react';
import { Category, BudgetRule, UserSettings } from '../types';
import { X, Check, Zap, ChevronDown, Workflow } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddRuleProps {
  settings: UserSettings;
  onAdd: (rule: Omit<BudgetRule, 'id'>) => void;
  onCancel: () => void;
}

const AddRule: React.FC<AddRuleProps> = ({ settings, onAdd, onCancel }) => {
  const [keyword, setKeyword] = useState('');
  const [bucket, setBucket] = useState<Category>('Needs');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('General');

  const categoryTree = settings.customCategories || {} as any;
  const categoriesInBucket = useMemo(() => Object.keys(categoryTree[bucket] || {}), [bucket, categoryTree]);
  const subCategoriesInCat = useMemo(() => categoryTree[bucket]?.[mainCategory] || ['General'], [bucket, mainCategory, categoryTree]);

  useMemo(() => {
    if (!mainCategory || !categoriesInBucket.includes(mainCategory)) {
        setMainCategory(categoriesInBucket[0] || '');
    }
  }, [bucket, categoriesInBucket, mainCategory]);

  useMemo(() => {
    if (!subCategory || !subCategoriesInCat.includes(subCategory)) {
        setSubCategory(subCategoriesInCat[0] || 'General');
    }
  }, [mainCategory, subCategoriesInCat, subCategory]);

  const handleSubmit = () => {
    if (!keyword.trim()) return;
    triggerHaptic(20);
    onAdd({ 
      keyword: keyword.trim(), 
      category: bucket, 
      mainCategory, 
      subCategory 
    });
  };

  const selectClasses = "w-full bg-brand-accent p-2 rounded-xl text-[10px] font-black outline-none border border-brand-border text-brand-text appearance-none cursor-pointer focus:border-brand-primary/30 transition-all truncate";
  const labelClass = "text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-brand-surface w-full max-w-sm rounded-[28px] shadow-2xl flex flex-col border border-brand-border overflow-hidden animate-slide-up max-h-[90vh]">
        <div className="flex justify-between items-center px-4 py-2 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-md">
              <Zap size={14} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-text">Add Logic Node</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-8">
          <div className="space-y-0.5">
            <span className={labelClass}>Detection Keyword</span>
            <input 
              autoFocus
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
              <span className={labelClass}>Target Bucket</span>
              <div className="flex bg-brand-accent p-1 rounded-xl gap-1 border border-brand-border">
                {(['Needs', 'Wants', 'Savings', 'Avoids'] as Category[]).map(b => (
                  <button 
                    key={b}
                    onClick={() => { triggerHaptic(); setBucket(b); }}
                    className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${bucket === b ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-slate-500'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className={labelClass}>Category</span>
                <div className="relative">
                  <select value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} className={selectClasses}>
                    {categoriesInBucket.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
        </div>

        <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
          <button 
            onClick={handleSubmit} 
            disabled={!keyword.trim()} 
            className="w-full py-3 bg-brand-primary text-brand-headerText font-black rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
          >
            <Check size={16} strokeWidth={4} /> Authorize Logic Node
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRule;