import { Message, ActionCard } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// In Vite, env variables must start with VITE_
const API_URL = (import.meta as any).env.VITE_AWS_API_URL;

interface AIResponse {
  text: string;
  options?: string[];
  actionCard?: ActionCard;
}

export const sendMessageToAWS = async (messages: Message[]): Promise<AIResponse> => {
  if (!API_URL) {
    return {
      text: "CONFIGURATION ERROR: VITE_AWS_API_URL is missing in .env file. Please check the Deployment Instructions.",
      options: ["Retry"]
    };
  }

  try {
    const historyPayload = messages
      .filter(m => !m.isError)
      .map(m => ({
        role: m.role,
        text: m.text
      }));

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

    // Parse Llama 3 Response (Handling potential Markdown wrapping)
    let displayText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    let options: string[] | undefined = undefined;
    let actionCard: ActionCard | undefined = undefined;

    // Extract Options
    const optionsRegex = /\{\s*"options":\s*\[.*?\]\s*\}/s;
    const optionsMatch = rawText.match(optionsRegex);
    if (optionsMatch) {
      try {
        const parsed = JSON.parse(optionsMatch[0]);
        if (parsed.options && Array.isArray(parsed.options)) {
          options = parsed.options;
          displayText = displayText.replace(optionsMatch[0], "").trim();
        }
      } catch (e) { console.warn(e); }
    }

    // Extract ActionCard
    const cardRegex = /\{\s*"actionCard":\s*\{.*\}\s*\}/s;
    const cardMatch = rawText.match(cardRegex);
    if (cardMatch) {
      try {
        const parsed = JSON.parse(cardMatch[0]);
        if (parsed.actionCard) {
          actionCard = parsed.actionCard;
          displayText = displayText.replace(cardMatch[0], "").trim();
        }
      } catch (e) { console.warn(e); }
    }

    return { text: displayText, options, actionCard };

  } catch (error) {
    console.error("Connection Error:", error);
    return { 
      text: "Unable to connect to the AWS Backend. Please check your internet connection.",
      options: ["Retry"]
    };
  }
};