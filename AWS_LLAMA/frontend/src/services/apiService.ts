
import { ActionCard } from "../types";

// In Vite, env variables must start with VITE_
const API_URL = (import.meta as any).env.VITE_AWS_API_URL;

interface AIResponse {
  text?: string;
  options?: string[];
  actionCard?: ActionCard;
  error?: string;
}

export const sendMessageToAWS = async (
  sessionId: string,
  text: string,
  startModule?: string
): Promise<AIResponse> => {
  
  if (!API_URL) {
    return {
      text: "CONFIGURATION ERROR: VITE_AWS_API_URL is missing. Please see Deployment Instructions."
    };
  }

  try {
    const payload: any = {
      sessionId,
      text
    };

    // Only send startModule if we are initiating the triage
    if (startModule) {
      payload.startModule = startModule;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AWS API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("API Connection Error:", error);
    return { 
      text: "Connection error. Please try again.",
      options: ["Retry"]
    };
  }
};
