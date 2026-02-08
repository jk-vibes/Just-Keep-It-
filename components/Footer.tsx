import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto pt-4 pb-12 px-2 animate-kick self-start">
      <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-default">
        {/* The Red Line */}
        <div className="w-6 h-[1.5px] bg-[#e11d48] rounded-full"></div>
        
        <div className="flex flex-col items-start">
          <p className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none">
            Powered by <span className="text-[#e11d48]">JK</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;