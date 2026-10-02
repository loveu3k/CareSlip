import { useState, useRef, useEffect, useMemo } from 'react';
import type React from 'react';
import {
  X,
  Copy,
  Maximize2,
  Minimize2,
  CheckCircle2,
  User,
  Clock,
  Image as ImageIcon,
  Download,
  Stethoscope,
  Plus,
  Check,
  Edit2,
  Calendar,
  Printer,
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import type { HandoverSummary, PatientInfo, CareLogEntry, Category } from '../types';
import { renderHighlightedText, generateMarkdownExport, formatLogTime, compileHandoverSummaryForEntries } from '../utils/summary';
import { getLocalDateKey, groupEntriesByDay, formatDateHeader } from '../utils/history';

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: HandoverSummary;
  patientInfo: PatientInfo;
  onShowToast: (msg: string) => void;
  customTitle?: string;
  customSubtitle?: string;
  onSaveDoctorReply?: (id: string, reply: string) => void;
  onToggleQuestionAnswered?: (id: string) => void;
  entries?: CareLogEntry[];
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  isOpen,
  onClose,
  summary,
  patientInfo,
  onShowToast,
  customTitle,
  customSubtitle,
  onSaveDoctorReply,
  onToggleQuestionAnswered,
  entries,
}) => {
  const [isFlashMode, setIsFlashMode] = useState(false);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);
  const [previewJpgUrl, setPreviewJpgUrl] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Category | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState('');
  const slipRef = useRef<HTMLDivElement>(null);

  // Always reset scroll to the very top and reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      if (slipRef.current) {
        slipRef.current.scrollTop = 0;
      }
      setSelectedTheme('all');
      setSelectedDate('all');
      setEditingReplyId(null);
      setEditingReplyText('');
    }
  }, [isOpen]);

  // Collect all base entries for this handover view
  const baseEntries = useMemo(() => {
    if (entries && entries.length > 0) return entries;
    return [
      ...summary.vitalsAndSymptoms,
      ...summary.intakeAndOutput,
      ...summary.medications,
      ...summary.questionsForDoctor,
    ].sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, summary]);

  // Available unique dates
  const availableDateGroups = useMemo(() => {
    return groupEntriesByDay(baseEntries);
  }, [baseEntries]);

  // Compute active summary based on selectedDate
  const currentSummary = useMemo(() => {
    if (selectedDate === 'all') {
      return summary;
    }
    const filtered = baseEntries.filter((e) => getLocalDateKey(e.timestamp) === selectedDate);
    return compileHandoverSummaryForEntries(filtered);
  }, [selectedDate, summary, baseEntries]);

  if (!isOpen) return null;

  const totalLogs =
    currentSummary.vitalsAndSymptoms.length +
    currentSummary.intakeAndOutput.length +
    currentSummary.medications.length +
    currentSummary.questionsForDoctor.length;

  // Prominent date & time values
  const now = new Date();
  const defaultDateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const activeDateGroup = availableDateGroups.find((g) => g.dateKey === selectedDate);
  const dateHeadline = activeDateGroup
    ? `${activeDateGroup.displayDate}${activeDateGroup.relativeLabel ? ` (${activeDateGroup.relativeLabel})` : ''}`
    : customTitle || (availableDateGroups.length > 1
        ? `${availableDateGroups[availableDateGroups.length - 1].displayDate} → ${availableDateGroups[0].displayDate}`
        : defaultDateStr);

  const headlineSubtitle = customSubtitle || (
    selectedDate !== 'all'
      ? `Bedside Observations for ${activeDateGroup?.displayDate || 'Selected Date'}`
      : availableDateGroups.length > 1
      ? 'Past 24 Hours Bedside Observations (Multi-Day Handover)'
      : 'Past 24 Hours Bedside Observations'
  );

  const timeWindowText = currentSummary.timeRangeText || 'Past 24 Hours';

  const handleCopyClipboard = async () => {
    const text = generateMarkdownExport(currentSummary, patientInfo, dateHeadline);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn('Fallback copy error', e);
      }
    }
    onShowToast('Summary copied to clipboard!');
  };

  const handleSaveJpg = async () => {
    if (!slipRef.current) return;
    setIsGeneratingJpg(true);
    // Allow state to flush so any no-export elements are cleanly omitted by React
    await new Promise((r) => setTimeout(r, 80));
    try {
      if (editingReplyId) {
        if (editingReplyText.trim()) {
          onSaveDoctorReply?.(editingReplyId, editingReplyText.trim());
        }
        setEditingReplyId(null);
        setEditingReplyText('');
        await new Promise((r) => setTimeout(r, 60));
      }

      const element = slipRef.current;
      const scrollHeight = element.scrollHeight;

      // High-resolution JPEG generation with font and CORS protection
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        skipFonts: true,
        fontEmbedCSS: '',
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        height: scrollHeight,
        filter: (node) => {
          if (node instanceof Element) {
            if (node.classList?.contains('no-export') || node.classList?.contains('no-print')) {
              return false;
            }
          }
          return true;
        },
        style: {
          height: `${scrollHeight}px`,
          maxHeight: 'none',
          overflow: 'visible',
        },
      });

      const safeDate = new Date().toISOString().split('T')[0];
      const safeName = (patientInfo.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
      const themeTag = selectedTheme === 'all' ? 'Handover' : selectedTheme;
      const filename = `CareSlip_${safeName}_${themeTag}_${safeDate}.jpg`;

      // Set preview modal image for direct touch & hold saving on mobile
      setPreviewJpgUrl(dataUrl);

      // Trigger browser download
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast('JPG generated! Long-press image to save to photos on mobile.');
    } catch (err) {
      console.error('Failed to export JPG:', err);
      onShowToast('Could not generate JPG image. Please check permissions.');
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  const toggleQuestionCheck = (id: string, currentVal: boolean) => {
    setAnsweredQuestions((prev) => ({
      ...prev,
      [id]: !currentVal,
    }));
    onToggleQuestionAnswered?.(id);
  };

  const handleSaveDoctorReply = (id: string) => {
    onSaveDoctorReply?.(id, editingReplyText);
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const renderEntryRow = (entry: CareLogEntry, showDatePrefix = false) => {
    const { exactTime } = formatLogTime(entry.timestamp);
    const dateMeta = formatDateHeader(entry.timestamp);
    const dateTag = dateMeta.relativeLabel || dateMeta.displayDate.split(',')[0];
    const timeDisplay = showDatePrefix ? `${dateTag} • ${exactTime}` : exactTime;

    return (
      <li key={entry.id} className="flex items-start gap-2.5 py-1 text-sm leading-snug">
        <span className="font-mono-num font-bold text-slate-700 bg-slate-100 text-xs px-1.5 py-0.5 rounded border border-slate-200 shrink-0 mt-0.5">
          {timeDisplay}
        </span>
        <span className="text-slate-800 break-words flex-1">
          {renderHighlightedText(entry.content)}
        </span>
      </li>
    );
  };

  const renderSectionEntries = (entriesList: CareLogEntry[]) => {
    if (entriesList.length === 0) {
      return <p className="text-xs italic text-slate-400 py-1 pl-1">None reported</p>;
    }
    const isMultiDay = availableDateGroups.length > 1 && selectedDate === 'all';

    if (!isMultiDay) {
      return (
        <ul className="space-y-1">
          {entriesList.map((entry) => renderEntryRow(entry, false))}
        </ul>
      );
    }

    const dayGroups = groupEntriesByDay(entriesList);
    return (
      <div className="space-y-3">
        {dayGroups.map((group) => (
          <div key={group.dateKey} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100/95 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{group.displayDate}</span>
              {group.relativeLabel && (
                <span className="text-[11px] font-semibold text-slate-500 font-mono-num">• {group.relativeLabel}</span>
              )}
              <span className="ml-auto text-[11px] font-mono-num text-slate-500">
                {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            <ul className="space-y-1 pl-1">
              {group.items.map((entry) => renderEntryRow(entry, true))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderQuestionCard = (entry: CareLogEntry, displayIndex: number) => {
    const isAnswered =
      answeredQuestions[entry.id] !== undefined
        ? answeredQuestions[entry.id]
        : !!entry.isAnswered;
    const isEditingThisReply = editingReplyId === entry.id;

    return (
      <li
        key={entry.id}
        className={`p-3 rounded-xl border transition-all ${
          isAnswered
            ? 'bg-slate-50/90 border-slate-200'
            : 'bg-violet-50/50 border-violet-200/80 hover:border-violet-300'
        }`}
      >
        {/* Question Row */}
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={() => toggleQuestionCheck(entry.id, isAnswered)}
            className="shrink-0 mt-0.5 cursor-pointer"
            title={isAnswered ? 'Mark as unanswered' : 'Mark as answered'}
            aria-label={isAnswered ? 'Mark as unanswered' : 'Mark as answered'}
          >
            {isAnswered ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-violet-400 flex items-center justify-center text-[10px] font-bold text-violet-700 bg-white font-mono-num">
                {displayIndex}
              </span>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p
              onClick={() => toggleQuestionCheck(entry.id, isAnswered)}
              className={`text-sm leading-snug break-words cursor-pointer ${
                isAnswered ? 'text-slate-500 line-through' : 'text-slate-900 font-medium'
              }`}
            >
              {entry.content}
            </p>

            {/* Doctor's Reply Section */}
            {isEditingThisReply ? (
              <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Doctor's Reply:</span>
                </div>
                <textarea
                  value={editingReplyText}
                  onChange={(e) => setEditingReplyText(e.target.value)}
                  placeholder="Enter doctor's response or instructions..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 resize-none shadow-2xs leading-relaxed"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReplyId(null);
                      setEditingReplyText('');
                    }}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDoctorReply(entry.id)}
                    className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Reply</span>
                  </button>
                </div>
              </div>
            ) : entry.doctorReply ? (
              <div className="mt-2 pl-2.5 pr-2 py-1.5 bg-emerald-50/90 border-l-[3px] border-emerald-500 rounded-r-lg flex items-start justify-between gap-2 group">
                <div className="flex items-start gap-1.5 text-xs leading-relaxed break-words flex-1">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-900 mr-1.5">Doctor's Reply:</span>
                    <span className="font-medium text-slate-800">{entry.doctorReply}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReplyId(entry.id);
                    setEditingReplyText(entry.doctorReply || '');
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors cursor-pointer shrink-0 no-export no-print"
                  title="Edit Doctor's Reply"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : !isGeneratingJpg ? (
              <div className="mt-1.5 no-export no-print">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReplyId(entry.id);
                    setEditingReplyText('');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer py-0.5 whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Doctor's Reply</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </li>
    );
  };

  const renderQuestionSectionEntries = (entriesList: CareLogEntry[]) => {
    if (entriesList.length === 0) {
      return <p className="text-xs italic text-slate-400 py-1 pl-1">None reported</p>;
    }
    const isMultiDay = availableDateGroups.length > 1 && selectedDate === 'all';

    if (!isMultiDay) {
      return (
        <ul className="space-y-2.5">
          {entriesList.map((entry, idx) => renderQuestionCard(entry, idx + 1))}
        </ul>
      );
    }

    const dayGroups = groupEntriesByDay(entriesList);
    let globalIndex = 0;
    return (
      <div className="space-y-3">
        {dayGroups.map((group) => (
          <div key={group.dateKey} className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100/95 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-violet-700" />
              <span>{group.displayDate}</span>
              {group.relativeLabel && (
                <span className="text-[11px] font-semibold text-slate-500 font-mono-num">• {group.relativeLabel}</span>
              )}
              <span className="ml-auto text-[11px] font-mono-num text-slate-500">
                {group.items.length} {group.items.length === 1 ? 'question' : 'questions'}
              </span>
            </div>
            <ul className="space-y-2.5 pl-1">
              {group.items.map((entry) => {
                globalIndex++;
                return renderQuestionCard(entry, globalIndex);
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-70 flex items-center justify-center p-2 sm:p-4 transition-all duration-200 ${
        isFlashMode ? 'bg-black/90' : 'bg-slate-900/60 backdrop-blur-xs'
      } print:static print:inset-auto print:p-0 print:bg-white print:z-auto print:block`}
    >
      {/* Modal Dialog Card */}
      <div
        className={`relative w-full transition-all duration-200 flex flex-col ${
          isFlashMode
            ? 'max-w-4xl h-[95vh] bg-white text-black p-6 sm:p-8 rounded-2xl shadow-2xl border-4 border-slate-900 overflow-y-auto'
            : 'max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden'
        } print-container print:border-none print:shadow-none print:max-w-none print:w-full print:h-auto print:max-h-none print:overflow-visible print:p-0`}
      >
        {/* Action Toolbar */}
        <div className="bg-slate-900 text-white px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
            <span className="text-xs font-black tracking-tighter text-white font-sans shrink-0">
              Care<span className="text-emerald-400">Slip</span>
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-200 truncate font-mono-num">
              {dateHeadline}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFlashMode(!isFlashMode)}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isFlashMode
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Full Screen for Doctor"
            >
              {isFlashMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFlashMode ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopyClipboard}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Copy Text (WhatsApp)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Text</span>
              <span className="sm:hidden">Copy</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700 active:scale-95"
              title="Print Handover Slip or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Print / PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Save as JPG Image Button */}
            <button
              onClick={handleSaveJpg}
              disabled={isGeneratingJpg}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Export Handover Slip as JPG Image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isGeneratingJpg ? 'Generating...' : 'Export JPG'}</span>
              <span className="sm:hidden">{isGeneratingJpg ? '...' : 'JPG'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-0.5 sm:ml-1"
              title="Close Modal"
              aria-label="Close Modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar (Shown when observations span across multiple calendar days) */}
        {availableDateGroups.length > 1 && (
          <div className="bg-slate-200/90 border-b border-slate-300 px-3 py-1.5 sm:px-5 sm:py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs shrink-0 no-print">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              Date:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
                selectedDate === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              All Dates ({baseEntries.length})
            </button>
            {availableDateGroups.map((d) => (
              <button
                key={d.dateKey}
                type="button"
                onClick={() => setSelectedDate(d.dateKey)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedDate === d.dateKey
                    ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                <span>{d.displayDate}</span>
                {d.relativeLabel && (
                  <span className="text-[10px] opacity-80">({d.relativeLabel})</span>
                )}
                <span className="font-mono-num">({d.items.length})</span>
              </button>
            ))}
          </div>
        )}

        {/* Theme Filter Bar (Click any theme to view ONLY that theme's notes) */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 sm:px-5 sm:py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs shrink-0 no-print">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTheme('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
              selectedTheme === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
            }`}
          >
            All ({totalLogs})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTheme('symptom')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedTheme === 'symptom'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white hover:bg-rose-50 text-rose-800 border border-slate-200'
            }`}
          >
            <span>⚠️</span>
            <span>Vitals ({currentSummary.vitalsAndSymptoms.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTheme('intake_output')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedTheme === 'intake_output'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-white hover:bg-cyan-50 text-cyan-800 border border-slate-200'
            }`}
          >
            <span>💧</span>
            <span>I/O ({currentSummary.intakeAndOutput.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTheme('medication')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedTheme === 'medication'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200'
            }`}
          >
            <span>💊</span>
            <span>Meds ({currentSummary.medications.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTheme('question')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedTheme === 'question'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white hover:bg-violet-50 text-violet-800 border border-slate-200'
            }`}
          >
            <span>❓</span>
            <span>Questions ({currentSummary.questionsForDoctor.length})</span>
          </button>
        </div>

        {/* Paper-Style Clinical Content (Scrollable & Captured for JPG) */}
        <div ref={slipRef} className="overflow-y-auto p-4 sm:p-7 space-y-5 sm:space-y-6 bg-white print-card min-w-[320px]">
          {/* Paper Header — Concise Brand Badge, Prominent Date & Time Window */}
          <div className="border-b-2 border-slate-900 pb-3.5 sm:pb-4">
            {/* Top row: Brand Badge & Time Window Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-black tracking-tight text-slate-950 font-sans select-none">
                  Care<span className="text-emerald-600">Slip</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                  Bedside Handover
                </span>
              </div>

              {/* Time Window (prominent at the top) */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 text-xs font-mono-num font-bold rounded-lg border border-slate-200 shadow-2xs shrink-0 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{timeWindowText}</span>
              </div>
            </div>

            {/* Main Hero: Large Date Headline */}
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                  {dateHeadline}
                </h1>
                <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-mono-num font-bold text-xs rounded-md shadow-2xs whitespace-nowrap shrink-0">
                  {selectedTheme === 'all'
                    ? `${totalLogs} Recorded Events`
                    : `${
                        selectedTheme === 'symptom'
                          ? currentSummary.vitalsAndSymptoms.length
                          : selectedTheme === 'intake_output'
                          ? currentSummary.intakeAndOutput.length
                          : selectedTheme === 'medication'
                          ? currentSummary.medications.length
                          : currentSummary.questionsForDoctor.length
                      } Events (${
                        selectedTheme === 'symptom'
                          ? 'Vitals'
                          : selectedTheme === 'intake_output'
                          ? 'I/O'
                          : selectedTheme === 'medication'
                          ? 'Meds'
                          : 'Questions'
                      })`}
                </span>
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5 leading-normal">
                <span className="font-semibold text-slate-700">
                  {headlineSubtitle}
                </span>
                {selectedTheme !== 'all' && (
                  <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 text-[10px] uppercase tracking-wide whitespace-nowrap">
                    Filtered: {selectedTheme}
                  </span>
                )}
                {selectedDate !== 'all' && (
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 text-[10px] uppercase tracking-wide whitespace-nowrap">
                    Date: {activeDateGroup?.displayDate}
                  </span>
                )}
              </div>
            </div>

            {/* Patient Meta Strip — Structured 2-row layout with zero overlap */}
            <div className="mt-3.5 bg-slate-50/95 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
              {/* Row 1: Patient Name & Bed/Room */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-500 font-medium shrink-0">Patient:</span>
                  <span className="font-bold text-slate-900 whitespace-nowrap truncate">
                    {patientInfo.patientName || 'Anonymous / Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 text-right">
                  <span className="text-slate-500 font-medium shrink-0">Bed/Room:</span>
                  <span className="font-bold text-slate-900 whitespace-nowrap truncate">
                    {patientInfo.roomBed || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Row 2: Attending Physician */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 font-mono-num">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-500 font-medium shrink-0">Physician:</span>
                <span className="font-bold text-slate-900 whitespace-nowrap truncate">
                  {patientInfo.attendingPhysician || 'Attending Physician'}
                </span>
              </div>
            </div>
          </div>

          {/* Grouped Blocks (Dynamically filtered by selectedTheme) */}
          <div className="space-y-5">
            {/* Block 1: ⚠️ Vitals & Acute Observations */}
            {(selectedTheme === 'all' || selectedTheme === 'symptom') && (
              <section className="print-section">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-base shrink-0">⚠️</span>
                    <span className="uppercase">Vitals &amp; Acute Observations</span>
                  </h3>
                  <span className="text-xs font-mono-num font-semibold text-slate-500 shrink-0">
                    ({currentSummary.vitalsAndSymptoms.length})
                  </span>
                </div>
                {renderSectionEntries(currentSummary.vitalsAndSymptoms)}
              </section>
            )}

            {/* Block 2: 💧 Intake, Nutrition & Output */}
            {(selectedTheme === 'all' || selectedTheme === 'intake_output') && (
              <section className="print-section">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-base shrink-0">💧</span>
                    <span className="uppercase">Intake, Nutrition &amp; Output</span>
                  </h3>
                  <span className="text-xs font-mono-num font-semibold text-slate-500 shrink-0">
                    ({currentSummary.intakeAndOutput.length})
                  </span>
                </div>
                {renderSectionEntries(currentSummary.intakeAndOutput)}
              </section>
            )}

            {/* Block 3: 💊 Medications & Timelines */}
            {(selectedTheme === 'all' || selectedTheme === 'medication') && (
              <section className="print-section">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-base shrink-0">💊</span>
                    <span className="uppercase">Medications &amp; Timelines</span>
                  </h3>
                  <span className="text-xs font-mono-num font-semibold text-slate-500 shrink-0">
                    ({currentSummary.medications.length})
                  </span>
                </div>
                {renderSectionEntries(currentSummary.medications)}
              </section>
            )}

            {/* Block 4: ❓ Questions from Caregiver */}
            {(selectedTheme === 'all' || selectedTheme === 'question') && (
              <section className="print-section">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-base shrink-0">❓</span>
                    <span className="uppercase">Questions from Caregiver</span>
                  </h3>
                  <span className="text-xs font-mono-num font-semibold text-slate-500 shrink-0">
                    ({currentSummary.questionsForDoctor.length})
                  </span>
                </div>
                {renderQuestionSectionEntries(currentSummary.questionsForDoctor)}
              </section>
            )}
          </div>

          {/* Paper Footer with Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 leading-normal">
            <span className="whitespace-nowrap">Generated locally via CareSlip bedside notepad</span>
            <span className="whitespace-nowrap">100% on-device • Zero cloud sync</span>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 no-print">
          <span className="text-xs text-slate-500">
            Tap <strong className="text-slate-700">Export JPG</strong> to save image to photos.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* JPG Image Preview & Save Modal (Ensures mobile touch & hold saving is 100% foolproof) */}
      {previewJpgUrl && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  JPG Image Ready
                </span>
              </div>
              <button
                onClick={() => setPreviewJpgUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                aria-label="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-medium text-center">
              📱 <strong>Mobile:</strong> Touch &amp; hold image below to <strong>Save to Photos</strong>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex items-center justify-center">
              <img
                src={previewJpgUrl}
                alt="Generated Handover Slip"
                className="max-w-full rounded-xl shadow-md border border-slate-200 object-contain"
              />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <a
                href={previewJpgUrl}
                download={`CareSlip_${(patientInfo.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`}
                className="flex-1 py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download JPG File</span>
              </a>
              <button
                onClick={() => setPreviewJpgUrl(null)}
                className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
