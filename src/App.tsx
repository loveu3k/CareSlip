import { useState, useEffect } from 'react';
import type { CareLogEntry, Category, PatientInfo, DayArchive } from './types';
import { Header } from './components/Header';
import { QuickEntryCard } from './components/QuickEntryCard';
import { Timeline } from './components/Timeline';
import { HandoverModal } from './components/HandoverModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { PatientModal } from './components/PatientModal';
import { FloatingCTA } from './components/FloatingCTA';
import { Toast } from './components/Toast';
import { HistoryModal } from './components/HistoryModal';
import { compileHandoverSummary, compileHandoverSummaryForEntries, getSampleCareLogs } from './utils/summary';
import { groupLogsByDay, getLocalDateKey } from './utils/history';

const STORAGE_KEY_LOGS = 'careslip_logs_v1';
const LEGACY_STORAGE_KEY_LOGS = 'carehandover_logs_v1';
const STORAGE_KEY_PATIENT = 'careslip_patient_v1';
const LEGACY_STORAGE_KEY_PATIENT = 'carehandover_patient_v1';

export default function App() {
  // Initialize state with localStorage data
  const [logs, setLogs] = useState<CareLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS) || localStorage.getItem(LEGACY_STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse logs from localStorage:', e);
    }
    // Return sample data by default so the user sees an immediate impressive experience
    return getSampleCareLogs();
  });

  const [patientInfo, setPatientInfo] = useState<PatientInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PATIENT) || localStorage.getItem(LEGACY_STORAGE_KEY_PATIENT);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse patient info:', e);
    }
    return {
      roomBed: 'Room 402B - Bed 1',
      patientName: 'Margaret T.',
      attendingPhysician: 'Dr. Evans (Internal Med)',
    };
  });

  // Modal UI States
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isPatientOpen, setIsPatientOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHandoverDay, setActiveHandoverDay] = useState<DayArchive | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync logs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs to localStorage:', e);
    }
  }, [logs]);

  // Sync patient info to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PATIENT, JSON.stringify(patientInfo));
    } catch (e) {
      console.error('Failed to save patient info to localStorage:', e);
    }
  }, [patientInfo]);

  // Request browser storage persistence (locks data so OS/browser won't passively purge it)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  // Filter 24-hour logs
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const active24hLogs = logs.filter((l) => l.timestamp >= dayAgo);

  // Compile summary using pure deterministic helper function
  const summary = compileHandoverSummary(logs);

  const handleAddEntry = (category: Category, content: string, timestamp: number) => {
    const newEntry: CareLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      category,
      content,
    };
    setLogs((prev) => [newEntry, ...prev]);
    setToastMessage('Observation logged');
  };

  const handleDeleteEntry = (id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
    setToastMessage('Observation removed');
  };

  const handleEditEntry = (id: string, newContent: string) => {
    setLogs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: newContent } : item))
    );
    setToastMessage('Observation updated');
  };

  const handleSaveDoctorReply = (id: string, reply: string) => {
    const trimmed = reply.trim();
    setLogs((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              doctorReply: trimmed || undefined,
              isAnswered: trimmed.length > 0 ? true : item.isAnswered,
            }
          : item
      )
    );
    if (activeHandoverDay) {
      setActiveHandoverDay((prev) => {
        if (!prev) return null;
        const updated = prev.entries.map((item) =>
          item.id === id
            ? {
                ...item,
                doctorReply: trimmed || undefined,
                isAnswered: trimmed.length > 0 ? true : item.isAnswered,
              }
            : item
        );
        return {
          ...prev,
          entries: updated,
          summary: compileHandoverSummaryForEntries(updated),
        };
      });
    }
    setToastMessage(trimmed ? "Doctor's reply saved" : "Doctor's reply removed");
  };

  const handleToggleQuestionAnswered = (id: string) => {
    setLogs((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAnswered: !item.isAnswered } : item
      )
    );
    if (activeHandoverDay) {
      setActiveHandoverDay((prev) => {
        if (!prev) return null;
        const updated = prev.entries.map((item) =>
          item.id === id ? { ...item, isAnswered: !item.isAnswered } : item
        );
        return {
          ...prev,
          entries: updated,
          summary: compileHandoverSummaryForEntries(updated),
        };
      });
    }
  };

  const handleDeleteDay = (dateKey: string) => {
    setLogs((prev) => prev.filter((item) => getLocalDateKey(item.timestamp) !== dateKey));
    setToastMessage('Deleted notes for selected day');
  };

  const handleClearAll = () => {
    setLogs([]);
    setActiveHandoverDay(null);
    try {
      localStorage.removeItem(STORAGE_KEY_LOGS);
      localStorage.removeItem(LEGACY_STORAGE_KEY_LOGS);
    } catch {}
    setToastMessage('All bedside notes cleared');
  };

  const handleLoadSampleData = () => {
    const samples = getSampleCareLogs();
    setLogs(samples);
    setActiveHandoverDay(null);
    setToastMessage('Loaded 24h sample observations');
  };

  // Keep activeHandoverDay in sync with logs if viewing an archived day
  useEffect(() => {
    if (activeHandoverDay) {
      const dayArchives = groupLogsByDay(logs);
      const matchingDay = dayArchives.find((d) => d.dateKey === activeHandoverDay.dateKey);
      if (matchingDay) {
        setActiveHandoverDay(matchingDay);
      } else {
        setActiveHandoverDay(null);
      }
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Application Header */}
      <Header
        patientInfo={patientInfo}
        onOpenPatientModal={() => setIsPatientOpen(true)}
        onOpenClearModal={() => setIsClearOpen(true)}
        onOpenHistoryModal={() => setIsHistoryOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        hasLogs={logs.length > 0}
        historyDaysCount={groupLogsByDay(logs).length}
      />

      {/* Hero Section */}
      <section className="hidden sm:block bg-gradient-to-b from-sky-50/70 via-slate-100/60 to-transparent border-b border-slate-200/60 pt-5 pb-6 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-2.5">
          {/* Privacy Trust Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Offline &amp; Private (Stored Only on This Device)
            </span>
          </div>

          {/* Primary Tagline (Hero Title) */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            The 30-second bedside handover for doctors.
          </h2>

          {/* Subtitle (Value Proposition) */}
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Turn messy 24-hour bedside notes into a clean clinical brief. 100% stored on your device. Zero cloud sync.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-5 pb-24 sm:pb-32">
        {/* Quick Entry Card (Sticky/Top) */}
        <QuickEntryCard onAddEntry={handleAddEntry} />

        {/* Live Timeline (Past 24 Hours) */}
        <Timeline
          entries={logs}
          onDeleteEntry={handleDeleteEntry}
          onEditEntry={handleEditEntry}
          onLoadSampleData={handleLoadSampleData}
          onSaveDoctorReply={handleSaveDoctorReply}
        />

        {/* Legal & Safety Footer (Non-Clinical Notepad) */}
        <footer className="hidden sm:block pt-6 pb-2 border-t border-slate-200/80 text-center text-xs text-slate-500 leading-relaxed px-2">
          <p>
            <strong>CareSlip is a personal bedside notepad for caregivers.</strong> It does not store medical records on any server and does not provide clinical diagnosis, medical evaluation, or treatment advice.
          </p>
        </footer>
      </main>

      {/* Primary Action Button (Fixed Bottom Floating Bar) */}
      <FloatingCTA
        logCount={active24hLogs.length}
        onOpenSummary={() => {
          setActiveHandoverDay(null);
          setIsHandoverOpen(true);
        }}
      />

      {/* Modals & Dialogs */}
      <HandoverModal
        isOpen={isHandoverOpen}
        onClose={() => {
          setIsHandoverOpen(false);
          if (activeHandoverDay) {
            setIsHistoryOpen(true);
            setActiveHandoverDay(null);
          }
        }}
        summary={activeHandoverDay ? activeHandoverDay.summary : summary}
        entries={activeHandoverDay ? activeHandoverDay.entries : active24hLogs}
        patientInfo={patientInfo}
        onShowToast={(msg) => setToastMessage(msg)}
        onSaveDoctorReply={handleSaveDoctorReply}
        onToggleQuestionAnswered={handleToggleQuestionAnswered}
        customTitle={
          activeHandoverDay
            ? `${activeHandoverDay.relativeLabel} • ${activeHandoverDay.displayDate}`
            : undefined
        }
        customSubtitle={
          activeHandoverDay
            ? `Daily Bedside Observations`
            : undefined
        }
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={logs}
        patientInfo={patientInfo}
        onViewDaySlip={(day) => {
          setActiveHandoverDay(day);
          setIsHistoryOpen(false);
          setIsHandoverOpen(true);
        }}
        onDeleteDay={handleDeleteDay}
        onClearAll={() => {
          setIsHistoryOpen(false);
          setIsClearOpen(true);
        }}
        onShowToast={(msg) => setToastMessage(msg)}
      />

      <ClearConfirmModal
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={handleClearAll}
        itemCount={logs.length}
      />

      <PatientModal
        isOpen={isPatientOpen}
        onClose={() => setIsPatientOpen(false)}
        patientInfo={patientInfo}
        onSave={(updated) => {
          setPatientInfo(updated);
          setToastMessage('Patient details saved');
        }}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} onClear={() => setToastMessage(null)} />
    </div>
  );
}
