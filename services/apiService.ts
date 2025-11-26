import { Message, ActionCard } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// Retrieve the AWS API Gateway URL from environment variables
const API_URL = process.env.AWS_API_URL || "https://your-api-gateway-url.amazonaws.com/prod/chat";

interface AIResponse {
  text: string;
  options?: string[];
  actionCard?: ActionCard;
}

export const sendMessageToAWS = async (messages: Message[]): Promise<AIResponse> => {
  try {
    // 1. Format history for the backend
    // We filter out error messages and only send role/text to keep payload clean
    const historyPayload = messages
      .filter(m => !m.isError)
      .map(m => ({
        role: m.role,
        text: m.text
      }));

    // 2. Call AWS Lambda via API Gateway
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
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.text || "";

    // 3. Parse JSON Logic 
    // The Lambda returns raw text; we must extract options/actionCards on the client side
    let displayText = rawText;
    let options: string[] | undefined = undefined;
    let actionCard: ActionCard | undefined = undefined;

    // Extract Options: Looks for { "options": [...] }
    const optionsRegex = /\{\s*"options":\s*\[.*?\]\s*\}/s;
    const optionsMatch = rawText.match(optionsRegex);

    if (optionsMatch) {
      try {
        const jsonStr = optionsMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.options && Array.isArray(parsed.options)) {
          options = parsed.options;
          displayText = displayText.replace(jsonStr, "").trim();
        }
      } catch (e) {
        console.warn("JSON Parse Error (Options):", e);
      }
    }

    // Extract ActionCard: Looks for { "actionCard": { ... } }
    const cardRegex = /\{\s*"actionCard":\s*\{.*\}\s*\}/s;
    const cardMatch = rawText.match(cardRegex);

    if (cardMatch) {
      try {
        const jsonStr = cardMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.actionCard) {
          actionCard = parsed.actionCard;
          displayText = displayText.replace(jsonStr, "").trim();
        }
      } catch (e) {
        console.warn("JSON Parse Error (ActionCard):", e);
      }
    }

    // Cleanup Markdown artifacts (Llama 3 sometimes wraps output in ```json ... ```)
    displayText = displayText.replace(/```json/g, "").replace(/```/g, "").trim();

    return { text: displayText, options, actionCard };

  } catch (error) {
    console.error("AWS API Error:", error);
    
    // Fallback message if configuration is missing
    if (API_URL.includes("your-api-gateway")) {
        return {
            text: "CONFIGURATION REQUIRED: The app is trying to connect to AWS, but the API URL is missing. Please set AWS_API_URL in your .env file.",
            options: ["Retry"]
        }
    }

    return { 
      text: "I apologize, but I encountered a connection error with the server. Please wait a moment and try again. If this is a medical emergency, please call 911 immediately.",
      options: ["Retry"]
    };
  }
};