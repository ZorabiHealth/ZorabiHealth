import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are the core Voice Processing & Medical AI engine for ZorabiHealth.
Your task is to analyze user transcripts (which may contain accents, typos, colloquialisms, or broken English), classify the user's intent, extract key parameters, and generate a clear, helpful response.

Your output MUST be a single raw JSON object (do not include markdown fences, backticks, or extra text).
Format:
{
  "intent": "log_medication" | "log_symptom" | "query_vitals" | "set_reminder" | "refill_request" | "start_workout" | "log_meal" | "check_streak" | "suggest_workout" | "greeting" | "help" | "general_medical" | "symptom_followup" | "medication_followup",
  "extractedData": {
    "medicationName": "extracted medication name (e.g. Dolo, Amlodipine, Metformin) or null",
    "symptomName": "standardized symptom name (e.g. Headache, Palpitations, Dizziness, Fatigue, Chest Tightness, Nausea, Fever) or null",
    "severity": "Mild" | "Moderate" | "Severe" | null,
    "time": "HH:MM" (24-hour time format, e.g. "08:00", "21:30") or null,
    "label": "reminder label text or null",
    "repeatDays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] or null
  },
  "response": "The natural vocal response to speak back to the user."
}

Rules for Intents:
1. log_medication: User took a pill. Match medicationName to active medications. You MUST map phonetic typos immediately:
   - If user says "metforin", "metfomin", "sugar tablet", "sugar pill", "diabetis pill", set medicationName to "Metformin" and intent to "log_medication".
   - If user says "lisinpril", "lisinopril", "bp pill", "blood pressure pill", set medicationName to "Lisinopril" and intent to "log_medication".
   - If user says "atorstatin", "atorvastatin", "cholesterol pill", "lipitor", set medicationName to "Atorvastatin" and intent to "log_medication".
   - If user says "dolo", "dollo", "dolow", "paracetamol", "parcetamol", "fever pill", set medicationName to "Dolo" and intent to "log_medication".
   - If resolved, set intent to "log_medication" and DO NOT trigger "medication_followup".
2. log_symptom: User reports a physical symptom AND specifies its severity (either directly, or colloquially). You MUST map colloquial severity indicators immediately:
   - If user mentions "killing me", "unbearable", "extremely bad", "terrible", "worst ever", "can't stand it", "pain is huge", "screaming pain", "hurts a lot", "hurting really bad", "dying", set severity to "Severe" and intent to "log_symptom".
   - If user mentions "so so", "okay", "a bit bad", "bothering me", "not too bad", "decently bad", "tolerable", set severity to "Moderate" and intent to "log_symptom".
   - If user mentions "very minor", "tiny bit", "just a little", "mildly", "slightly", "barely there", set severity to "Mild" and intent to "log_symptom".
3. symptom_followup: User reports a symptom but fails to specify its severity (neither mild/moderate/severe nor any of the colloquial terms listed above). Ask for clarification. Do NOT set intent to log_symptom.
4. medication_followup: User took their medicine but didn't specify which one, and there are multiple active medications in context. Ask for clarification.
5. query_vitals: User asks about steps, sleep, or vitals.
6. set_reminder: User wants an alarm/reminder. Extract time, label, repeatDays.
7. refill_request: User is running out of pills.
8. start_workout / log_meal / check_streak / suggest_workout: Workout & diet intents.
9. greeting / help: Simple hellos or assistance.
10. general_medical: General medicine questions, side effects, explanation of drugs.

Conversational Context Resolution:
- Trace the Recent Conversation History to resolve short input answers.
- If the last AI message was a symptom_followup asking for severity and the user provides a severity (e.g., "it is severe", "killing me", "just mild"), extract the symptomName from the previous history message ("Headache"), set intent to "log_symptom", set the mapped severity, and output JSON.
- If the last AI message was a medication_followup asking which pill they took and the user responds with a medicine name (e.g. "metformin", "the sugar pill"), set intent to "log_medication", set medicationName to the canonical name, and output JSON.

General Medical Guidelines:
- Provide clear, empathetic explanations of common medicines. Mention common uses and safety tips. Always end with: "Please remember this is for information; consult your doctor for medical advice."`;

const INTENTS: Record<string, RegExp> = {
  log_medication: /\b(took|taken|had my|just took|i took|i have taken)\b/i,
  log_symptom: /\b(feeling|pain|dizzy|headache|chest|nausea|tired|fatigue|fever)\b/i,
  query_vitals: /\b(heart rate|blood pressure|spo2|oxygen|last reading|my vitals|what is my)\b/i,
  set_reminder: /\b(remind me|set alarm|alert me|remind|schedule|set a reminder)\b/i,
  refill_request: /\b(running low|need refill|order more|almost out|low on)\b/i,
  start_workout:
    /\b(start workout|begin session|start session|workout now|let's exercise|i want to work out)\b/i,
  log_meal: /\b(log meal|ate|had meal|logged food|i ate|just ate|had food)\b/i,
  check_streak: /\b(my streak|streak count|how many days|consecutive|streak days)\b/i,
  suggest_workout: /\b(suggest workout|what should i do|recommend|recommendation|workout idea)\b/i,
  greeting: /^(hi|hello|hey|good morning|good evening|good afternoon)[\s!.]*$/i,
  help: /\b(help|what can you do|commands|options)\b/i,
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractReminderTime(text: string): string | null {
  const hhmm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  }

  const amPm = text.match(/\b(1[0-2]|0?[1-9])(?:\s*)(am|pm)\b/i);
  if (!amPm) return null;

  let hours = Number(amPm[1]);
  const period = amPm[2].toLowerCase();
  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:00`;
}

function extractReminderLabel(text: string): string {
  const match =
    text.match(/(?:remind me to|set (?:a )?reminder to|reminder to|alert me to)\s+(.+)/i) ||
    text.match(/(?:remind me|set (?:a )?reminder|set alarm|alert me)\s+(.+)/i);
  if (!match?.[1]) return "Reminder";
  return (
    match[1]
      .replace(/[.?!]+$/g, "")
      .trim()
      .slice(0, 80) || "Reminder"
  );
}

function parseRepeatDays(text: string): string[] {
  const lower = text.toLowerCase();
  if (/\b(every day|daily|each day)\b/.test(lower))
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (/\b(weekdays|weekday)\b/.test(lower)) return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  if (/\b(weekends|weekend)\b/.test(lower)) return ["Sat", "Sun"];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.filter((day) => new RegExp(`\\b${day.toLowerCase()}(?:day)?\\b`, "i").test(text));
}

interface LocalVoiceResponse {
  intent: string;
  extractedData: {
    medicationName: string | null;
    symptomName: string | null;
    severity: "Mild" | "Moderate" | "Severe" | null;
    time: string | null;
    label: string | null;
    repeatDays: string[] | null;
  };
  response: string;
}

function localParseVoiceInput(
  text: string,
  activeMeds: { name: string; generic_name?: string | null; dosage: string }[],
  history: { sender: string; text: string; intent?: string }[]
): LocalVoiceResponse {
  const lastMsg = history[history.length - 1];
  const isSymptomFollowupRep =
    lastMsg &&
    (lastMsg.intent === "symptom_followup" ||
      /\b(mild|moderate|severe|how bad|severity)\b/i.test(lastMsg.text));

  const hasSeverityWord =
    /\b(severe|bad|high|intense|killing me|unbearable|mild|light|low|moderate|medium|mid|so so|okay|little)\b/i.test(
      text
    );

  let intent = "general";
  if (isSymptomFollowupRep && hasSeverityWord) {
    intent = "log_symptom";
  } else if (
    lastMsg &&
    (lastMsg.intent === "medication_followup" ||
      /\b(which medication|which pill|which medicine)\b/i.test(lastMsg.text))
  ) {
    intent = "log_medication";
  } else {
    for (const [key, pattern] of Object.entries(INTENTS)) {
      if (pattern.test(text)) {
        if (key === "log_symptom" && !hasSeverityWord) {
          intent = "symptom_followup";
        } else if (key === "log_medication") {
          const mentionsSpecificMed = activeMeds.some((med) => {
            const nameReg = new RegExp(`\\b${escapeRegExp(med.name)}\\b`, "i");
            const genReg = med.generic_name
              ? new RegExp(`\\b${escapeRegExp(med.generic_name)}\\b`, "i")
              : null;
            return nameReg.test(text) || (genReg ? genReg.test(text) : false);
          });

          if (!mentionsSpecificMed && activeMeds.length > 1) {
            intent = "medication_followup";
          } else {
            intent = key;
          }
        } else {
          intent = key;
        }
        break;
      }
    }
  }

  // Extract Data
  let medicationName: string | null = null;
  if (intent === "log_medication") {
    const matched = activeMeds.find((med) => {
      const nameMatch = new RegExp(`\\b${escapeRegExp(med.name)}\\b`, "i").test(text);
      const genericMatch = med.generic_name
        ? new RegExp(`\\b${escapeRegExp(med.generic_name)}\\b`, "i").test(text)
        : false;
      return nameMatch || genericMatch;
    });
    if (matched) {
      medicationName = matched.name;
    } else if (activeMeds.length === 1) {
      medicationName = activeMeds[0].name;
    }
  }

  let symptomName: string | null = null;
  if (intent === "log_symptom" || intent === "symptom_followup") {
    const symptoms = [
      "Palpitations",
      "Chest Tightness",
      "Fatigue",
      "Shortness of Breath",
      "Dizziness",
      "Headache",
      "Fever",
    ];
    for (const s of symptoms) {
      if (new RegExp(`\\b${s}\\b`, "i").test(text)) {
        symptomName = s;
        break;
      }
    }
    if (!symptomName) {
      for (let i = history.length - 1; i >= 0; i--) {
        const msgText = history[i].text;
        for (const s of symptoms) {
          if (new RegExp(`\\b${s}\\b`, "i").test(msgText)) {
            symptomName = s;
            break;
          }
        }
        if (symptomName) break;
      }
    }
  }

  let severity: "Mild" | "Moderate" | "Severe" | null = null;
  if (intent === "log_symptom") {
    if (/\b(severe|bad|high|intense|killing me|unbearable|terrible|worst|dying)\b/i.test(text)) {
      severity = "Severe";
    } else if (/\b(mild|light|low|minor|tiny|little|barely)\b/i.test(text)) {
      severity = "Mild";
    } else {
      severity = "Moderate";
    }
  }

  const time = intent === "set_reminder" ? extractReminderTime(text) : null;
  const label = intent === "set_reminder" ? extractReminderLabel(text) : null;
  const repeatDays = intent === "set_reminder" ? parseRepeatDays(text) : null;

  // Generate response
  let response = "";
  switch (intent) {
    case "greeting":
      response =
        "Hi — I can help log meds, symptoms, reminders, or check recent vitals. What would you like to do?";
      break;
    case "log_medication":
      response = medicationName
        ? `I have logged your medication ${medicationName}.`
        : "Got it — I can log that medication for you. If you tell me the medicine name, I’ll save the right one.";
      break;
    case "log_symptom":
      response = symptomName
        ? `I've logged your ${symptomName} as ${severity || "Moderate"}.`
        : "I’ve noted the symptom. If you want, I can save it in the Symptom Tracker with a severity level too.";
      break;
    case "symptom_followup":
      response =
        "I'm sorry to hear that. Could you please tell me if your symptom is mild, moderate, or severe so I can log it for you?";
      break;
    case "medication_followup":
      response = "Which medication did you take? Let me know so I can log the correct one.";
      break;
    case "query_vitals":
      response =
        "I can pull your latest vitals or recent health logs. Ask me to check your current summary.";
      break;
    case "set_reminder":
      response = `I can set that reminder${time ? ` for ${time}` : ""}.`;
      break;
    case "refill_request":
      response =
        "I can help flag a refill. If you mention the medicine name, I’ll check whether it’s running low.";
      break;
    case "start_workout":
      response = "Ready when you are — open the Workout dashboard and start a session.";
      break;
    case "log_meal":
      response =
        "I can log that meal for you. If you want more detail, just tell me the meal type too.";
      break;
    case "check_streak":
      response = "I can check your streak progress whenever you want.";
      break;
    case "suggest_workout":
      response =
        "A light walk, mobility work, or short strength session would be a good conservative choice today.";
      break;
    case "help":
      response =
        "I can help with symptoms, medications, reminders, vitals, meals, and workouts. Just tell me what you want to do.";
      break;
    default:
      response = `I heard: "${text}". I can help log it, but if you want me to store something specific, say the medicine name, symptom, or reminder time.`;
  }

  return {
    intent,
    extractedData: {
      medicationName,
      symptomName,
      severity,
      time,
      label,
      repeatDays,
    },
    response,
  };
}

function tryParseJson(text: string) {
  try {
    const cleaned = text
      .replace(/```[a-z]*\s*/gi, "")
      .replace(/\s*```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body?.message || "";
    const activeMedications = body?.activeMedications || [];
    const history = body?.history || [];

    const historyStr = history
      .map(
        (h: { sender: string; text: string }) => `${h.sender === "user" ? "User" : "AI"}: ${h.text}`
      )
      .join("\n");

    const contextStr = `Active Medications: ${JSON.stringify(activeMedications)}\n\nRecent Conversation History:\n${historyStr || "None"}`;
    const userPrompt = `User Input: "${message}"\n\nContext:\n${contextStr}`;

    let resultText = "";
    try {
      const result = await callGemini(`${SYSTEM_PROMPT}\n\n${userPrompt}`, {
        model: "gemini-2.5-flash",
        maxTokens: 500,
      });

      if (result.error || !result.text) {
        console.warn(
          "[Voice API Route]: LLM connection failed. Falling back to local parser.",
          result.error
        );
        const localParsed = localParseVoiceInput(message, activeMedications, history);
        return NextResponse.json(localParsed);
      }
      resultText = result.text;
    } catch (err) {
      console.warn(
        "[Voice API Route]: LLM call threw an error. Falling back to local parser.",
        err
      );
      const localParsed = localParseVoiceInput(message, activeMedications, history);
      return NextResponse.json(localParsed);
    }

    const parsed = tryParseJson(resultText);
    if (parsed && parsed.intent) {
      return NextResponse.json(parsed);
    }

    const localParsed = localParseVoiceInput(message, activeMedications, history);
    return NextResponse.json(localParsed);
  } catch (err: unknown) {
    return NextResponse.json({
      intent: "general_medical",
      extractedData: null,
      response: "An unexpected error occurred. Please try again.",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
