import { Message, ActionCard } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// The URL comes from Vite environment variables (created in .env)
const API_URL = (import.meta as any).env?.VITE_AWS_API_URL || "YOUR_LAMBDA_FUNCTION_URL_HERE";

interface AIResponse {
  text: string;
  options?: string[];
  actionCard?: ActionCard;
}

export const sendMessageToAWS = async (messages: Message[]): Promise<AIResponse> => {
  try {
    // 1. Prepare Payload
    // Send only essential data to save bandwidth/tokens
    const historyPayload = messages
      .filter(m => !m.isError)
      .map(m => ({
        role: m.role,
        text: m.text
      }));

    // 2. Fetch from AWS Lambda
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: historyPayload,
        systemInstruction: SYSTEM_INSTRUCTION
      })
    });

    if (!response.ok) {
      throw new Error(`AWS API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.text || "";

    // 3. Parse Llama 3 Response
    // Llama might wrap JSON in Markdown code blocks, we need to clean that up.
    let displayText = rawText;
    let options: string[] | undefined = undefined;
    let actionCard: ActionCard | undefined = undefined;

    // Clean Markdown wrappers if present (e.g. ```json ... ```)
    const cleanJsonText = rawText.replace(/```json/g, "").replace(/```/g, "");

    // Extract Options: Look for { "options": [...] }
    const optionsRegex = /\{\s*"options":\s*\[.*?\]\s*\}/s;
    const optionsMatch = cleanJsonText.match(optionsRegex);

    if (optionsMatch) {
      try {
        const jsonStr = optionsMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.options && Array.isArray(parsed.options)) {
          options = parsed.options;
          // Remove the JSON from the display text so the user only sees the natural language
          displayText = displayText.replace(optionsMatch[0], "").trim();
        }
      } catch (e) {
        console.warn("JSON Parse Error (Options):", e);
      }
    }

    // Extract ActionCard: Look for { "actionCard": { ... } }
    const cardRegex = /\{\s*"actionCard":\s*\{.*\}\s*\}/s;
    const cardMatch = cleanJsonText.match(cardRegex);

    if (cardMatch) {
      try {
        const jsonStr = cardMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.actionCard) {
          actionCard = parsed.actionCard;
          // Remove the JSON from the display text
          displayText = displayText.replace(cardMatch[0], "").trim();
        }
      } catch (e) {
        console.warn("JSON Parse Error (ActionCard):", e);
      }
    }

    // Final Cleanup of display text
    displayText = displayText.replace(/```json/g, "").replace(/```/g, "").trim();

    return { text: displayText, options, actionCard };

  } catch (error) {
    console.error("Connection Error:", error);
    return { 
      text: "I am unable to connect to the server. Please check your internet connection or try again later. If this is a medical emergency, call 911.",
      options: ["Retry"]
    };
  }
};