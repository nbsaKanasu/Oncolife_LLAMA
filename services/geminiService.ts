
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface TranslationResult {
  selectedOption: string;
  confidence: 'HIGH' | 'LOW';
}

/**
 * OPTION 2 ARCHITECTURE:
 * The LLM is NO LONGER deciding the flow. 
 * It is ONLY used to map the User's fuzzy text to one of our Strict JSON Options.
 */
export const interpretUserResponse = async (
  userText: string, 
  questionText: string,
  options: string[]
): Promise<string> => {
  
  if (!ai) {
    console.error("API Key missing");
    return options[0]; // Fallback
  }

  try {
    const prompt = `
    TASK: You are a strict data extraction engine.
    CONTEXT: The user was asked: "${questionText}"
    USER ANSWER: "${userText}"
    ALLOWED OPTIONS: ${JSON.stringify(options)}

    INSTRUCTION:
    1. Map the User Answer to the closest Allowed Option.
    2. If the user says "Yes", "Yeah", "Correct", "Uh huh" -> Map to "Yes".
    3. If the user says "No", "Nope", "Negative" -> Map to "No".
    4. If the user mentions a specific severity (e.g., "It hurts a lot") -> Map to "Severe".
    5. RETURN ONLY the exact string from the Allowed Options list. Do not add markdown or extra text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.0, // Zero creativity, pure logic
        topP: 0.1,
      }
    });

    const result = response.text?.trim() || "";

    // Validation: Ensure the AI returned a valid option
    const match = options.find(opt => opt.toLowerCase() === result.toLowerCase());
    
    if (match) {
      return match;
    } else {
      // If AI failed to map exactly, return the first option (or a safe default) 
      // In a real app, we might ask the user to clarify.
      console.warn(`AI returned "${result}", which is not in options. Defaulting to first option.`);
      return options[0]; 
    }

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return options[0]; // Safe fallback
  }
};
