
import { ProtocolModule, ActionCard } from './types';

export const APP_NAME = "ONCOLIFE_LLM";
export const TAGLINE = "Compassionate Care, Intelligent Triage.";

export const DISCLAIMER = "IMPORTANT MEDICAL DISCLAIMER: This system is an automated symptom checker powered by AI. It is NOT a substitute for professional medical advice, diagnosis, or treatment. If you believe you are having a medical emergency, call 911 immediately.";

export const SYSTEM_INSTRUCTION = `
SYSTEM PROMPT: ONCOLOGY TRIAGE PROTOCOL (MASTER v2.0)
ROLE: You are a clinical triage chatbot. TONE: Professional, empathetic, precise.

*** CRITICAL RULES ***
1. ONE QUESTION AT A TIME.
2. ALWAYS output JSON options for questions.
3. IF Action Required -> Output "actionCard" JSON and STOP.

FORMAT EXAMPLES:
Question:
"Do you have a fever?"
{ "options": ["Yes", "No"] }

Action:
{
  "actionCard": {
    "title": "EMERGENCY",
    "action": "Call 911",
    "timing": "Immediately",
    "script": "Description...",
    "level": "RED"
  }
}
`;

// --- OPTION 2: THE "JSON RULES DATABASE" ---
// Instead of a text prompt, we define the rules strictly here.

const CALL_911_CARD: ActionCard = {
  title: "CRITICAL EMERGENCY",
  action: "Call 911 Immediately",
  timing: "Immediately",
  script: "I am a cancer patient experiencing a medical emergency.",
  level: "RED"
};

const CONTACT_CARE_TEAM_CARD: ActionCard = {
  title: "URGENT CLINICAL ALERT",
  action: "Contact Care Team Now",
  timing: "Immediately",
  script: "I am experiencing symptoms that require urgent assessment.",
  level: "YELLOW"
};

const STANDARD_CONTACT_CARD: ActionCard = {
  title: "PROVIDER NOTIFICATION",
  action: "Message Care Team",
  timing: "Today / Business Hours",
  script: "I have new symptoms I would like to report.",
  level: "AMBER"
};

// This is the "Brain" of the application now.
export const CLINICAL_PROTOCOLS: Record<string, ProtocolModule> = {
  // --- HEADACHE MODULE (URG-109) ---
  "URG-109": {
    id: "URG-109",
    name: "Headache Assessment",
    questions: [
      {
        id: "HEA_Q1",
        text: "Is this the worst headache you've ever had, or did it start suddenly and very strongly?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: CALL_911_CARD },
          { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "HEA_Q2",
        text: "Do you have any of these symptoms: Blurred vision, trouble speaking, facial drooping, weakness, or confusion?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: CALL_911_CARD },
          { condition: "No", actionType: "NEXT_QUESTION" } // In a full app, this might go to generic pain
        ]
      },
      {
        id: "HEA_Q3",
        text: "Rate your headache severity.",
        options: ["Mild", "Moderate", "Severe"],
        logic: [
          { condition: "Severe", actionType: "SHOW_CARD", cardData: CONTACT_CARE_TEAM_CARD },
          { condition: "Moderate", actionType: "SHOW_CARD", cardData: STANDARD_CONTACT_CARD },
          { condition: "Mild", actionType: "SHOW_CARD", cardData: { ...STANDARD_CONTACT_CARD, level: "GREEN", title: "MONITOR SYMPTOMS", action: "Monitor at home", timing: "As needed" } }
        ]
      }
    ]
  },

  // --- BLEEDING MODULE (URG-103) ---
  "URG-103": {
    id: "URG-103",
    name: "Bleeding Assessment",
    questions: [
      {
        id: "BLE_Q1",
        text: "Are you bleeding and the bleeding won't stop with pressure?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: CALL_911_CARD },
          { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "BLE_Q2",
        text: "Do you have a significant amount of blood in your stool or urine?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: { ...CALL_911_CARD, action: "Go to ER immediately" } },
          { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "BLE_Q3",
        text: "Are you on blood thinners?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "NEXT_QUESTION" }, // Just collecting info, proceed
          { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "BLE_Q4",
        text: "Is the bruising in one area or all over?",
        options: ["One area", "All over", "No bruising"],
        logic: [
          { condition: "All over", actionType: "SHOW_CARD", cardData: CONTACT_CARE_TEAM_CARD },
          { condition: "One area", actionType: "SHOW_CARD", cardData: STANDARD_CONTACT_CARD },
          { condition: "No bruising", actionType: "SHOW_CARD", cardData: STANDARD_CONTACT_CARD }
        ]
      }
    ]
  },

  // --- LEG PAIN (URG-111) ---
  "URG-111": {
    id: "URG-111",
    name: "Leg Pain Assessment",
    questions: [
      {
        id: "LEG_Q1",
        text: "Is your leg swollen, red, or warm to the touch?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: { ...CALL_911_CARD, title: "POSSIBLE BLOOD CLOT", action: "Go to ER / Call Care Team" } },
          { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "LEG_Q2",
        text: "Is the pain worse when you walk or press on your calf?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: { ...CALL_911_CARD, title: "POSSIBLE BLOOD CLOT", action: "Go to ER / Call Care Team" } },
          { condition: "No", actionType: "SHOW_CARD", cardData: STANDARD_CONTACT_CARD }
        ]
      }
    ]
  },
  
  // --- PORT PAIN (URG-114) ---
  "URG-114": {
    id: "URG-114",
    name: "Port Site Assessment",
    questions: [
      {
        id: "POR_Q1",
        text: "Is the area around your port red, swollen, or is there drainage?",
        options: ["Yes", "No"],
        logic: [
           { condition: "Yes", actionType: "SHOW_CARD", cardData: CONTACT_CARE_TEAM_CARD },
           { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "POR_Q2",
        text: "Do you have chills or a temperature > 100.3F?",
        options: ["Yes", "No"],
        logic: [
           { condition: "Yes", actionType: "SHOW_CARD", cardData: CONTACT_CARE_TEAM_CARD },
           { condition: "No", actionType: "SHOW_CARD", cardData: { ...STANDARD_CONTACT_CARD, level: "GREEN" } }
        ]
      }
    ]
  },

  // --- GENERIC FALLBACK FOR OTHER CODES ---
  "GENERIC": {
    id: "GENERIC",
    name: "General Assessment",
    questions: [
      {
        id: "GEN_Q1",
        text: "Does this symptom interfere with your daily activities (eating, sleeping, walking)?",
        options: ["Yes", "No"],
        logic: [
          { condition: "Yes", actionType: "SHOW_CARD", cardData: CONTACT_CARE_TEAM_CARD },
          { condition: "No", actionType: "NEXT_QUESTION" }
        ]
      },
      {
        id: "GEN_Q2",
        text: "Rate the severity of your symptom.",
        options: ["Mild", "Moderate", "Severe"],
        logic: [
          { condition: "Severe", actionType: "SHOW_CARD", cardData: CONTACT_CARE_TEAM_CARD },
          { condition: "Moderate", actionType: "SHOW_CARD", cardData: STANDARD_CONTACT_CARD },
          { condition: "Mild", actionType: "SHOW_CARD", cardData: { ...STANDARD_CONTACT_CARD, level: "GREEN", action: "Monitor at home" } }
        ]
      }
    ]
  }
};
