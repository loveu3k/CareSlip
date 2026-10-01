import React from 'react';
import type { CareLogEntry, HandoverSummary, PatientInfo } from '../types';
import { groupEntriesByDay } from './history';

/**
 * Deterministic helper function strictly matching Project Specification (Section 5)
 */
/**
 * Compile a HandoverSummary from an arbitrary list of entries
 */
export function compileHandoverSummaryForEntries(
  entries: CareLogEntry[],
  customTimeRangeText?: string
): HandoverSummary {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  let timeRangeText = customTimeRangeText;
  if (!timeRangeText) {
    if (sorted.length === 0) {
      timeRangeText = 'Past 24 Hours';
    } else if (sorted.length === 1) {
      const d = new Date(sorted[0].timestamp);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      timeRangeText = `${dateStr} at ${timeStr}`;
    } else {
      const startDate = new Date(sorted[0].timestamp);
      const endDate = new Date(sorted[sorted.length - 1].timestamp);
      const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const isSameDay =
        startDate.getDate() === endDate.getDate() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear();

      if (isSameDay) {
        const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        timeRangeText = startTime === endTime
          ? `${dateStr} at ${startTime}`
          : `${dateStr} • ${startTime} - ${endTime}`;
      } else {
        const startDateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        timeRangeText = `${startDateStr}, ${startTime} → ${endDateStr}, ${endTime}`;
      }
    }
  }

  return {
    vitalsAndSymptoms: sorted.filter((l) => l.category === 'symptom'),
    intakeAndOutput: sorted.filter((l) => l.category === 'intake_output'),
    medications: sorted.filter((l) => l.category === 'medication'),
    questionsForDoctor: sorted.filter((l) => l.category === 'question'),
    timeRangeText,
  };
}

/**
 * Compile 24-hour summary based on actual recorded observations
 */
export function compileHandoverSummary(logs: CareLogEntry[]): HandoverSummary {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter((l) => l.timestamp >= dayAgo);

  return compileHandoverSummaryForEntries(recentLogs);
}

/**
 * Format entry timestamp into readable hospital format:
 * Month in words, day in numbers, year: "Sep 30, 2026, 3:15 PM"
 */
export function formatLogTime(timestamp: number): { badge: string; exactTime: string; relative: string } {
  const date = new Date(timestamp);
  const now = new Date();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Relative time calculation
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  let relative = 'Just now';
  if (diffMins >= 60) {
    const diffHours = Math.floor(diffMins / 60);
    relative = `${diffHours}h ago`;
  } else if (diffMins > 0) {
    relative = `${diffMins}m ago`;
  }

  return {
    badge: `${dateStr}, ${timeStr}`,
    exactTime: timeStr,
    relative,
  };
}

/**
 * Deterministic Regex Rule:
 * High-contrast highlight for clinical measurements, vital readings, dosages, and pain scales.
 * E.g., 38.2°C, 145/90, scale 6/10, 150ml, 500mg, 80bpm, SpO2 96%
 */
const CLINICAL_MEASUREMENT_REGEX =
  /(\b\d{2,3}(?:\.\d)?\s*(?:°C|°F|C|F)\b|\b\d{2,3}\s*\/\s*\d{2,3}(?:\s*mmHg)?\b|\b(?:scale\s+[0-9]+(?:\/[0-9]+)?|[0-9]{1,2}\s*\/\s*10|pain\s*(?:level|scale)?\s*[:=-]?\s*[0-9]{1,2})\b|\b\d+(?:\.\d+)?\s*(?:ml|mL|cc|oz|L|liters?)\b|\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu|IU|units?|drops?)\b|\b\d{2,3}\s*(?:bpm|BPM)\b|\b(?:SpO2|spo2)\s*:?\s*\d{2,3}%?\b|\b\d{2,3}%\s*(?:SpO2|spo2|O2)?\b|\b\d+\s*(?:ml\/h|cc\/hr|drops\/min)\b)/gi;

export function renderHighlightedText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(CLINICAL_MEASUREMENT_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    CLINICAL_MEASUREMENT_REGEX.lastIndex = 0;
    if (CLINICAL_MEASUREMENT_REGEX.test(part)) {
      return (
        <span
          key={index}
          className="font-bold text-slate-950 bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-mono-num border border-amber-300/60 shadow-xs"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Generate formatted Markdown for clipboard export (WhatsApp, family SMS, medical charts)
 */
export function generateMarkdownExport(
  summary: HandoverSummary,
  patientInfo?: PatientInfo,
  dateHeadline?: string
): string {
  const patientLine = patientInfo?.roomBed
    ? `Patient: ${patientInfo.patientName || 'Anonymous'} (${patientInfo.roomBed})`
    : `Patient: ${patientInfo?.patientName || 'Bedside Care Log'}`;

  const dateStr =
    dateHeadline ||
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatList = (entries: CareLogEntry[]) => {
    if (entries.length === 0) return '  - None reported\n';
    const groups = groupEntriesByDay(entries);
    if (groups.length <= 1) {
      return (
        entries
          .map((e) => {
            const { exactTime } = formatLogTime(e.timestamp);
            return `  • [${exactTime}] ${e.content}`;
          })
          .join('\n') + '\n'
      );
    }
    return (
      groups
        .map((g) => {
          const rel = g.relativeLabel ? ` (${g.relativeLabel})` : '';
          const header = `  📅 *${g.displayDate}${rel}:*`;
          const lines = g.items
            .map((e) => {
              const { exactTime } = formatLogTime(e.timestamp);
              return `    • [${exactTime}] ${e.content}`;
            })
            .join('\n');
          return `${header}\n${lines}`;
        })
        .join('\n') + '\n'
    );
  };

  const formatQuestions = (entries: CareLogEntry[]) => {
    if (entries.length === 0) return '  - None reported\n';
    const groups = groupEntriesByDay(entries);
    if (groups.length <= 1) {
      return (
        entries
          .map((e, idx) => {
            const { exactTime } = formatLogTime(e.timestamp);
            let q = `  ${idx + 1}. [${exactTime}] ${e.content}`;
            if (e.doctorReply) {
              q += `\n     🩺 *Doctor's Reply:* ${e.doctorReply}`;
            }
            return q;
          })
          .join('\n') + '\n'
      );
    }
    let globalIdx = 0;
    return (
      groups
        .map((g) => {
          const rel = g.relativeLabel ? ` (${g.relativeLabel})` : '';
          const header = `  📅 *${g.displayDate}${rel}:*`;
          const lines = g.items
            .map((e) => {
              globalIdx++;
              const { exactTime } = formatLogTime(e.timestamp);
              let q = `    ${globalIdx}. [${exactTime}] ${e.content}`;
              if (e.doctorReply) {
                q += `\n       🩺 *Doctor's Reply:* ${e.doctorReply}`;
              }
              return q;
            })
            .join('\n');
          return `${header}\n${lines}`;
        })
        .join('\n') + '\n'
    );
  };

  return `📋 *CareSlip — ${dateStr}*
Bedside Handover for Doctor
${patientLine}
🕒 Time Window: ${summary.timeRangeText}
════════════════════════════════════════

⚠️ *VITALS & ACUTE OBSERVATIONS*
${formatList(summary.vitalsAndSymptoms)}
💧 *INTAKE, NUTRITION & OUTPUT*
${formatList(summary.intakeAndOutput)}
💊 *MEDICATIONS & TIMELINES*
${formatList(summary.medications)}
❓ *QUESTIONS FROM CAREGIVER*
${formatQuestions(summary.questionsForDoctor)}
────────────────────────────────────────
CareSlip is a personal bedside notepad for caregivers. It does not store medical records on any server and does not provide clinical diagnosis, medical evaluation, or treatment advice.`;
}

/**
 * Realistic sample data spanning the past 24 hours for instant demo
 */
export function getSampleCareLogs(): CareLogEntry[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      id: 'sample-1',
      timestamp: now - 18 * hour,
      category: 'symptom',
      content: 'Temp 38.2°C, chills noted, BP 136/84 mmHg.',
    },
    {
      id: 'sample-2',
      timestamp: now - 12 * hour,
      category: 'medication',
      content: 'Paracetamol 500mg oral dose given for fever.',
    },
    {
      id: 'sample-3',
      timestamp: now - 6 * hour,
      category: 'intake_output',
      content: 'Drank 250ml water, ate half bowl congee for breakfast.',
    },
    {
      id: 'sample-4',
      timestamp: now - 1 * hour,
      category: 'question',
      content: 'Can IV antibiotics be switched to oral today?',
      doctorReply: 'Yes, switch to oral Augmentin 625mg tonight after dinner.',
      isAnswered: true,
    },
  ];
}
