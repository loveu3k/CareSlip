import JSZip from 'jszip';
import type { CareLogEntry, PatientInfo, DayArchive } from '../types';
import { groupLogsByDay, getLocalDateKey, groupEntriesByDay } from './history';
import { generateMarkdownExport, formatLogTime } from './summary';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate a standalone, beautifully styled, offline-capable HTML handover slip
 */
export function generateStandaloneHtmlSlip(
  day: DayArchive,
  patientInfo: PatientInfo
): string {
  const patientName = escapeHtml(patientInfo.patientName || 'Margaret T.');
  const roomBed = escapeHtml(patientInfo.roomBed || 'Room & Bed');
  const doctor = patientInfo.attendingPhysician ? `Attending: ${escapeHtml(patientInfo.attendingPhysician)}` : '';

  const renderSection = (title: string, icon: string, entries: CareLogEntry[], emptyText = 'None reported') => {
    let rowsHtml = `<li style="color: #64748b; font-style: italic; padding: 6px 0;">${emptyText}</li>`;
    if (entries.length > 0) {
      const groups = groupEntriesByDay(entries);
      if (groups.length <= 1) {
        rowsHtml = entries
          .map((entry) => {
            const { exactTime } = formatLogTime(entry.timestamp);
            const safeContent = escapeHtml(entry.content);
            const replyHtml = entry.doctorReply
              ? `<div style="margin-top: 6px; padding: 6px 10px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 6px; font-size: 13px; color: #065f46;"><strong>🩺 Doctor's Reply:</strong> ${escapeHtml(entry.doctorReply)}</div>`
              : '';
            return `
              <li style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span style="font-family: monospace; font-weight: 700; background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 12px; border: 1px solid #cbd5e1; shrink: 0;">${exactTime}</span>
                  <span style="color: #0f172a; line-height: 1.4;">${safeContent}</span>
                </div>
                ${replyHtml}
              </li>
            `;
          })
          .join('');
      } else {
        rowsHtml = groups
          .map((g) => {
            const dayHeader = `
              <li style="padding: 6px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; font-size: 12px; color: #1e293b; margin: 10px 0 6px 0; display: flex; align-items: center; gap: 6px;">
                <span>📅</span>
                <span>${g.displayDate}</span>
                ${g.relativeLabel ? `<span style="font-weight: 500; color: #64748b;">(${g.relativeLabel})</span>` : ''}
              </li>
            `;
            const itemsHtml = g.items
              .map((entry) => {
                const { exactTime } = formatLogTime(entry.timestamp);
                const safeContent = escapeHtml(entry.content);
                const replyHtml = entry.doctorReply
                  ? `<div style="margin-top: 6px; padding: 6px 10px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 6px; font-size: 13px; color: #065f46;"><strong>🩺 Doctor's Reply:</strong> ${escapeHtml(entry.doctorReply)}</div>`
                  : '';
                return `
                  <li style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                      <span style="font-family: monospace; font-weight: 700; background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-size: 12px; border: 1px solid #cbd5e1; shrink: 0;">${exactTime}</span>
                      <span style="color: #0f172a; line-height: 1.4;">${safeContent}</span>
                    </div>
                    ${replyHtml}
                  </li>
                `;
              })
              .join('');
            return dayHeader + itemsHtml;
          })
          .join('');
      }
    }

    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
          <span>${icon}</span> ${title}
        </h3>
        <ul style="list-style: none; margin: 0; padding: 0;">
          ${rowsHtml}
        </ul>
      </div>
    `;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareSlip Handover — ${patientName} (${day.displayDate})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px 16px;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      padding: 24px;
    }
    .body {
      padding: 24px;
      background: #f8fafc;
    }
    .footer {
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      padding: 16px 24px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .container { border: none; box-shadow: none; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: #bae6fd; margin-bottom: 4px;">
        CareSlip • Bedside Handover Report
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">
        ${day.displayDate} (${day.relativeLabel})
      </h1>
      <div style="font-size: 14px; color: #f0f9ff; display: flex; flex-wrap: wrap; gap: 12px;">
        <span><strong>Patient:</strong> ${patientName}</span>
        <span><strong>Room/Bed:</strong> ${roomBed}</span>
        ${doctor ? `<span>${doctor}</span>` : ''}
        <span><strong>Window:</strong> ${day.summary.timeRangeText}</span>
      </div>
    </div>

    <div class="body">
      ${renderSection('Vitals & Symptoms', '⚠️', day.summary.vitalsAndSymptoms)}
      ${renderSection('Intake, Nutrition & Output', '💧', day.summary.intakeAndOutput)}
      ${renderSection('Medications & Doses Given', '💊', day.summary.medications)}
      ${renderSection('Questions for Doctor / Attending Team', '❓', day.summary.questionsForDoctor)}
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>CareSlip</strong> is an offline bedside notepad for caregivers. Stored locally on-device. Zero cloud sync.</p>
      <div class="no-print" style="margin-top: 12px;">
        <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">
          🖨️ Print / Save as PDF
        </button>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Export all history logs into a single downloadable ZIP archive
 */
export async function exportAllHistoryAsZip(
  logs: CareLogEntry[],
  patientInfo: PatientInfo
): Promise<void> {
  const zip = new JSZip();
  const dayArchives = groupLogsByDay(logs);
  const now = new Date();
  const exportDateStr = getLocalDateKey(now.getTime());

  // 1. Overall README
  const totalNotes = logs.length;
  const readmeContent = `CareSlip — Bedside Handover Export
======================================
Export Date: ${now.toLocaleString()}
Patient: ${patientInfo.patientName || 'Margaret T.'}
Room/Bed: ${patientInfo.roomBed || 'Room 402B - Bed 1'}
Attending: ${patientInfo.attendingPhysician || 'N/A'}
Total Days: ${dayArchives.length}
Total Observations: ${totalNotes}

Folder Structure:
- html/       : Beautiful standalone offline reports (printable in browser)
- txt/        : Plain text summaries (easy to copy to WhatsApp/SMS/Email)
- backup.json : Complete raw data backup (for future import/restore)

Privacy Guarantee:
All records were created and exported entirely on your local device.
Zero cloud servers were involved.
`;
  zip.file('README.txt', readmeContent);

  // 2. Full JSON Backup
  const jsonBackup = {
    version: '1.0',
    exportTimestamp: now.getTime(),
    exportDate: now.toISOString(),
    patientInfo,
    logs,
  };
  zip.file('CareSlip_Data_Backup.json', JSON.stringify(jsonBackup, null, 2));

  // 3. Subfolders for HTML and TXT for each day
  const htmlFolder = zip.folder('daily_html_reports');
  const txtFolder = zip.folder('daily_text_summaries');

  dayArchives.forEach((day, index) => {
    const dayNumber = dayArchives.length - index; // Day 1, Day 2, etc.
    const filePrefix = `Day${dayNumber}_${day.dateKey}`;

    // HTML report
    const htmlContent = generateStandaloneHtmlSlip(day, patientInfo);
    htmlFolder?.file(`${filePrefix}_handover_slip.html`, htmlContent);

    // TXT report
    const txtContent = generateMarkdownExport(day.summary, patientInfo);
    txtFolder?.file(`${filePrefix}_summary.txt`, txtContent);
  });

  // Generate ZIP file blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `CareSlip_Archive_${exportDateStr}.zip`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Print a specific day's handover slip directly
 */
export function printDayHandover(day: DayArchive, patientInfo: PatientInfo): void {
  const htmlContent = generateStandaloneHtmlSlip(day, patientInfo);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
