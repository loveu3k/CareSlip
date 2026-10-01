import React, { useState, useEffect } from 'react';
import { X, User, Bed, Stethoscope, Save } from 'lucide-react';
import type { PatientInfo } from '../types';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientInfo: PatientInfo;
  onSave: (info: PatientInfo) => void;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  patientInfo,
  onSave,
}) => {
  const [roomBed, setRoomBed] = useState(patientInfo.roomBed);
  const [patientName, setPatientName] = useState(patientInfo.patientName);
  const [attendingPhysician, setAttendingPhysician] = useState(patientInfo.attendingPhysician || '');

  // Sync form state with latest props whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setRoomBed(patientInfo.roomBed);
      setPatientName(patientInfo.patientName);
      setAttendingPhysician(patientInfo.attendingPhysician || '');
    }
  }, [isOpen, patientInfo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      roomBed: roomBed.trim(),
      patientName: patientName.trim(),
      attendingPhysician: attendingPhysician.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 pb-8 sm:pb-6 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Patient &amp; Room Details</h3>
              <p className="text-xs text-slate-500">Displayed on physician handover summary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-3.5">
          <div className="overflow-y-auto space-y-3.5 pr-1 -mr-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Bed className="w-3.5 h-3.5 text-slate-400" />
                Room &amp; Bed Number
              </label>
              <input
                type="text"
                value={roomBed}
                onChange={(e) => setRoomBed(e.target.value)}
                placeholder="e.g. Room 402B - Bed 1"
                className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Patient Name / Initials
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. John D. or Grandpa"
                className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                Attending Physician / Care Team (Optional)
              </label>
              <input
                type="text"
                value={attendingPhysician}
                onChange={(e) => setAttendingPhysician(e.target.value)}
                placeholder="e.g. Dr. Roberts (Cardiology)"
                className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
              🔒 100% stored on this device. Zero cloud sync.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
