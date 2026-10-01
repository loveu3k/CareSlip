import type { CareLogEntry, DayArchive } from '../types';
import { compileHandoverSummaryForEntries } from './summary';

/**
 * Extract YYYY-MM-DD local date key from timestamp
 */
export function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a timestamp into clean date metadata with Month in words, Day and Year in numbers
 */
export function formatDateHeader(timestamp: number): { dateKey: string; displayDate: string; relativeLabel: string } {
  const dateKey = getLocalDateKey(timestamp);
  const now = new Date();
  const todayKey = getLocalDateKey(now.getTime());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate.getTime());

  let relativeLabel = '';
  if (dateKey === todayKey) {
    relativeLabel = 'Today';
  } else if (dateKey === yesterdayKey) {
    relativeLabel = 'Yesterday';
  } else {
    const d = new Date(timestamp);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    relativeLabel = `${diffDays} days ago`;
  }

  const d = new Date(timestamp);
  const displayDate = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { dateKey, displayDate, relativeLabel };
}

export interface DayGroup<T> {
  dateKey: string;
  displayDate: string;
  relativeLabel: string;
  items: T[];
}

/**
 * Group arbitrary timeline or report entries by day, newest date first
 */
export function groupEntriesByDay<T extends { timestamp: number }>(items: T[]): DayGroup<T>[] {
  const map = new Map<string, DayGroup<T>>();

  for (const item of items) {
    const key = getLocalDateKey(item.timestamp);
    if (!map.has(key)) {
      const meta = formatDateHeader(item.timestamp);
      map.set(key, { ...meta, items: [] });
    }
    map.get(key)!.items.push(item);
  }

  return Array.from(map.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((k) => map.get(k)!);
}

/**
 * Group flat log entries into daily archives, sorted with newest day on top
 */
export function groupLogsByDay(logs: CareLogEntry[]): DayArchive[] {
  const map = new Map<string, CareLogEntry[]>();

  for (const log of logs) {
    const key = getLocalDateKey(log.timestamp);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(log);
  }

  const now = new Date();
  const todayKey = getLocalDateKey(now.getTime());

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate.getTime());

  // Sort dates descending (newest on top)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((dateKey) => {
    const rawEntries = map.get(dateKey) || [];
    // Sort entries descending within the day for list view
    const entries = [...rawEntries].sort((a, b) => b.timestamp - a.timestamp);

    // Format display date
    const [year, month, day] = dateKey.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    let relativeLabel = '';
    if (dateKey === todayKey) {
      relativeLabel = 'Today';
    } else if (dateKey === yesterdayKey) {
      relativeLabel = 'Yesterday';
    } else {
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      relativeLabel = `${diffDays} days ago`;
    }

    const displayDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const summary = compileHandoverSummaryForEntries(entries);

    const stats = {
      total: entries.length,
      intakeOutput: entries.filter((e) => e.category === 'intake_output').length,
      medications: entries.filter((e) => e.category === 'medication').length,
      symptoms: entries.filter((e) => e.category === 'symptom').length,
      questions: entries.filter((e) => e.category === 'question').length,
    };

    return {
      dateKey,
      displayDate,
      relativeLabel,
      entries,
      summary,
      stats,
    };
  });
}
