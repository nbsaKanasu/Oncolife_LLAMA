
import { GoogleGenAI, Chat, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ActionCard } from "../types";

export const createChatSession = (): Chat => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const chat: Chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.0, // Strict adherence to protocol
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    },
  });

  return chat;
};

interface GeminiResponse {
  text: string;
  options?: string[];
  actionCard?: ActionCard;
}

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<GeminiResponse> => {
  try {
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    const rawText = result.text || "";

    let displayText = rawText;
    let options: string[] | undefined = undefined;
    let actionCard: ActionCard | undefined = undefined;

    // --- ROBUST REGEX PARSING ---

    // 1. Extract Options: Looks for { "options": [...] } ignoring whitespace
    // The regex finds the JSON object containing "options" key
    const optionsRegex = /\{\s*"options":\s*\[.*?\]\s*\}/s;
    const optionsMatch = rawText.match(optionsRegex);

    if (optionsMatch) {
      try {
        const jsonStr = optionsMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.options && Array.isArray(parsed.options)) {
          options = parsed.options;
          // Remove the JSON string from the visible text
          displayText = displayText.replace(jsonStr, "").trim();
        }
      } catch (e) {
        console.warn("JSON Parse Error (Options):", e);
      }
    }

    // 2. Extract ActionCard: Looks for { "actionCard": { ... } }
    // This regex captures the actionCard object structure
    const cardRegex = /\{\s*"actionCard":\s*\{.*\}\s*\}/s;
    const cardMatch = rawText.match(cardRegex);

    if (cardMatch) {
      try {
        const jsonStr = cardMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.actionCard) {
          actionCard = parsed.actionCard;
          // Remove the JSON string from the visible text
          displayText = displayText.replace(jsonStr, "").trim();
        }
      } catch (e) {
        console.warn("JSON Parse Error (ActionCard):", e);
      }
    }

    // Cleanup: Remove any residual Markdown code blocks if LLM ignored instructions
    displayText = displayText.replace(/```json/g, "").replace(/```/g, "").trim();

    return { text: displayText, options, actionCard };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "I apologize, but I encountered a connection error (or rate limit). Please wait a moment and try again. If this is a medical emergency, please call 911 immediately." 
    };
  }
};
