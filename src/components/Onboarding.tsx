import React from 'react';
import { UserSettings } from '../types';
import { ArrowRight, Wallet, Sparkles, ShieldCheck } from 'lucide-react';
import BrandedLogo from './BrandedLogo';

interface OnboardingProps {
  onComplete: (settings: Partial<UserSettings>) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const handleFinish = () => {
    onComplete({});
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white text-center transition-colors">
      <div className="w-full max-w-md animate-slide-up space-y-8">
        {/* Brand Icon */}
        <div className="relative inline-block">
          <div className="bg-brand-primary/10 dark:bg-white/10 p-6 rounded-[32px] w-28 h-28 mx-auto flex items-center justify-center text-brand-primary dark:text-white transition-colors">
            <BrandedLogo size="md" variant="gold" />
          </div>
          <div className="absolute -top-2 -right-2 bg-brand-accent text-white p-2 rounded-full shadow-lg">
            <Sparkles size={16} />
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-black mb-3 tracking-tight">Just Keep It</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-bold leading-tight max-w-[280px] mx-auto">
            Your premium AI companion for rule-based wealth tracking.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-6">
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Cloud Secured</h3>
                <p className="text-[11px] font-bold text-slate-400 leading-normal mt-0.5 uppercase tracking-tight">Automatic Google Drive backups keep your data private and safe.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">AI Powered</h3>
                <p className="text-[11px] font-bold text-slate-400 leading-normal mt-0.5 uppercase tracking-tight">Smart categorization handles the boring stuff for you instantly.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full bg-brand-primary text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
          >
            Get Started <ArrowRight size={20} />
          </button>
          
          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
            No complex setup • Just tracking
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;