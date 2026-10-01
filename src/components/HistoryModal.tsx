import { useState } from 'react';
import type React from 'react';
import {
  X,
  Archive,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import type { CareLogEntry, PatientInfo, DayArchive, Category } from '../types';
import { groupLogsByDay } from '../utils/history';
import { exportAllHistoryAsZip } from '../utils/export';
import { formatLogTime, renderHighlightedText } from '../utils/summary';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: CareLogEntry[];
  patientInfo: PatientInfo;
  onViewDaySlip: (day: DayArchive) => void;
  onDeleteDay: (dateKey: string) => void;
  onClearAll: () => void;
  onShowToast: (msg: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  logs,
  patientInfo,
  onViewDaySlip,
  onDeleteDay,
  onClearAll,
  onShowToast,
}) => {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [filterCatByDay, setFilterCatByDay] = useState<Record<string, Category | 'all'>>({});
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  if (!isOpen) return null;

  const dayArchives = groupLogsByDay(logs);

  const toggleExpand = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const handleExportZip = async () => {
    if (logs.length === 0) {
      onShowToast('No notes to export');
      return;
    }
    setIsExportingZip(true);
    try {
      await exportAllHistoryAsZip(logs, patientInfo);
      onShowToast('ZIP archive downloaded successfully!');
    } catch (err) {
      console.error('ZIP export error:', err);
      onShowToast('Failed to generate ZIP archive');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                Daily Bedside Archives
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono-num font-semibold">
                  {dayArchives.length} {dayArchives.length === 1 ? 'day' : 'days'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                100% on-device local storage • Latest records on top
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Toolbar */}
        {dayArchives.length > 0 && (
          <div className="px-4 py-2.5 bg-sky-50/70 border-b border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-600 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>{logs.length} total bedside observations</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all"
                title="Export all days as a .zip package (HTML slips + plain text + JSON)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingZip ? 'Packaging...' : 'Export All (ZIP)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content: Day Cards List (Newest on Top) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
          {dayArchives.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <p className="text-sm font-bold text-slate-700">No Bedside Archives Yet</p>
                <p className="text-xs text-slate-500">
                  Notes you log today and in coming days will automatically be grouped here by date.
                </p>
              </div>
            </div>
          ) : (
            dayArchives.map((day, idx) => {
              const isExpanded = expandedDates[day.dateKey] ?? (idx === 0); // Expand top (latest) by default
              const isConfirmingDelete = confirmDeleteDate === day.dateKey;
              const activeCategory = filterCatByDay[day.dateKey] || 'all';
              const displayedEntries = activeCategory === 'all'
                ? day.entries
                : day.entries.filter((e) => e.category === activeCategory);

              return (
                <div
                  key={day.dateKey}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Day Card Header */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                        <Calendar className="w-4 h-4 text-slate-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            {day.displayDate}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              day.relativeLabel === 'Today'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : day.relativeLabel === 'Yesterday'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {day.relativeLabel}
                          </span>
                        </div>

                        {/* Interactive Theme Filter Pills (Click each theme to filter notes) */}
                        <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterCatByDay((prev) => ({ ...prev, [day.dateKey]: 'all' }));
                              setExpandedDates((prev) => ({ ...prev, [day.dateKey]: true }));
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                              activeCategory === 'all'
                                ? 'bg-slate-800 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Show all notes for this day"
                          >
                            All ({day.stats.total})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = filterCatByDay[day.dateKey];
                              setFilterCatByDay((prev) => ({
                                ...prev,
                                [day.dateKey]: current === 'symptom' ? 'all' : 'symptom',
                              }));
                              setExpandedDates((prev) => ({ ...prev, [day.dateKey]: true }));
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                              activeCategory === 'symptom'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                            title="Click to view Vitals only"
                          >
                            <span>⚠️</span>
                            <span>{day.stats.symptoms}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = filterCatByDay[day.dateKey];
                              setFilterCatByDay((prev) => ({
                                ...prev,
                                [day.dateKey]: current === 'intake_output' ? 'all' : 'intake_output',
                              }));
                              setExpandedDates((prev) => ({ ...prev, [day.dateKey]: true }));
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                              activeCategory === 'intake_output'
                                ? 'bg-cyan-600 text-white shadow-2xs'
                                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200'
                            }`}
                            title="Click to view Intake & Output only"
                          >
                            <span>💧</span>
                            <span>{day.stats.intakeOutput}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = filterCatByDay[day.dateKey];
                              setFilterCatByDay((prev) => ({
                                ...prev,
                                [day.dateKey]: current === 'medication' ? 'all' : 'medication',
                              }));
                              setExpandedDates((prev) => ({ ...prev, [day.dateKey]: true }));
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                              activeCategory === 'medication'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                            title="Click to view Meds only"
                          >
                            <span>💊</span>
                            <span>{day.stats.medications}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = filterCatByDay[day.dateKey];
                              setFilterCatByDay((prev) => ({
                                ...prev,
                                [day.dateKey]: current === 'question' ? 'all' : 'question',
                              }));
                              setExpandedDates((prev) => ({ ...prev, [day.dateKey]: true }));
                            }}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                              activeCategory === 'question'
                                ? 'bg-violet-600 text-white shadow-2xs'
                                : 'bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200'
                            }`}
                            title="Click to view Questions only"
                          >
                            <span>❓</span>
                            <span>{day.stats.questions}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Day Action Buttons (Replaced printer icon with JPG image icon) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onViewDaySlip(day)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer active:scale-95 transition-colors"
                        title="View 30-Second CareSlip for this day"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Slip</span>
                      </button>

                      {/* Image Output Icon (No printer icon) */}
                      <button
                        type="button"
                        onClick={() => onViewDaySlip(day)}
                        className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-50 border border-sky-200 rounded-lg cursor-pointer active:scale-95 transition-colors"
                        title="Export JPG Image for this day"
                        aria-label="Export JPG for this day"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(day.dateKey)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                        title={isExpanded ? 'Collapse notes list' : 'Expand notes list'}
                        aria-label="Toggle Expand"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 pl-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDay(day.dateKey);
                              setConfirmDeleteDate(null);
                            }}
                            className="px-2 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDate(null)}
                            className="px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDate(day.dateKey)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete this day's notes"
                          aria-label="Delete Day"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Entries Drawer (Filtered by active theme) */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        <span>
                          {activeCategory === 'all'
                            ? `Timeline Observations (${displayedEntries.length})`
                            : `Filtered: ${activeCategory.toUpperCase()} (${displayedEntries.length})`}
                        </span>
                        {activeCategory !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setFilterCatByDay((prev) => ({ ...prev, [day.dateKey]: 'all' }))}
                            className="text-sky-600 hover:underline capitalize"
                          >
                            Clear filter
                          </button>
                        )}
                      </div>

                      {displayedEntries.length === 0 ? (
                        <p className="text-xs italic text-slate-400 py-2 text-center">
                          No {activeCategory} notes recorded on this day.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {displayedEntries.map((entry) => {
                            const { exactTime } = formatLogTime(entry.timestamp);
                            return (
                              <div
                                key={entry.id}
                                className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1 text-xs"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-mono-num font-semibold text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                                    {exactTime}
                                  </span>
                                  <span className="text-slate-800 break-words flex-1 leading-snug">
                                    {renderHighlightedText(entry.content)}
                                  </span>
                                </div>
                                {entry.doctorReply && (
                                  <div className="pl-2 py-1 bg-emerald-50/80 border-l-2 border-emerald-500 rounded-r text-[11px] text-emerald-950 flex items-start gap-1">
                                    <span className="font-bold text-emerald-800 shrink-0">🩺 Doctor's Reply:</span>
                                    <span className="font-medium text-slate-800 break-words">{entry.doctorReply}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer (Danger Zone & Close) */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {dayArchives.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 font-semibold cursor-pointer active:scale-95 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
