import React, { useState, useMemo } from 'react';
import { Category, UserSettings } from '../types';
import { X, Plus, ChevronRight, Layers, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { CATEGORY_COLORS } from '../constants';

interface CategoryManagerProps {
  settings: UserSettings;
  onUpdateCustomCategories: (categories: Record<Category, Record<string, string[]>>) => void;
  onClose: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ settings, onUpdateCustomCategories, onClose }) => {
  const [newCatName, setNewCatName] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<Category>('Needs');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const flatCategories = useMemo(() => {
    const list: { name: string; bucket: Category; subCategories: string[] }[] = [];
    if (!settings.customCategories) return list;
    
    Object.entries(settings.customCategories).forEach(([bucket, cats]) => {
      Object.entries(cats).forEach(([catName, subs]) => {
        list.push({ name: catName, bucket: bucket as Category, subCategories: subs });
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [settings.customCategories]);

  const handleAddCategory = () => {
    if (!newCatName) return;
    triggerHaptic();
    const updated = { ...settings.customCategories } as any;
    if (!updated[selectedBucket]) updated[selectedBucket] = {};
    if (!updated[selectedBucket][newCatName]) {
      updated[selectedBucket][newCatName] = ['General'];
      onUpdateCustomCategories(updated);
      setNewCatName('');
    }
  };

  const handleDeleteCategory = (bucket: Category, catName: string) => {
    triggerHaptic(40);
    const updated = { ...settings.customCategories } as any;
    delete updated[bucket][catName];
    onUpdateCustomCategories(updated);
    if (activeCategory === catName) setActiveCategory(null);
  };

  const handleAddSubCategory = (bucket: Category, catName: string) => {
    if (!newSubCatName) return;
    triggerHaptic();
    const updated = { ...settings.customCategories } as any;
    if (!updated[bucket][catName].includes(newSubCatName)) {
      updated[bucket][catName].push(newSubCatName);
      onUpdateCustomCategories(updated);
      setNewSubCatName('');
    }
  };

  const handleDeleteSubCategory = (bucket: Category, catName: string, subName: string) => {
    triggerHaptic(30);
    const updated = { ...settings.customCategories } as any;
    updated[bucket][catName] = updated[bucket][catName].filter((s: string) => s !== subName);
    onUpdateCustomCategories(updated);
  };

  return (
    <div className="fixed inset-0 top-[60px] z-[300] bg-black/60 backdrop-blur-sm flex items-start justify-center p-2">
      <div className="bg-brand-surface w-full max-w-lg rounded-[32px] border border-brand-border shadow-2xl flex flex-col max-h-[80vh] animate-slide-up overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center shrink-0">
           <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-text">Category Master</h3>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Registry Management</p>
           </div>
           <button onClick={onClose} className="p-2 bg-brand-accent rounded-full text-slate-400 active:scale-90"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
           <div className="bg-brand-accent/30 p-4 rounded-2xl border border-brand-border space-y-3">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Create New Classification</p>
              
              {/* RESTORED BUCKET SELECTION */}
              <div className="flex bg-brand-accent/40 p-1 rounded-xl gap-1 border border-white/5">
                {(['Needs', 'Wants', 'Savings', 'Avoids'] as Category[]).map(b => (
                  <button 
                    key={b}
                    onClick={() => { triggerHaptic(); setSelectedBucket(b); }}
                    className={`flex-1 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${selectedBucket === b ? 'bg-brand-primary text-brand-headerText shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                  <input 
                    value={newCatName} 
                    onChange={(e) => setNewCatName(e.target.value)} 
                    placeholder="Category Name (e.g. Wellness)" 
                    className="flex-1 bg-brand-surface border border-brand-border px-4 py-3 rounded-xl text-[10px] font-black outline-none focus:border-brand-primary/30" 
                  />
                  <button onClick={handleAddCategory} className="bg-brand-primary text-brand-headerText px-4 rounded-xl active:scale-95 transition-all">
                    <Plus size={18} strokeWidth={3} />
                  </button>
              </div>
           </div>

           <div className="divide-y divide-brand-border border border-brand-border rounded-2xl overflow-hidden bg-brand-accent/10">
              {flatCategories.map(item => (
                <div key={`${item.bucket}-${item.name}`} className="animate-kick">
                   <div className="flex items-center justify-between p-3 group">
                      <button onClick={() => setActiveCategory(activeCategory === item.name ? null : item.name)} className="flex items-center gap-3 flex-1 text-left">
                         <div className="p-1.5 rounded-lg bg-opacity-10 shrink-0" style={{ backgroundColor: `${CATEGORY_COLORS[item.bucket]}20`, color: CATEGORY_COLORS[item.bucket] }}>
                            <Layers size={14} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase text-brand-text">{item.name}</span>
                            <span className="text-[6px] font-bold text-slate-500 uppercase tracking-widest">{item.bucket} • {item.subCategories.length} Nodes</span>
                         </div>
                      </button>
                      <div className="flex items-center gap-1">
                         <button onClick={() => handleDeleteCategory(item.bucket, item.name)} className="p-2 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                         <ChevronRight size={16} className={`text-slate-600 transition-transform ${activeCategory === item.name ? 'rotate-90' : ''}`} />
                      </div>
                   </div>

                   {activeCategory === item.name && (
                     <div className="bg-brand-surface/40 p-4 border-t border-brand-border space-y-3">
                        <div className="flex gap-2">
                           <input value={newSubCatName} onChange={(e) => setNewSubCatName(e.target.value)} placeholder="Add Sub-Category..." className="flex-1 bg-brand-surface border border-brand-border px-3 py-2 rounded-lg text-[9px] font-black outline-none" />
                           <button onClick={() => handleAddSubCategory(item.bucket, item.name)} className="bg-brand-accent text-brand-text px-3 rounded-lg"><Plus size={14} /></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {item.subCategories.map(sub => (
                             <div key={sub} className="flex items-center gap-2 bg-brand-accent border border-brand-border pl-2 pr-1 py-1 rounded-md">
                                <span className="text-[8px] font-black uppercase text-slate-400">{sub}</span>
                                <button onClick={() => handleDeleteSubCategory(item.bucket, item.name, sub)} className="p-1 hover:text-rose-500 transition-colors"><X size={10} /></button>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;