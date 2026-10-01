import React from 'react';
import { FileText, Sparkles, ArrowRight } from 'lucide-react';

interface FloatingCTAProps {
  logCount: number;
  onOpenSummary: () => void;
}

export const FloatingCTA: React.FC<FloatingCTAProps> = ({ logCount, onOpenSummary }) => {
  return (
    <div
      id="floating-cta"
      className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent p-3 sm:p-5 pointer-events-none no-print"
    >
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <button
          id="btn-open-handover"
          onClick={onOpenSummary}
          className="w-full py-3 sm:py-3.5 px-3.5 sm:px-5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-2xl shadow-xl hover:shadow-2xl border border-sky-400/30 flex items-center justify-between gap-2.5 sm:gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <FileText className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight flex items-center gap-1.5 truncate">
                <span className="truncate">Generate Doctor&apos;s Slip</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 opacity-90 animate-pulse shrink-0" />
              </div>
              <div className="text-xs text-sky-100 font-medium hidden sm:block">
                Structured 30-second morning scan for rounding team
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-bold bg-white text-blue-800 font-mono-num shadow-xs shrink-0">
              <span className="hidden sm:inline">{logCount} {logCount === 1 ? 'note' : 'notes'} ready for rounds</span>
              <span className="sm:hidden">{logCount} {logCount === 1 ? 'note' : 'notes'}</span>
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
