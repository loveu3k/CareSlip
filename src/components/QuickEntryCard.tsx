import { useState, useRef } from 'react';
import type React from 'react';
import { Plus, Clock } from 'lucide-react';
import type { Category } from '../types';
import { CATEGORIES } from '../constants/categories';

interface QuickEntryCardProps {
  onAddEntry: (category: Category, content: string, timestamp: number) => void;
}

const getLocalHHMM = (d = new Date()): string => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const QuickEntryCard: React.FC<QuickEntryCardProps> = ({ onAddEntry }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('intake_output');
  const [content, setContent] = useState('');
  const [timeMode, setTimeMode] = useState<'now' | 'offset' | 'exact'>('now');
  const [customMinutesOffset, setCustomMinutesOffset] = useState<number>(0);
  const [exactTimeValue, setExactTimeValue] = useState<string>(getLocalHHMM());
  const [exactDayChoice, setExactDayChoice] = useState<'auto' | 'today' | 'yesterday'>('auto');
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [showTimeOffsets, setShowTimeOffsets] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeMeta = CATEGORIES[selectedCategory];

  // Helper to get selected timestamp based on active time mode
  const getSelectedTimestamp = (): number => {
    if (timeMode === 'exact' && exactTimeValue) {
      const [hours, minutes] = exactTimeValue.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        if (exactDayChoice === 'yesterday') {
          d.setDate(d.getDate() - 1);
        } else if (exactDayChoice === 'today') {
          // Explicitly keep today
        } else {
          // If selected time is later in the day than now, assume it belongs to yesterday's shift
          if (d.getTime() > Date.now()) {
            d.setDate(d.getDate() - 1);
          }
        }
        return d.getTime();
      }
    }
    if (timeMode === 'offset' && customMinutesOffset > 0) {
      return Date.now() - customMinutesOffset * 60 * 1000;
    }
    return Date.now();
  };

  const selectedTimestamp = getSelectedTimestamp();
  const selectedDate = new Date(selectedTimestamp);
  const selectedDateStr = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const currentDisplayTime = selectedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const now = new Date();
  const isYesterday =
    selectedDate.getDate() !== now.getDate() ||
    selectedDate.getMonth() !== now.getMonth() ||
    selectedDate.getFullYear() !== now.getFullYear();

  const handleOpenExactTime = () => {
    setExactTimeValue(getLocalHHMM());
    setExactDayChoice('auto');
    setTimeMode('exact');
    setShowTimePicker(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    onAddEntry(selectedCategory, trimmed, getSelectedTimestamp());
    setContent('');
    setTimeMode('now');
    setExactDayChoice('auto');
    setCustomMinutesOffset(0);
    setShowTimePicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePresetClick = (presetText: string) => {
    onAddEntry(selectedCategory, presetText, getSelectedTimestamp());
    setTimeMode('now');
    setExactDayChoice('auto');
    setCustomMinutesOffset(0);
    setShowTimePicker(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span>⚡</span> Quick Observation Entry
        </h2>
        <span className="text-xs text-slate-400 font-medium">Under 5s logging</span>
      </div>

      {/* Category Selector (Single-choice chips, minimum 44px height for touch targets) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3.5">
        {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
          const cat = CATEGORIES[catKey];
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              type="button"
              aria-label={`${cat.emoji} ${cat.label}`}
              onClick={() => {
                setSelectedCategory(catKey);
                inputRef.current?.focus();
              }}
              className={`min-h-[48px] px-3 py-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left select-none active:scale-[0.98] ${
                isSelected
                  ? `${cat.activeBg} font-semibold shadow-xs`
                  : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-700 font-medium'
              }`}
            >
              <span className="text-base shrink-0 leading-none select-none">{cat.emoji}</span>
              <div className="leading-tight">
                <div className="text-xs font-semibold">
                  <span className="md:hidden">{cat.shortLabel}</span>
                  <span className="hidden md:inline">{cat.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input Controls */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            spellCheck={false}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={activeMeta.placeholder}
            className="w-full pl-4 pr-14 py-3.5 text-base sm:text-sm bg-slate-50 focus:bg-white text-slate-900 border border-slate-300 focus:border-sky-500 rounded-xl outline-none ring-0 focus:ring-3 focus:ring-sky-500/15 transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-xs"
            title="Add Log Entry"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 1-Tap Quick Preset Suggestions for fastest logging */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase shrink-0 mr-0.5">
            Quick:
          </span>
          {activeMeta.presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className="px-3 py-2 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-700 border border-slate-200/80 transition-colors whitespace-nowrap cursor-pointer active:scale-95 shrink-0 font-medium min-h-[40px] flex items-center"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Timestamp adjustment strip */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium">Time:</span>
            <span
              className={`font-semibold font-mono-num px-2 py-0.5 rounded border transition-colors ${
                timeMode === 'exact'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                  : timeMode === 'offset'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {timeMode === 'exact' ? `${selectedDateStr}, ${currentDisplayTime}` : currentDisplayTime}
            </span>

            {timeMode === 'exact' && (
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300 font-mono-num">
                {isYesterday ? 'Yesterday' : 'Exact'}
              </span>
            )}

            {timeMode === 'offset' && customMinutesOffset > 0 && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                -{customMinutesOffset}m
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowTimeOffsets(!showTimeOffsets)}
              className="sm:hidden text-xs text-sky-600 hover:text-sky-700 font-semibold px-1 py-0.5 cursor-pointer underline underline-offset-2 ml-1"
            >
              {showTimeOffsets ? 'Hide' : 'Change'}
            </button>
          </div>

          <div
            className={`flex items-center gap-1 ${
              showTimeOffsets ? 'w-full sm:w-auto mt-1 sm:mt-0 justify-end' : 'hidden sm:flex'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setTimeMode('now');
                setCustomMinutesOffset(0);
                setShowTimePicker(false);
              }}
              className={`px-2.5 py-1.5 sm:py-1 rounded text-xs transition-colors cursor-pointer min-h-[32px] sm:min-h-0 flex items-center font-medium ${
                timeMode === 'now'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeMode('offset');
                setCustomMinutesOffset(15);
                setShowTimePicker(false);
              }}
              className={`px-2.5 py-1.5 sm:py-1 rounded text-xs transition-colors cursor-pointer min-h-[32px] sm:min-h-0 flex items-center font-medium ${
                timeMode === 'offset' && customMinutesOffset === 15
                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              -15m
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeMode('offset');
                setCustomMinutesOffset(30);
                setShowTimePicker(false);
              }}
              className={`px-2.5 py-1.5 sm:py-1 rounded text-xs transition-colors cursor-pointer min-h-[32px] sm:min-h-0 flex items-center font-medium ${
                timeMode === 'offset' && customMinutesOffset === 30
                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              -30m
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeMode('offset');
                setCustomMinutesOffset(60);
                setShowTimePicker(false);
              }}
              className={`px-2.5 py-1.5 sm:py-1 rounded text-xs transition-colors cursor-pointer min-h-[32px] sm:min-h-0 flex items-center font-medium ${
                timeMode === 'offset' && customMinutesOffset === 60
                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              -1h
            </button>
            <button
              type="button"
              onClick={handleOpenExactTime}
              className={`px-2.5 py-1.5 sm:py-1 rounded text-xs transition-all cursor-pointer min-h-[32px] sm:min-h-0 flex items-center gap-1 font-semibold ${
                timeMode === 'exact'
                  ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-400 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Set exact observation time"
            >
              <Clock className="w-3 h-3 text-emerald-700" />
              <span>Exact</span>
            </button>
          </div>
        </div>

        {/* Exact Time Picker Drawer */}
        {showTimePicker && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5 transition-all animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exact Time:</span>
              </span>
              <input
                type="time"
                value={exactTimeValue}
                onChange={(e) => {
                  if (e.target.value) {
                    setExactTimeValue(e.target.value);
                    setTimeMode('exact');
                  }
                }}
                className="px-2.5 py-1.5 bg-white border border-emerald-300 focus:border-emerald-600 rounded-lg text-xs font-mono-num font-bold text-slate-900 outline-none shadow-2xs"
              />
              <div className="inline-flex rounded-lg border border-emerald-300 bg-white p-0.5 text-xs font-semibold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setExactDayChoice('today')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    exactDayChoice === 'today' || (exactDayChoice === 'auto' && !isYesterday)
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setExactDayChoice('yesterday')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    exactDayChoice === 'yesterday' || (exactDayChoice === 'auto' && isYesterday)
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yesterday
                </button>
              </div>
              <span className="text-[11px] text-emerald-900 font-bold font-mono-num">
                ({selectedDateStr})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTimeMode('now');
                  setExactDayChoice('auto');
                  setExactTimeValue(getLocalHHMM());
                  setShowTimePicker(false);
                }}
                className="text-xs px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-md cursor-pointer font-medium"
              >
                Reset to Now
              </button>
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold cursor-pointer shadow-2xs active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
