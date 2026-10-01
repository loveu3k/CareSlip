export type Category = 'intake_output' | 'medication' | 'symptom' | 'question';

export interface CareLogEntry {
  id: string;
  timestamp: number; // Date.now()
  category: Category;
  content: string;
  doctorReply?: string; // Caregiver can record doctor's answer/response
  isAnswered?: boolean;
}

export interface HandoverSummary {
  vitalsAndSymptoms: CareLogEntry[];
  intakeAndOutput: CareLogEntry[];
  medications: CareLogEntry[];
  questionsForDoctor: CareLogEntry[];
  timeRangeText: string;
}

export interface PatientInfo {
  roomBed: string;
  patientName: string;
  attendingPhysician?: string;
}

export interface CategoryMeta {
  id: Category;
  label: string;
  shortLabel: string;
  iconName: string;
  emoji: string;
  placeholder: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
  activeBg: string;
  presets: string[];
}

export interface DayArchive {
  dateKey: string; // 'YYYY-MM-DD'
  displayDate: string; // 'Tuesday, Sep 29, 2026'
  relativeLabel: string; // 'Today' | 'Yesterday' | 'X days ago'
  entries: CareLogEntry[];
  summary: HandoverSummary;
  stats: {
    total: number;
    intakeOutput: number;
    medications: number;
    symptoms: number;
    questions: number;
  };
}
