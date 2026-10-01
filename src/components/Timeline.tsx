import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Clock, Droplets, Pill, Activity, HelpCircle, Inbox, Sparkles, Stethoscope, Plus, Calendar } from 'lucide-react';
import type { CareLogEntry, Category } from '../types';
import { CATEGORIES } from '../constants/categories';
import { formatLogTime, renderHighlightedText } from '../utils/summary';
import { getLocalDateKey, groupEntriesByDay } from '../utils/history';

interface TimelineProps {
  entries: CareLogEntry[];
  onDeleteEntry: (id: string) => void;
  onEditEntry: (id: string, newContent: string) => void;
  onLoadSampleData: () => void;
  onSaveDoctorReply?: (id: string, reply: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  entries,
  onDeleteEntry,
  onEditEntry,
  onLoadSampleData,
  onSaveDoctorReply,
}) => {
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 24-hour cutoff
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recentEntries = entries
    .filter((e) => e.timestamp >= dayAgo)
    .sort((a, b) => b.timestamp - a.timestamp); // reverse chronological

  // Day groups present in recent entries
  const dayGroupsInRecent = groupEntriesByDay(recentEntries);

  const dateFilteredEntries =
    filterDate === 'all'
      ? recentEntries
      : recentEntries.filter((e) => getLocalDateKey(e.timestamp) === filterDate);

  const filteredEntries =
    filterCategory === 'all'
      ? dateFilteredEntries
      : dateFilteredEntries.filter((e) => e.category === filterCategory);

  const displayedDayGroups = groupEntriesByDay(filteredEntries);

  const startEdit = (entry: CareLogEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const saveEdit = (id: string) => {
    if (editContent.trim()) {
      onEditEntry(id, editContent.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const renderIcon = (catId: Category) => {
    switch (catId) {
      case 'intake_output':
        return <Droplets className="w-3.5 h-3.5 text-cyan-700" />;
      case 'medication':
        return <Pill className="w-3.5 h-3.5 text-emerald-700" />;
      case 'symptom':
        return <Activity className="w-3.5 h-3.5 text-rose-700" />;
      case 'question':
        return <HelpCircle className="w-3.5 h-3.5 text-violet-700" />;
    }
  };

  const renderEntryCard = (entry: CareLogEntry) => {
    const meta = CATEGORIES[entry.category];
    const { badge, relative } = formatLogTime(entry.timestamp);
    const isEditing = editingId === entry.id;

    return (
      <div
        key={entry.id}
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs p-3.5 transition-all"
      >
        {/* Timeline connector dot */}
        <div className="absolute -left-[19px] top-4 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white ring-2 ring-slate-100" />

        {/* Card Header: Category badge + Time badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.badgeBg}`}
            >
              {renderIcon(entry.category)}
              {meta.label}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {relative}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs font-mono-num text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
              {badge}
            </span>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => startEdit(entry)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Edit Entry"
                aria-label="Edit Entry"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteEntry(entry.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Delete Entry"
                aria-label="Delete Entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Entry Content (with Highlighted numbers / measurements) */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-sky-400 rounded-lg outline-none ring-2 ring-sky-500/20"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={cancelEdit}
                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => saveEdit(entry.id)}
                className="p-1 bg-sky-600 text-white rounded hover:bg-sky-700"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-800 leading-relaxed font-normal break-words">
              {renderHighlightedText(entry.content)}
            </p>

            {/* Question category Doctor Reply support */}
            {entry.category === 'question' && (
              replyingId === entry.id ? (
                <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Doctor's Reply:</span>
                  </div>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Enter doctor's response or instructions..."
                    rows={2}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 resize-none shadow-2xs leading-relaxed"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingId(null);
                        setReplyContent('');
                      }}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSaveDoctorReply?.(entry.id, replyContent);
                        setReplyingId(null);
                        setReplyContent('');
                      }}
                      className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Reply</span>
                    </button>
                  </div>
                </div>
              ) : entry.doctorReply ? (
                <div className="mt-2.5 pl-2.5 pr-2 py-1.5 bg-emerald-50/90 border-l-[3px] border-emerald-500 rounded-r-lg flex items-start justify-between gap-2">
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
                      setReplyingId(entry.id);
                      setReplyContent(entry.doctorReply || '');
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors cursor-pointer shrink-0"
                    title="Edit Doctor's Reply"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingId(entry.id);
                      setReplyContent('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Doctor's Reply</span>
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Timeline Header & Filters */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Past 24 Hours Log
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-700 rounded-full font-mono-num">
              {recentEntries.length}
            </span>
          </div>

          {/* Date Filter (Visible when observations span across multiple calendar days) */}
          {dayGroupsInRecent.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Date:
              </span>
              <button
                type="button"
                onClick={() => setFilterDate('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 min-h-[30px] flex items-center ${
                  filterDate === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                All Days ({recentEntries.length})
              </button>
              {dayGroupsInRecent.map((grp) => (
                <button
                  key={grp.dateKey}
                  type="button"
                  onClick={() => setFilterDate(grp.dateKey)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 min-h-[30px] flex items-center gap-1 ${
                    filterDate === grp.dateKey
                      ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span>{grp.displayDate}</span>
                  {grp.relativeLabel && (
                    <span className="text-[10px] opacity-80">({grp.relativeLabel})</span>
                  )}
                  <span className="font-mono-num">({grp.items.length})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer shrink-0 min-h-[36px] flex items-center ${
              filterCategory === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            All ({dateFilteredEntries.length})
          </button>

          {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
            const cat = CATEGORIES[catKey];
            const count = dateFilteredEntries.filter((e) => e.category === catKey).length;
            const isSelected = filterCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setFilterCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 min-h-[36px] ${
                  isSelected
                    ? `${cat.activeBg} font-semibold shadow-2xs`
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span className="hidden sm:inline">{cat.shortLabel}</span>
                <span>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries List or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto">
            <p className="text-sm font-semibold text-slate-700">
              {entries.length > 0
                ? 'No observations in the past 24 hours. Older notes are safely stored in Archives.'
                : 'No notes logged yet. Tap a category above to capture an observation.'}
            </p>
          </div>
          {entries.length === 0 && (
            <button
              onClick={onLoadSampleData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-sky-600" />
              Load Realistic 24h Sample Data
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedDayGroups.map((dayGroup) => (
            <div key={dayGroup.dateKey} className="space-y-3">
              {/* Day Divider Banner */}
              <div className="relative my-2.5 first:mt-0">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-slate-300 flex-1" />
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/90 border border-slate-300 text-slate-800 text-xs font-bold shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{dayGroup.displayDate}</span>
                    {dayGroup.relativeLabel && (
                      <span className="text-[11px] font-semibold text-slate-600 font-sans">
                        • {dayGroup.relativeLabel}
                      </span>
                    )}
                    <span className="px-1.5 py-0.2 text-[10px] bg-white border border-slate-200 rounded-full font-mono-num text-slate-600">
                      {dayGroup.items.length}
                    </span>
                  </div>
                  <div className="h-px bg-slate-300 flex-1" />
                </div>
              </div>

              {/* Day's Timeline Connector & Cards */}
              <div className="relative pl-3 border-l-2 border-slate-200 ml-3.5 space-y-3">
                {dayGroup.items.map((entry) => renderEntryCard(entry))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
