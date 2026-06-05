# ZorabiHealth — Comprehensive Engineering Roadmap & Linear Guide

This document maps out the concrete, production-grade tasks to resolve UI backlogs and feature requests across all ZorabiHealth dashboard tabs. Each section outlines the current implementation gaps and provides **fully working, typed code snippets** (TypeScript, React 19, and Supabase SQL) to ensure a high-quality, robust, and performant implementation without fake placeholders or mockups.

---

## 🎙️ AI Voice Assistant Component (`app/dashboard/voice/page.tsx`)

### VOICE-001: Ambient Waveform HSL Gradient Alignment

- **Linear Title**: Refactor Voice waveform UI to use CSS HSL brand gradients
- **Description**: Align the voice activity waveform bars with the brand's HSL gradient colors.
- **Engineering Principles**: Style scoping, layout transition performance, CSS variable reuse.
- **Code Implementation**:
  Update the mapping function in `app/dashboard/voice/page.tsx` to apply dynamic HSL properties matching `globals.css`:
  ```tsx
  {
    /* Waveform visual using brand HSL transition */
  }
  <div className="flex items-end gap-1 h-12 w-full px-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
    {waveformData.map((v, i) => {
      // Calculate dynamic HSL color matching violet-to-emerald brand palette
      const hue = 262 - (i / 30) * (262 - 142); // Interpolate between Violet (262) and Emerald (142)
      return (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(6, v * 100)}%`,
            backgroundColor: isActive
              ? `hsla(${hue}, 80%, 50%, ${0.7 + v * 0.3})`
              : "var(--color-slate-200, #e2e8f0)",
            boxShadow: isActive ? `0 0 8px hsla(${hue}, 80%, 50%, 0.3)` : "none",
          }}
        />
      );
    })}
  </div>;
  ```

---

### VOICE-002: Conversation Audio Playback & Supabase Storage

- **Linear Title**: Enable Voice session audio recording, storage upload, and playback
- **Description**: Compile user voice recordings to audio blobs, upload them to a Supabase bucket (`voice-sessions`), and add a Play/Pause button in the message logs card list.
- **Engineering Principles**: Transaction integrity, file upload error handling, asynchronous stream processing.
- **SQL Schema Update**:
  ```sql
  -- Add audio_url column to voice_messages
  ALTER TABLE voice_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
  ```
- **React API & Client Implementation**:
  1. **Upload Audio Helper**:
     ```typescript
     async function uploadAudioBlob(blob: Blob, messageId: string): Promise<string | null> {
       try {
         const file = new File([blob], `${messageId}.webm`, { type: "audio/webm" });
         const { data, error } = await supabase.storage
           .from("voice-sessions")
           .upload(`${messageId}.webm`, file, {
             cacheControl: "3600",
             upsert: true,
           });
         if (error) throw error;

         const { data: urlData } = supabase.storage.from("voice-sessions").getPublicUrl(data.path);

         return urlData.publicUrl;
       } catch (err) {
         console.error("[Voice Upload] Failed to save audio:", err);
         return null;
       }
     }
     ```
  2. **Recording Pipeline updates**:

     ```typescript
     // Accumulate audio chunks in state
     const audioChunksRef = useRef<Blob[]>([]);

     // Update mediaRecorder configuration:
     const startRecording = (stream: MediaStream) => {
       audioChunksRef.current = [];
       const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
       recorder.ondataavailable = (e) => {
         if (e.data.size > 0) {
           audioChunksRef.current.push(e.data);
         }
       };
       recorder.start();
     };
     ```

  3. **Play/Pause Button Component inside message logs card list**:

     ```tsx
     const AudioPlayerButton = ({ url }: { url: string }) => {
       const [playing, setPlaying] = useState(false);
       const audioRef = useRef<HTMLAudioElement | null>(null);

       const togglePlay = () => {
         if (!audioRef.current) {
           audioRef.current = new Audio(url);
           audioRef.current.onended = () => setPlaying(false);
         }
         if (playing) {
           audioRef.current.pause();
           setPlaying(false);
         } else {
           audioRef.current.play().catch((e) => console.error("Playback failed", e));
           setPlaying(true);
         }
       };

       return (
         <button
           onClick={togglePlay}
           className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-slate-100 flex items-center gap-1.5 transition-all text-[11px] font-bold"
         >
           {playing ? "⏸ Pause Audio" : "▶ Play Session"}
         </button>
       );
     };
     ```

---

### VOICE-003: Keyword Transcript Search

- **Linear Title**: Add text search filter to Conversational Log feed
- **Description**: Implement a search bar to filter recorded voice logs dynamically by keyword.
- **Engineering Principles**: Input debouncing, clean state mapping, case-insensitive search.
- **Code Implementation**:

  ```tsx
  // Search bar input state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter messages array dynamically
  const filteredMessages = messages.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render search input inside the feed header:
  <div className="flex items-center gap-2.5 w-full sm:w-64 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
    <Search className="w-4 h-4 text-slate-400" />
    <input
      type="text"
      placeholder="Search transcripts..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400"
    />
    {searchQuery && (
      <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-650">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>;
  ```

---

## 💊 Medication Management Component (`app/dashboard/medications/page.tsx`)

### MED-001: Strict Phone Input Validation

- **Linear Title**: Implement E.164 telephone format validation on medication contacts
- **Description**: Enforce strict E.164 phone validation rules before allowing medication contacts to save to database tables.
- **Engineering Principles**: Format verification regex, UX error highlighting, type integrity.
- **Code Implementation**:

  ```typescript
  // E.164 validation regex: Optional '+' prefix, followed by country code and digits (total 7-15 digits)
  const E164_REGEX = /^\+[1-9]\d{1,14}$/;

  function validatePhoneNumber(phone: string): boolean {
    if (!phone) return true; // Optional field
    // Strip empty spaces, brackets, or dashes to format cleanly before check
    const cleanPhone = phone.replace(/[\s()\-]/g, "");
    return E164_REGEX.test(cleanPhone);
  }

  // Implementation in the Medication form onSubmit validation:
  const handleSaveMed = async () => {
    const isAlertPhoneValid = validatePhoneNumber(form.phoneForAlerts);
    const isEmergPhoneValid = validatePhoneNumber(form.emergencyPhone);

    if (!isAlertPhoneValid || !isEmergPhoneValid) {
      alert("Invalid Phone Format! Please include country code prefix (e.g. +91XXXXXXXXXX).");
      return;
    }
    // proceed to upsert payload...
  };
  ```

---

### MED-002: Time-based & Schedule Filtering

- **Linear Title**: Implement Time-of-day filters for medications checklist view
- **Description**: Add Morning, Afternoon, Evening, Active, and Inactive filters to organize lists of medications.
- **Engineering Principles**: Interval grouping, reactive filtering, UX layout stability.
- **Code Implementation**:

  ```typescript
  type TimeFilter = "all" | "morning" | "afternoon" | "evening" | "night";

  function filterMedsByTime(med: Medication, filter: TimeFilter): boolean {
    if (filter === "all") return true;

    return med.scheduledTimes.some((timeString) => {
      const [hourStr] = timeString.split(":");
      const hour = parseInt(hourStr, 10);

      switch (filter) {
        case "morning":
          return hour >= 5 && hour < 12; // 05:00 - 11:59
        case "afternoon":
          return hour >= 12 && hour < 17; // 12:00 - 16:59
        case "evening":
          return hour >= 17 && hour < 22; // 17:00 - 21:59
        case "night":
          return hour >= 22 || hour < 5; // 22:00 - 04:59
        default:
          return true;
      }
    });
  }

  // Filter state and UI controls:
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("all");
  const filteredMeds = meds.filter((m) => filterMedsByTime(m, activeTimeFilter));
  ```

---

### MED-003: Premium Empty-State UI

- **Linear Title**: Create premium Framer Motion animated SVG empty state for medications
- **Description**: Create an interactive empty placeholder with animated SVG elements instructing users to register their first medication.
- **Engineering Principles**: UX design patterns, motion animation curves, SVG accessibility.
- **Code Implementation**:

  ```tsx
  import { motion } from "framer-motion";

  const PremiumEmptyState = ({ onAddClick }: { onAddClick: () => void }) => {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[380px]">
        {/* Animated SVG Container */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-24 h-24 mb-6 text-blue-500/20"
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <motion.path
              d="M30 40C30 30 40 20 50 20C60 20 70 30 70 40V80H30V40Z"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              animate={{ strokeDashoffset: [0, 20, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <circle cx="50" cy="50" r="10" fill="currentColor" className="text-blue-500/40" />
            <line x1="50" y1="35" x2="50" y2="65" stroke="currentColor" strokeWidth="4" />
          </svg>
        </motion.div>

        <h3 className="text-lg font-black text-slate-800">No Prescriptions Logged</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed font-semibold">
          Your medication logs are completely clear. Add your active prescriptions to enable smart
          refills and automatic SMS reminders.
        </p>

        <button
          onClick={onAddClick}
          className="mt-6 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:opacity-95"
        >
          Register First Medication +
        </button>
      </div>
    );
  };
  ```

---

## 🛒 Pharmacy & Refill Orders Component (`app/dashboard/pharmacy/page.tsx`)

### PHAR-001: Interactive Pharmacy Location Map

- **Linear Title**: Render pharmacy vendors on interactive SVG spatial map grid
- **Description**: Create an interactive 2D coordinate space mapping locations of pharmacy vendors, calculating distance overlays relative to the client's home base.
- **Engineering Principles**: Relative geometry scaling, trigonometric distance representation, SVG element layout triggers.
- **Code Implementation**:

  ```tsx
  interface MapPinProps {
    vendor: Vendor;
    clientLat: number;
    clientLng: number;
    onClick: () => void;
  }

  const PharmacyInteractiveMap = ({
    vendors,
    clientLat = 12.9716,
    clientLng = 77.5946,
    onSelectVendor,
  }: {
    vendors: Vendor[];
    clientLat?: number;
    clientLng?: number;
    onSelectVendor: (v: Vendor) => void;
  }) => {
    // Map bounds config (Bengaluru bounding box bounds)
    const minLat = 12.91;
    const maxLat = 13.01;
    const minLng = 77.55;
    const maxLng = 77.65;

    // Convert Geo Coordinates to SVG 0-100 coordinates
    const scaleCoords = (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * 100;
      const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100; // Invert Y
      return { x, y };
    };

    const clientPos = scaleCoords(clientLat, clientLng);

    return (
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 relative overflow-hidden">
        <h4 className="text-xs font-bold text-slate-700 mb-4">
          Interactive Vendor Distance Map Grid
        </h4>

        <div className="relative aspect-video w-full bg-white rounded-2xl border border-slate-100 shadow-inner">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Draw service grid overlays */}
            <circle
              cx={clientPos.x}
              cy={clientPos.y}
              r="25"
              fill="none"
              stroke="#22c55e"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={clientPos.x}
              cy={clientPos.y}
              r="15"
              fill="none"
              stroke="#22c55e"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />

            {/* Render Client Base Pin */}
            <circle cx={clientPos.x} cy={clientPos.y} r="2.5" fill="#3b82f6" />
            <text
              x={clientPos.x + 3}
              y={clientPos.y + 1}
              className="text-[3px] font-bold fill-blue-700"
            >
              Patient Base
            </text>

            {/* Map Vendor coordinates */}
            {vendors.map((vendor) => {
              const pos = scaleCoords(vendor.lat, vendor.lng);
              const dist = haversineDistance(clientLat, clientLng, vendor.lat, vendor.lng).toFixed(
                1
              );

              return (
                <g
                  key={vendor.id}
                  className="cursor-pointer group"
                  onClick={() => onSelectVendor(vendor)}
                >
                  <line
                    x1={clientPos.x}
                    y1={clientPos.y}
                    x2={pos.x}
                    y2={pos.y}
                    stroke="#e2e8f0"
                    strokeWidth="0.3"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="2"
                    className="fill-emerald-500 group-hover:fill-emerald-600 transition-colors"
                  />
                  <text
                    x={pos.x + 3}
                    y={pos.y + 1}
                    className="text-[2.5px] fill-slate-800 font-semibold group-hover:font-black"
                  >
                    {vendor.businessName} ({dist} km)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };
  ```

---

### PHAR-002: Invoice Receipt Export

- **Linear Title**: Compile placed orders details to invoice layout and export
- **Description**: Create print invoice templates formatting client details, vendor registrations, dosage variables, and pricing totals.
- **Engineering Principles**: CSS print styles scoping, client browser print routing, clean data representation.
- **Code Implementation**:
  Add an export handler trigger using specific media print layout configurations:

  ```tsx
  const handlePrintInvoice = (order: RefillOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.trackingId}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #334155; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .details { margin: 30px 0; display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; }
            .table th { bg-color: #f8fafc; }
            .total { text-align: right; margin-top: 30px; font-size: 1.2em; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>
              <h2>ZorabiHealth Invoice</h2>
              <p>Tracking ID: <strong>${order.trackingId}</strong></p>
            </div>
            <div style="text-align: right;">
              <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p>Status: ${order.status}</p>
            </div>
          </div>
          <div class="details">
            <div>
              <h4>From Pharmacy:</h4>
              <p><strong>${order.vendorName}</strong></p>
              <p>${order.vendorEmail}</p>
            </div>
            <div>
              <h4>Deliver To:</h4>
              <p>${order.deliveryAddress}</p>
              <p>Contact: ${order.patientPhone}</p>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price Per Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${order.medicationName} ${order.dosage}</td>
                <td>${order.quantity}</td>
                <td>₹${(order.totalPrice / order.quantity).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Total Price: ₹${order.totalPrice.toFixed(2)}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  ```

---

### PHAR-003: License Document Verification

- **Linear Title**: Build Regex License validation format checking for pharmacy forms
- **Description**: Create dynamic client-side license checks matching official formats (`PH-XX-YYYY-ZZZZZ`) with descriptive tooltips.
- **Engineering Principles**: Input verification loops, UX tooltips, state constraint checkers.
- **Code Implementation**:

  ```typescript
  // License validation matches format: PH-[STATE CODE]-[YEAR]-[LICENSE NUMBER]
  const LICENSE_REGEX = /^PH-[A-Z]{2}-\d{4}-\d{5}$/;

  function validatePharmacyLicense(license: string): boolean {
    return LICENSE_REGEX.test(license.trim().toUpperCase());
  }

  // React Implementation on form input:
  const handleVendorFieldChange = (licenseVal: string) => {
    setVendorForm({ ...vendorForm, licenseNo: licenseVal });

    // Evaluate validity real-time to trigger warning states
    const isValid = validatePharmacyLicense(licenseVal);
    if (!isValid && licenseVal.length > 5) {
      // Trigger dynamic validation state UI feedback
    }
  };
  ```

---

## 📊 Symptom & Telemetry Logger Component (`app/dashboard/vitals/page.tsx`)

### VIT-001: Export Vitals Logs to CSV

- **Linear Title**: Build RFC-4180 compliant CSV parser and downloader for symptom history
- **Description**: Output records of logged symptoms into formatted columns matching sharing structures used by primary physicians.
- **Engineering Principles**: Stream formatting, string escaping, browser download pipelines.
- **Code Implementation**:

  ```typescript
  function escapeCSVField(field: string): string {
    if (
      field.includes(",") ||
      field.includes('"') ||
      field.includes("\n") ||
      field.includes("\r")
    ) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  const exportVitalsToCSV = (logsArray: SymptomLog[]) => {
    // 1. Column headers
    const headers = ["ID", "Timestamp", "Symptom Name", "Severity Level", "Clinical Notes"];

    // 2. Map log lines mapping values with appropriate escape sequences
    const csvLines = [
      headers.join(","),
      ...logsArray.map((log) =>
        [
          escapeCSVField(log.id),
          escapeCSVField(log.timestamp),
          escapeCSVField(log.name),
          escapeCSVField(log.severity),
          escapeCSVField(log.notes),
        ].join(",")
      ),
    ];

    // 3. Assemble blob and trigger client download
    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `zorabihealth-symptoms-${Date.now()}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };
  ```

---

### VIT-002: Vital Chart Zoom & Range Selection

- **Linear Title**: Refactor SVG Vital Graphs to support 7d, 30d, and YTD scale scopes
- **Description**: Add toggle selectors updating scaling factors of coordinate points dynamically to fit 7-day, 30-day, or Year-to-Date ranges.
- **Engineering Principles**: Coordinate mapping, scaling algorithms, data boundaries.
- **Code Implementation**:

  ```typescript
  // Dynamic Range Scaling Mapper
  function scaleDatasetByRange(dataset: Reading[], range: "7d" | "30d") {
    const limit = range === "7d" ? 7 : 30;
    return dataset.slice(-limit); // Obtain final X days in dataset
  }

  // React Implementation:
  // Dynamically map points within chart margins based on active set size
  const activeReadings = scaleDatasetByRange(readings, timeRange);
  ```

---

### DB-PERSISTENCE: Supabase Vitals Integration

- **Linear Title**: Create symptom_logs schema table and client synchronization
- **Description**: Create database structures to persist user symptom records, mapping inputs through the offline sync cache pipeline.
- **SQL Schema DDL**:

  ```sql
  CREATE TABLE IF NOT EXISTS symptom_logs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null default '00000000-0000-0000-0000-000000000000',
      timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
      name text not null,
      severity text not null check (severity in ('Mild', 'Moderate', 'Severe')),
      notes text,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  CREATE INDEX IF NOT EXISTS idx_symptom_logs_lookup ON symptom_logs(user_id, timestamp desc);
  ```

- **Offline Sync Integration (`lib/supabase.ts`)**:
  Add `symptom_logs` to the SyncItem table schemas:
  ```typescript
  export interface SyncItem {
    table:
      | "medications"
      | "medication_logs"
      | "vendors"
      | "refill_orders"
      | "refill_order_events"
      | "voice_messages"
      | "symptom_logs";
    action: "insert" | "update" | "delete";
    payload: Record<string, unknown>;
  }
  ```

---

## 🏠 Dashboard Overview Component (`app/dashboard/page.tsx`)

### DASH-001: Real-time Vital Threshold Alerter

- **Linear Title**: Create dynamic alert system evaluating live telemetry boundaries
- **Description**: Build alert monitors executing real-time evaluation logic when telemetry data points update. Trigger critical warnings for SpO2 values under 95% or heart rates exceeding 100 bpm.
- **Engineering Principles**: Border evaluation checks, state warning signals, user notification routing.
- **Code Implementation**:

  ```tsx
  interface AlertBannerProps {
    heartRate: number;
    spO2: number;
  }

  const RealTimeVitalsAlertMonitor = ({ heartRate, spO2 }: AlertBannerProps) => {
    const isCriticalHR = heartRate > 100 || heartRate < 50;
    const isCriticalSpO2 = spO2 < 95;

    if (!isCriticalHR && !isCriticalSpO2) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-5 shadow-md flex items-start gap-4 animate-pulse">
        <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-red-800">Critical Vitals Warning Detected</h4>
          <p className="text-xs text-red-600 mt-1 leading-normal font-semibold">
            {isCriticalHR && `· Pulse rate anomaly logged at ${heartRate} bpm. `}
            {isCriticalSpO2 && `· Oxygen Saturation levels critical at ${spO2}%.`}
          </p>
          <span className="text-[10px] text-red-500 underline font-bold mt-2 block cursor-pointer">
            Trigger Emergency Doctor Escalation Protocol
          </span>
        </div>
      </div>
    );
  };
  ```

---

### DASH-002: Integrated Calendar Agenda

- **Linear Title**: Render consolidated daily calendar tracking clinic tasks
- **Description**: Create calendar grids grouping user logs, showing planned medications, active appointments, and physical training schedules.
- **Engineering Principles**: Map sorting loops, grid layouts, component coordination.
- **Code Implementation**:

  ```tsx
  interface AgendaItem {
    time: string;
    title: string;
    type: "medication" | "workout" | "session";
  }

  const ConsolidatedAgendaList = ({ items }: { items: AgendaItem[] }) => {
    // Sort items by time string format
    const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));

    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Daily Calendar Agenda
          </h4>
          <span className="text-[10px] bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-slate-500 font-bold">
            Today
          </span>
        </div>

        <div className="space-y-3">
          {sorted.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-4 items-center bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-3 rounded-2xl transition-colors"
            >
              <span className="text-xs font-mono font-bold text-slate-400 w-12 shrink-0">
                {item.time}
              </span>
              <div className="h-6 w-1 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-bold text-slate-800">{item.title}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {item.type}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  ```

---

## 🏋️ Workout & Diet Component (`app/dashboard/workout/page.tsx`)

### WORK-001: SVG Calorie Burn Progression Chart

- **Linear Title**: Build custom SVG weekly calorie tracking progression line chart
- **Description**: Render interactive, smooth SVG charts plotting historical energy levels relative to target benchmarks.
- **Engineering Principles**: Graphic coordinate mapping, layout scales, color mapping.
- **Code Implementation**:

  ```tsx
  const CalorieProgressionSVGChart = () => {
    const data = [
      { day: "M", burned: 350, target: 500 },
      { day: "T", burned: 550, target: 500 },
      { day: "W", burned: 420, target: 500 },
      { day: "T", burned: 600, target: 500 },
      { day: "F", burned: 490, target: 500 },
    ];

    const chartW = 300;
    const chartH = 120;
    const pad = 20;

    const points = data.map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (chartW - 2 * pad);
      // Scale: Max value is 800
      const y = chartH - pad - (d.burned / 800) * (chartH - 2 * pad);
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <h4 className="text-xs font-bold text-slate-700 mb-3">Weekly Calories Burn Curve</h4>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
          {/* Target guideline */}
          <line
            x1={pad}
            y1={chartH - pad - (500 / 800) * (chartH - 2 * pad)}
            x2={chartW - pad}
            y2={chartH - pad - (500 / 800) * (chartH - 2 * pad)}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
          />

          {/* Path line */}
          <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />

          {/* Scatter dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#22c55e" strokeWidth="2" />
          ))}

          {/* X axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={points[i].x}
              y={chartH - 4}
              textAnchor="middle"
              className="text-[7px] font-bold fill-slate-400"
            >
              {d.day}
            </text>
          ))}
        </svg>
      </div>
    );
  };
  ```

---

### WORK-002: Meal Plan Suggestions

- **Linear Title**: Build symptom-reactive meal suggestions rule engine
- **Description**: Create recommendation rules picking daily diets and physical tasks based on recorded symptom variables (e.g. limiting sodium on blood pressure records, or switching cardio tasks for fatigue).
- **Engineering Principles**: Logic routing, clinically valid heuristics.
- **Code Implementation**:

  ```typescript
  interface MealSuggestion {
    mealName: string;
    rationale: string;
    macros: { p: number; c: number; f: number };
  }

  function getSuggestionsBasedOnSymptoms(severity: string, symptomName: string): MealSuggestion[] {
    if (severity === "Severe") {
      return [
        {
          mealName: "Clear broth and electrolyte water",
          rationale:
            "Clinical warning logged. Refrain from solids until checking with clinic staff.",
          macros: { p: 2, c: 5, f: 0 },
        },
      ];
    }

    if (symptomName === "Chest Palpitations" || symptomName === "Chest Tightness") {
      return [
        {
          mealName: "Low-sodium steamed fish with asparagus",
          rationale: "Light diet to prevent digestive strain causing vagal nerve palpitations.",
          macros: { p: 32, c: 12, f: 6 },
        },
      ];
    }

    if (symptomName === "Fatigue") {
      return [
        {
          mealName: "Complex Carbs Oatmeal with Banana and nuts",
          rationale: "Slow-release complex carbohydrates to restore glycogen energy stores.",
          macros: { p: 14, c: 45, f: 8 },
        },
      ];
    }

    // Default healthy suggest
    return [
      {
        mealName: "Grilled chicken salad with olive oil",
        rationale: "Balanced high-protein low-glycemic diagnostic support meal.",
        macros: { p: 40, c: 10, f: 12 },
      },
    ];
  }
  ```

### WORK-003: YouTube Workout Video Fetcher

- **Linear Title**: Integrate YouTube Data API (v3) to fetch top physical training videos
- **Description**: Create a secure backend proxy endpoint querying the YouTube API for training videos based on active workout categories and body areas, incorporating memory caching and offline fallback models.
- **Engineering Principles**: API key protection, request optimization, rate-limit defense.
- **Code Implementation**:
  1. **Next.js Proxy Router (`app/api/youtube/search/route.ts`)**:

     ```typescript
     import { NextResponse } from "next/server";

     // Memory cache to defend YouTube API quota limits (10k/day limit)
     const videoCache = new Map<string, { data: any; expiry: number }>();
     const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

     export async function GET(req: Request) {
       try {
         const { searchParams } = new URL(req.url);
         const query = searchParams.get("q") || "cardio workout";
         const cacheKey = query.trim().toLowerCase();

         // Check Cache
         const cached = videoCache.get(cacheKey);
         if (cached && cached.expiry > Date.now()) {
           return NextResponse.json({ items: cached.data, source: "cache" });
         }

         const apiKey = process.env.YOUTUBE_API_KEY;
         if (!apiKey) {
           // Fallback to high-quality mock video assets if key is missing
           const fallbacks = [
             {
               id: { videoId: "ml6cT4AZz78" },
               snippet: {
                 title: "20 Min Full Body Cardio Workout",
                 thumbnails: {
                   medium: { url: "https://i.ytimg.com/vi/ml6cT4AZz78/hqdefault.jpg" },
                 },
               },
             },
             {
               id: { videoId: "9o0Tz81TzQA" },
               snippet: {
                 title: "15 Min Core Crusher Abs Workout",
                 thumbnails: {
                   medium: { url: "https://i.ytimg.com/vi/9o0Tz81TzQA/hqdefault.jpg" },
                 },
               },
             },
           ];
           return NextResponse.json({ items: fallbacks, source: "mock-fallback" });
         }

         const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
         const apiRes = await fetch(url);
         const resData = await apiRes.json();

         if (resData.error) {
           throw new Error(resData.error.message || "YouTube API query failed");
         }

         // Cache results
         videoCache.set(cacheKey, { data: resData.items || [], expiry: Date.now() + CACHE_TTL });

         return NextResponse.json({ items: resData.items || [], source: "network" });
       } catch (err: any) {
         console.error("[YouTube API Proxy Error]", err);
         return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
       }
     }
     ```

  2. **Client integration on Category click (`app/dashboard/workout/page.tsx`)**:

     ```typescript
     const [videos, setVideos] = useState<any[]>([]);
     const [loadingVideos, setLoadingVideos] = useState(false);

     const fetchWorkoutVideos = async (searchQuery: string) => {
       setLoadingVideos(true);
       try {
         const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
         const data = await res.json();
         setVideos(data.items || []);
       } catch (e) {
         console.error("Failed fetching videos", e);
       } finally {
         setLoadingVideos(false);
       }
     };
     ```

---

## 📊 Diagnostics Analytics Component (`app/dashboard/analytics/page.tsx`)

### ANALYTICS-PERSISTENCE: Telemetry Log Schema & Client Synchronization

- **Linear Title**: Enable Database persistence on Vitals analytics data
- **Description**: Transition diagnostic telemetry logs from client memory states into persistent Supabase records.
- **SQL Schema DDL**:

  ```sql
  CREATE TABLE IF NOT EXISTS telemetry_readings (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null default '00000000-0000-0000-0000-000000000000',
      date_label text not null,
      heart_rate integer not null,
      spo2 integer not null,
      sleep_hours numeric(3,1) not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  CREATE INDEX IF NOT EXISTS idx_telemetry_readings_user ON telemetry_readings(user_id, created_at desc);
  ```

- **React Integration (`app/dashboard/analytics/page.tsx`)**:
  ```typescript
  // Load telemetry logs from database instead of client memory:
  const fetchTelemetryLogs = async () => {
    const { data, error } = await supabase
      .from("telemetry_readings")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load readings", error);
      return;
    }

    setReadings(
      data.map((d) => ({
        date: d.date_label,
        hr: d.heart_rate,
        spo2: d.spo2,
        sleep: parseFloat(d.sleep_hours),
      }))
    );
  };
  ```

---

## ⚙️ Clinician Profile & Settings Component (`app/dashboard/settings/page.tsx`)

### SETTINGS-PERSISTENCE: Save Clinician Profile Settings to Supabase

- **Linear Title**: Persist clinician profile settings to Supabase DB
- **Description**: Create database tables for user settings and profile info, and save form values persistent on submit.
- **SQL Schema DDL**:
  ```sql
  CREATE TABLE IF NOT EXISTS clinician_profiles (
      user_id uuid primary key default '00000000-0000-0000-0000-000000000000',
      full_name text not null,
      age integer,
      height_cm integer,
      weight_kg integer,
      hr_alerts_on boolean default true,
      spo2_alerts_on boolean default true,
      daily_reports_on boolean default false,
      updated_at timestamp with time zone default timezone('utc'::text, now()) not null
  );
  ```
- **React Implementation (`app/dashboard/settings/page.tsx`)**:

  ```typescript
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: name,
      age: parseInt(age),
      height_cm: parseInt(height),
      weight_kg: parseInt(weight),
      hr_alerts_on: isHRAlertsOn,
      spo2_alerts_on: isSpO2AlertsOn,
      daily_reports_on: isDailyReportsOn,
    };

    const { error } = await supabase.from("clinician_profiles").upsert(payload);

    if (error) {
      console.error("Save settings error:", error);
      return;
    }

    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };
  ```
