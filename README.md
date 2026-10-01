# CareSlip — The 30-Second Bedside Handover for Doctors

[![Live Demo](https://img.shields.io/badge/Live_Demo-careslip.pages.dev-0284c7?style=flat-square&logo=cloudflare)](https://careslip.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Zero Cloud](https://img.shields.io/badge/Privacy-100%25_Offline-blue?style=flat-square)](#)

> Turn messy 24-hour bedside notes into a clean clinical brief. 100% stored on your device. Zero cloud sync.

🔗 **Live Application:** [https://careslip.pages.dev](https://careslip.pages.dev)

---

## 🌟 Core Brand Identity & Architecture

* **Product Name:** `CareSlip`
* **Primary Tagline (Hero Title):**
  > **The 30-second bedside handover for doctors.**
* **Subtitle (Value Proposition):**
  > *Turn messy 24-hour bedside notes into a clean clinical brief. 100% stored on your device. Zero cloud sync.*
* **Privacy Trust Badge:**
  > `● 100% Offline & Private (Stored Only on This Device)`

1. **100% Client-Side & Zero Cloud Storage**
   - Strictly zero backend or external database. All observations reside in browser `localStorage`.
   - On-Device privacy pill and offline trust badge.
2. **Deterministic Rule Engine (Zero AI / Zero Hallucination)**
   - No external LLM APIs.
   - Deterministic chronological sorting, 24-hour time-window filtering, and category grouping.
   - Automatic regex measurement highlighting (`38.2°C`, `145/90`, `scale 6/10`, `150ml`, `500mg`, `80bpm`, `SpO2 96%`).
3. **Frictionless Mobile-First Bedside UX (<5s Logging)**
   - Minimum 44x44px touch targets.
   - Quick 1-tap preset suggestion chips for instant logging.
   - Time adjustment controls (`Now`, `-15m`, `-30m`, `-1h`, custom time).
   - High contrast Slate / Zinc neutral base with soft Medical Blue accents.

---

## 🚀 Getting Started

### Development
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 📱 Features & Official Copy

- **Navigation & Top Header**:
  - App Title: `CareSlip`
  - Privacy Pill: `On-Device Only`
  - Reset Notes action with confirmation dialog (`Clear all bedside notes?`)
- **Category Chips & Placeholders**:
  - `💧 Intake & Output`: `e.g., drank 150ml water, finished half porridge, urine clear`
  - `💊 Meds & Doses`: `e.g., took morning BP pill, IV fluid started at 10am`
  - `⚠️ Vitals & Symptoms`: `e.g., BP 142/88, temp 37.8°C, dizzy when standing`
  - `❓ Questions for Rounds`: `e.g., ask if dizziness is related to the new medication`
- **Past 24 Hours Log**: Reverse chronological order with category filtering, relative and exact timestamp badges, measurement highlighting, and inline edit/delete.
- **Primary Action Button**: `Generate Doctor's Handover Slip` with `{count} notes ready for rounds`.
- **Generated Doctor's Handover Slip**:
  - Slip Header: `24-HOUR BEDSIDE HANDOVER SLIP`
  - Reporting Period: Last 24 Hours
  - Grouped Sections:
    - `⚠️ Vitals & Acute Observations`
    - `💧 Intake, Nutrition & Output`
    - `💊 Medications & Timelines`
    - `❓ Questions from Caregiver`
  - Action Toolbar: `Full Screen for Doctor`, `Copy Text (WhatsApp)`, `Print / Save PDF`
- **Legal & Safety Footer**:
  > *CareSlip is a personal bedside notepad for caregivers. It does not store medical records on any server and does not provide clinical diagnosis, medical evaluation, or treatment advice.*
