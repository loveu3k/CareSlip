import React, { useState } from 'react';
import { ShieldCheck, Trash2, User, AlertCircle, Sparkles, ChevronDown, ChevronUp, Archive } from 'lucide-react';
import type { PatientInfo } from '../types';

interface HeaderProps {
  patientInfo: PatientInfo;
  onOpenPatientModal: () => void;
  onOpenClearModal: () => void;
  onOpenHistoryModal: () => void;
  onLoadSampleData: () => void;
  hasLogs: boolean;
  historyDaysCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  patientInfo,
  onOpenPatientModal,
  onOpenClearModal,
  onOpenHistoryModal,
  onLoadSampleData,
  hasLogs,
  historyDaysCount,
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <header className="app-chrome bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with App Brand & Offline Privacy Badge */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2">
            {/* Modern Unified Startup Wordmark: Clinical Black & Medical Green */}
            <div className="flex items-center select-none">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-slate-950 font-sans">
                Care<span className="text-emerald-600">Slip</span>
              </span>
            </div>

            {/* Privacy Pill */}
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden xs:inline">On-Device Only</span>
              <span className="xs:hidden">Private</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">
            The 30-second bedside handover for doctors
          </p>
          <p className="text-[11px] text-slate-500 font-medium sm:hidden truncate max-w-[170px] leading-tight mt-0.5">
            {patientInfo.patientName ? `Patient: ${patientInfo.patientName}` : 'Bedside Care Log'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!hasLogs && (
            <button
              onClick={onLoadSampleData}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Load 24h sample data to test"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Load Sample Data</span>
              <span className="sm:hidden">Sample</span>
            </button>
          )}

          {/* Archives / Daily History Button */}
          <button
            onClick={onOpenHistoryModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95"
            title="View Daily Bedside Archives"
            aria-label="View Daily Bedside Archives"
          >
            <Archive className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline font-semibold">Archives</span>
            {historyDaysCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-600 text-white font-mono-num leading-none">
                {historyDaysCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenPatientModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95"
            title="Edit Patient / Room & Bed Information"
          >
            <User className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline max-w-[110px] truncate font-semibold">
              {patientInfo.roomBed || 'Room & Bed'}
            </span>
          </button>

          <button
            onClick={onOpenClearModal}
            className="inline-flex items-center gap-1 p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer active:scale-95"
            title="Reset Notes"
            aria-label="Reset Notes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Patient & Room Info strip + Collapsible Medical Disclaimer */}
      <div className="hidden sm:block bg-slate-50 border-t border-slate-200/80 px-4 py-1.5 text-xs text-slate-600">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span className="font-semibold text-slate-800">
              {patientInfo.patientName ? `Patient: ${patientInfo.patientName}` : 'Patient Bedside Notes'}
            </span>
            {patientInfo.roomBed && (
              <span className="text-slate-400">| {patientInfo.roomBed}</span>
            )}
          </div>

          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Disclaimer</span>
            {showDisclaimer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showDisclaimer && (
          <div className="max-w-3xl mx-auto mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-start gap-2 bg-amber-50/80 p-2.5 rounded-md border border-amber-200/60">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>CareSlip is a personal bedside notepad for caregivers.</strong> It does not store medical records on any server and does not provide clinical diagnosis, medical evaluation, or treatment advice.
            </p>
          </div>
        )}
      </div>
    </header>
  );
};
