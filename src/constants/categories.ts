import type { Category, CategoryMeta } from '../types';

export const CATEGORIES: Record<Category, CategoryMeta> = {
  intake_output: {
    id: 'intake_output',
    label: 'Intake & Output',
    shortLabel: 'I/O',
    iconName: 'Droplets',
    emoji: '💧',
    placeholder: 'e.g., drank 200ml water, urine output 300ml',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    badgeText: 'text-cyan-800',
    borderCol: 'border-cyan-500',
    activeBg: 'bg-cyan-50 text-cyan-900 border-cyan-500 ring-2 ring-cyan-500/20 shadow-sm',
    presets: [
      'drank 200ml water',
    ],
  },
  medication: {
    id: 'medication',
    label: 'Meds & Doses',
    shortLabel: 'Meds',
    iconName: 'Pill',
    emoji: '💊',
    placeholder: 'e.g., paracetamol 500mg given, IV started',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeText: 'text-emerald-800',
    borderCol: 'border-emerald-500',
    activeBg: 'bg-emerald-50 text-emerald-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm',
    presets: [
      'paracetamol 500mg given',
    ],
  },
  symptom: {
    id: 'symptom',
    label: 'Vitals & Symptoms',
    shortLabel: 'Vitals',
    iconName: 'Activity',
    emoji: '⚠️',
    placeholder: 'e.g., temp 37.8°C, BP 130/85, pain 4/10',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    badgeText: 'text-rose-800',
    borderCol: 'border-rose-500',
    activeBg: 'bg-rose-50 text-rose-900 border-rose-500 ring-2 ring-rose-500/20 shadow-sm',
    presets: [
      'temp 37.8°C, BP 130/85',
    ],
  },
  question: {
    id: 'question',
    label: 'Doctor Questions',
    shortLabel: 'Questions',
    iconName: 'HelpCircle',
    emoji: '❓',
    placeholder: 'e.g., can IV be switched to oral meds?',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-300',
    badgeText: 'text-violet-800',
    borderCol: 'border-violet-500',
    activeBg: 'bg-violet-50 text-violet-900 border-violet-500 ring-2 ring-violet-500/20 shadow-sm',
    presets: [
      'can IV be switched to oral?',
    ],
  },
};
